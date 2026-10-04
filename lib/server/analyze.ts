import type { AnalyzeRequest, AnalysisSuccessResponse, ModelAnalysis, Receipt } from "../schema";
import { ModelAnalysisSchema } from "../schema";
import { buildSystemInstruction, buildUserPrompt } from "./prompt";
import { callGemini } from "./gemini";
import { containsDirectiveLanguage } from "./guard";
import { groundFindings } from "./grounding";
import { logger } from "./logger";

export class BadAIOutputError extends Error {
  public readonly reasonCode: string;

  constructor(reasonCode: string) {
    super(`AI output failed validation: ${reasonCode}`);
    this.name = "BadAIOutputError";
    this.reasonCode = reasonCode;
  }
}

export class AIUnavailableError extends Error {
  public readonly status?: number;

  constructor(status?: number) {
    super("The AI service is unavailable or rate limited");
    this.name = "AIUnavailableError";
    this.status = status;
  }
}

export class AnalysisTimeoutError extends Error {
  constructor() {
    super("Analysis timed out");
    this.name = "AnalysisTimeoutError";
  }
}

function stripCodeFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

type FailCode = "SCHEMA_INVALID" | "DIRECTIVE_LANGUAGE" | "TRUNCATED" | "EMPTY_RESPONSE";

interface ParseAttemptResult {
  success: true;
  data: ModelAnalysis;
  tokenUsage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
}

interface ParseAttemptFailure {
  success: false;
  failCode: FailCode;
  tokenUsage?: { promptTokens?: number; candidatesTokens?: number; totalTokens?: number };
}

type AttemptResult = ParseAttemptResult | ParseAttemptFailure;

/**
 * Runs a single attempt to generate and validate ModelAnalysis.
 */
async function runAttempt(
  systemInstruction: string,
  userPrompt: string,
  timeoutMs: number
): Promise<AttemptResult> {
  const result = await callGemini({
    systemInstruction,
    userPrompt,
    timeoutMs,
  });

  const tokenUsage = result.tokenUsage;

  if (result.finishReason === "MAX_TOKENS") {
    return { success: false, failCode: "TRUNCATED", tokenUsage };
  }

  const rawText = result.text.trim();
  if (!rawText) {
    return { success: false, failCode: "EMPTY_RESPONSE", tokenUsage };
  }

  const cleanedText = stripCodeFences(rawText);

  let jsonParsed: unknown;
  try {
    jsonParsed = JSON.parse(cleanedText);
  } catch {
    return { success: false, failCode: "SCHEMA_INVALID", tokenUsage };
  }

  const validation = ModelAnalysisSchema.safeParse(jsonParsed);
  if (!validation.success) {
    return { success: false, failCode: "SCHEMA_INVALID", tokenUsage };
  }

  const directiveCategories = containsDirectiveLanguage(validation.data);
  if (directiveCategories.length > 0) {
    return { success: false, failCode: "DIRECTIVE_LANGUAGE", tokenUsage };
  }

  return { success: true, data: validation.data, tokenUsage };
}

function isUpstreamQuotaOrServerError(err: unknown): { isMatch: boolean; status?: number } {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const status = typeof anyErr.status === "number" ? anyErr.status : undefined;
    if (status === 429 || (status && status >= 500 && status < 600)) {
      return { isMatch: true, status };
    }

    const message = typeof anyErr.message === "string" ? anyErr.message : "";
    if (
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("500") ||
      message.includes("INTERNAL")
    ) {
      return { isMatch: true, status };
    }
  }
  return { isMatch: false };
}

function isAbortOrTimeout(err: unknown): boolean {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    if (anyErr.name === "AbortError" || anyErr.code === "ABORT_ERR") {
      return true;
    }
    const message = typeof anyErr.message === "string" ? anyErr.message : "";
    if (message.includes("timeout") || message.includes("aborted")) {
      return true;
    }
  }
  return false;
}

/**
 * Orchestrates analysis generation, retry logic, grounding, and receipt creation.
 * Deadline: 28 seconds total.
 */
export async function analyze(
  input: AnalyzeRequest,
  requestId: string
): Promise<AnalysisSuccessResponse> {
  const OVERALL_DEADLINE_MS = 28000;
  const startTime = Date.now();

  let systemInstruction = buildSystemInstruction(input.decisionType);
  const userPrompt = buildUserPrompt(input);

  let attemptNumber = 1;
  let hasRetried = false;
  let validModelAnalysis: ModelAnalysis | null = null;

  while (!validModelAnalysis) {
    const elapsed = Date.now() - startTime;
    const remainingMs = OVERALL_DEADLINE_MS - elapsed;

    if (remainingMs <= 0) {
      logger.error("analyze.error", { reason: "overall_timeout" }, requestId);
      throw new AnalysisTimeoutError();
    }

    const attemptTimeout = Math.min(20000, remainingMs);
    const attemptStart = Date.now();

    try {
      const attemptRes = await runAttempt(systemInstruction, userPrompt, attemptTimeout);
      const attemptDuration = Date.now() - attemptStart;

      if (attemptRes.success) {
        logger.info(
          "analyze.attempt",
          {
            attempt: attemptNumber,
            durationMs: attemptDuration,
            outcome: "success",
            tokenCounts: attemptRes.tokenUsage,
          },
          requestId
        );
        validModelAnalysis = attemptRes.data;
        break;
      }

      // Attempt failed with a soft error (SCHEMA_INVALID, DIRECTIVE_LANGUAGE, TRUNCATED, EMPTY_RESPONSE)
      logger.warn(
        "analyze.attempt",
        {
          attempt: attemptNumber,
          durationMs: attemptDuration,
          outcome: attemptRes.failCode,
          tokenCounts: attemptRes.tokenUsage,
        },
        requestId
      );

      // Check if we can retry once
      if (attemptNumber === 1) {
        const timeRemainingForRetry = OVERALL_DEADLINE_MS - (Date.now() - startTime);
        if (timeRemainingForRetry >= 8000) {
          attemptNumber = 2;
          hasRetried = true;
          // Add corrective instruction listing only the reason code, never user text
          systemInstruction = `${systemInstruction}\n\nCorrection for previous attempt: The previous response failed with reason code [${attemptRes.failCode}]. Ensure the response strictly adheres to the non-directive role and exact JSON schema format.`;
          continue;
        }
      }

      // If retry skipped or attempt 2 failed, throw BadAIOutputError
      throw new BadAIOutputError(attemptRes.failCode);
    } catch (err: unknown) {
      if (err instanceof BadAIOutputError || err instanceof AnalysisTimeoutError) {
        throw err;
      }

      // Check for upstream quota or server errors (never retry these)
      const quotaCheck = isUpstreamQuotaOrServerError(err);
      if (quotaCheck.isMatch) {
        logger.error(
          "analyze.error",
          { reason: "ai_unavailable", status: quotaCheck.status },
          requestId
        );
        throw new AIUnavailableError(quotaCheck.status);
      }

      // Check for timeout / abort
      if (isAbortOrTimeout(err)) {
        logger.error("analyze.error", { reason: "timeout" }, requestId);
        throw new AnalysisTimeoutError();
      }

      // Other unexpected errors
      logger.error("analyze.error", { reason: "upstream_error" }, requestId);
      throw err;
    }
  }

  // Ground findings, assign ids, compute receipt
  const { reasoningMap, findings, quotesDropped } = groundFindings(validModelAnalysis, input);

  const findingsTotal = findings.length;
  const findingsGrounded = findings.filter((f) => f.evidence.length > 0).length;

  const receipt: Receipt = {
    language_check: "passed",
    findings_total: findingsTotal,
    findings_grounded: findingsGrounded,
    quotes_dropped: quotesDropped,
    retried: hasRetried,
  };

  logger.info(
    "analyze.success",
    {
      findingsTotal,
      findingsGrounded,
      quotesDropped,
      retried: hasRetried,
    },
    requestId
  );

  return {
    kind: "analysis",
    analysis: {
      decision_summary: validModelAnalysis.decision_summary,
      reasoning_map: reasoningMap,
      findings,
      premortem_questions: validModelAnalysis.premortem_questions,
      high_stakes_domain: validModelAnalysis.high_stakes_domain,
      closing_note: validModelAnalysis.closing_note,
    },
    receipt,
    input: {
      decision: input.decision,
      reasons: input.reasons,
      context: input.context,
    },
  };
}
