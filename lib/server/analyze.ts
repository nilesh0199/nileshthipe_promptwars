import type { AnalyzeRequest, AnalysisSuccessResponse, ModelAnalysis, Receipt } from "../schema";
import { ModelAnalysisSchema } from "../schema";
import { buildSystemInstruction, buildUserPrompt } from "./prompt";
import { callGemini } from "./gemini";
import { containsDirectiveLanguage } from "./guard";
import { groundFindings } from "./grounding";
import { logger } from "./logger";
import { getEnv } from "./env";

export class BadAIOutputError extends Error {
  public readonly reasonCode: string;

  constructor(reasonCode: string) {
    super(`AI output failed validation: ${reasonCode}`);
    this.name = "BadAIOutputError";
    this.reasonCode = reasonCode;
  }
}

export class AIQuotaError extends Error {
  public readonly status: number;
  public readonly attempt?: number;

  constructor(status: number = 429, attempt?: number) {
    super("The AI service has reached its limit for now");
    this.name = "AIQuotaError";
    this.status = status;
    this.attempt = attempt;
  }
}

export class AIUnavailableError extends Error {
  public readonly status?: number;
  public readonly attempt?: number;

  constructor(status?: number, attempt?: number) {
    super("The AI service is unavailable or rate limited");
    this.name = "AIUnavailableError";
    this.status = status;
    this.attempt = attempt;
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
  timeoutMs: number,
  modelOverride?: string
): Promise<AttemptResult> {
  const result = await callGemini({
    systemInstruction,
    userPrompt,
    timeoutMs,
    modelOverride,
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

function isUpstreamQuotaError(err: unknown): { isMatch: boolean; status?: number } {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const status = typeof anyErr.status === "number" ? anyErr.status : undefined;
    if (status === 429) {
      return { isMatch: true, status: 429 };
    }

    const message = typeof anyErr.message === "string" ? anyErr.message : "";
    if (
      message.includes("429") ||
      message.includes("RESOURCE_EXHAUSTED") ||
      /quota/i.test(message) ||
      /rate limit/i.test(message)
    ) {
      return { isMatch: true, status: status || 429 };
    }
  }
  return { isMatch: false };
}

function isUpstreamOverloadError(err: unknown): { isMatch: boolean; status?: number } {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    const status = typeof anyErr.status === "number" ? anyErr.status : undefined;
    if (status && status >= 500 && status < 600) {
      return { isMatch: true, status };
    }

    const message = typeof anyErr.message === "string" ? anyErr.message : "";
    if (
      message.includes("503") ||
      message.includes("UNAVAILABLE") ||
      message.includes("500") ||
      message.includes("INTERNAL") ||
      /overload/i.test(message) ||
      /high demand/i.test(message)
    ) {
      return { isMatch: true, status: status || 503 };
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
 * Orchestrates analysis generation, retry logic, fallback model, grounding, and receipt creation.
 * Deadline: 28 seconds total.
 */
export async function analyze(
  input: AnalyzeRequest,
  requestId: string
): Promise<AnalysisSuccessResponse> {
  const OVERALL_DEADLINE_MS = 28000;
  const startTime = Date.now();

  const env = getEnv();
  const fallbackModel = env.GEMINI_FALLBACK_MODEL;

  let systemInstruction = buildSystemInstruction(input.decisionType);
  const userPrompt = buildUserPrompt(input);

  let attemptNumber = 1;
  let hasRetried = false;
  let validModelAnalysis: ModelAnalysis | null = null;
  let currentModelOverride: string | undefined = undefined;
  let hasUsedFallback = false;
  let hasOverloadRetried = false;

  while (!validModelAnalysis) {
    const elapsed = Date.now() - startTime;
    const remainingMs = OVERALL_DEADLINE_MS - elapsed;

    if (remainingMs <= 0) {
      logger.error(
        "analyze.error",
        { code: "TIMEOUT", reason: "overall_timeout", attempt: attemptNumber },
        requestId
      );
      throw new AnalysisTimeoutError();
    }

    const attemptTimeout = Math.min(20000, remainingMs);
    const attemptStart = Date.now();

    try {
      const attemptRes = await runAttempt(
        systemInstruction,
        userPrompt,
        attemptTimeout,
        currentModelOverride
      );
      const attemptDuration = Date.now() - attemptStart;

      if (attemptRes.success) {
        logger.info(
          "analyze.attempt",
          {
            attempt: attemptNumber,
            durationMs: attemptDuration,
            outcome: "success",
            tokenCounts: attemptRes.tokenUsage,
            ...(hasUsedFallback ? { model_fallback_used: true } : {}),
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
          ...(hasUsedFallback ? { model_fallback_used: true } : {}),
        },
        requestId
      );

      // Check if we can retry once on soft error
      if (attemptNumber === 1 && !hasRetried) {
        const timeRemainingForRetry = OVERALL_DEADLINE_MS - (Date.now() - startTime);
        if (timeRemainingForRetry >= 8000) {
          attemptNumber++;
          hasRetried = true;
          // Add corrective instruction listing only the reason code, never user text
          systemInstruction = `${systemInstruction}\n\nCorrection for previous attempt: The previous response failed with reason code [${attemptRes.failCode}]. Ensure the response strictly adheres to the non-directive role and exact JSON schema format.`;
          continue;
        }
      }

      logger.error(
        "analyze.error",
        { code: "BAD_AI_OUTPUT", reason: attemptRes.failCode, attempt: attemptNumber },
        requestId
      );
      throw new BadAIOutputError(attemptRes.failCode);
    } catch (err: unknown) {
      if (err instanceof BadAIOutputError || err instanceof AnalysisTimeoutError) {
        throw err;
      }

      // Check for timeout / abort
      if (isAbortOrTimeout(err)) {
        logger.error(
          "analyze.error",
          { code: "TIMEOUT", reason: "timeout", attempt: attemptNumber },
          requestId
        );
        throw new AnalysisTimeoutError();
      }

      // Check for upstream quota or rate-limit error (429)
      const quotaCheck = isUpstreamQuotaError(err);
      if (quotaCheck.isMatch) {
        // Fallback model attempt if configured and not yet used
        if (fallbackModel && !hasUsedFallback) {
          const timeRemaining = OVERALL_DEADLINE_MS - (Date.now() - startTime);
          if (timeRemaining >= 8000) {
            attemptNumber++;
            hasRetried = true;
            hasUsedFallback = true;
            currentModelOverride = fallbackModel;
            continue;
          }
        }

        logger.error(
          "analyze.error",
          {
            code: "AI_QUOTA",
            attempt: attemptNumber,
            upstreamStatus: quotaCheck.status ?? 429,
          },
          requestId
        );
        throw new AIQuotaError(quotaCheck.status ?? 429, attemptNumber);
      }

      // Check for upstream overload or server error (5xx)
      const overloadCheck = isUpstreamOverloadError(err);
      if (overloadCheck.isMatch) {
        // ONE automatic retry after about 1.5 seconds if at least 8 seconds remain
        if (!hasOverloadRetried && !hasUsedFallback) {
          const timeRemaining = OVERALL_DEADLINE_MS - (Date.now() - startTime);
          if (timeRemaining >= 9500) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            attemptNumber++;
            hasRetried = true;
            hasOverloadRetried = true;
            continue;
          }
        }

        // If overload retry failed or insufficient time for pause, try fallback model if configured
        if (fallbackModel && !hasUsedFallback) {
          const timeRemaining = OVERALL_DEADLINE_MS - (Date.now() - startTime);
          if (timeRemaining >= 8000) {
            attemptNumber++;
            hasRetried = true;
            hasUsedFallback = true;
            currentModelOverride = fallbackModel;
            continue;
          }
        }

        logger.error(
          "analyze.error",
          {
            code: "AI_UNAVAILABLE",
            attempt: attemptNumber,
            upstreamStatus: overloadCheck.status ?? 503,
          },
          requestId
        );
        throw new AIUnavailableError(overloadCheck.status ?? 503, attemptNumber);
      }

      // Other unexpected errors
      logger.error(
        "analyze.error",
        { code: "SERVER_ERROR", reason: "upstream_error", attempt: attemptNumber },
        requestId
      );
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
