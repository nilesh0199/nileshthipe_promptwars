import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema, type SupportResponse } from "@/lib/schema";
import {
  analyze,
  BadAIOutputError,
  AIUnavailableError,
  AnalysisTimeoutError,
} from "@/lib/server/analyze";
import { ConfigError, getEnv } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";
import {
  checkContentType,
  checkSameOrigin,
  checkBodySize,
  createGuardErrorResponse,
  MAX_BODY_BYTES,
} from "@/lib/server/requestGuard";
import { extractClientKey, rateLimiter } from "@/lib/server/rateLimit";
import { sanitizeRequestPayload } from "@/lib/server/sanitize";
import {
  detectCrisisLanguage,
  SUPPORT_MESSAGE,
  SUPPORT_HELPLINES,
} from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function methodNotAllowedResponse() {
  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: "POST",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return methodNotAllowedResponse();
}

export async function PUT() {
  return methodNotAllowedResponse();
}

export async function DELETE() {
  return methodNotAllowedResponse();
}

export async function PATCH() {
  return methodNotAllowedResponse();
}

export async function HEAD() {
  return methodNotAllowedResponse();
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  // 1. Rate limiting (in-memory, per instance best effort)
  const clientKey = extractClientKey(req.headers);
  const rateLimitResult = rateLimiter.check(clientKey);

  if (!rateLimitResult.allowed) {
    if (rateLimitResult.isGlobal) {
      logger.warn("analyze.busy", {}, requestId);
      return createGuardErrorResponse(
        503,
        "AI_UNAVAILABLE",
        "The AI service is busy right now. Please try again in a minute.",
        requestId
      );
    }

    logger.warn("analyze.rate_limited", {}, requestId);
    const retryAfter = rateLimitResult.retryAfterSeconds ?? 60;
    return createGuardErrorResponse(
      429,
      "RATE_LIMITED",
      "You've reached the limit for now. Please wait a few minutes and try again.",
      requestId,
      { "Retry-After": retryAfter.toString() }
    );
  }

  // 2. Content-Type check (must be application/json)
  const contentType = req.headers.get("content-type");
  if (!checkContentType(contentType)) {
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  // 3. Same-origin check
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  let allowedOrigins: string[] = [];
  try {
    allowedOrigins = getEnv().ALLOWED_ORIGINS;
  } catch {
    // If env config fails, allowedOrigins defaults to empty
  }

  if (!checkSameOrigin(origin, host, allowedOrigins)) {
    logger.warn("analyze.forbidden", {}, requestId);
    return createGuardErrorResponse(
      403,
      "FORBIDDEN",
      "This request couldn't be accepted.",
      requestId
    );
  }

  // 4. Body size check (8 KB cap)
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_BODY_BYTES) {
    logger.warn("analyze.request_oversized", { headerBytes: contentLengthHeader }, requestId);
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  const byteLength = new TextEncoder().encode(bodyText).length;
  if (!checkBodySize(contentLengthHeader, byteLength, MAX_BODY_BYTES)) {
    logger.warn("analyze.request_oversized", { bodyBytes: byteLength }, requestId);
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  // 5. Parse JSON
  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(bodyText);
  } catch {
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  if (!jsonBody || typeof jsonBody !== "object" || Array.isArray(jsonBody)) {
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  // 6. Sanitise input BEFORE length and schema validation
  const sanitizedPayload = sanitizeRequestPayload(jsonBody as Record<string, unknown>);
  const parsed = AnalyzeRequestSchema.safeParse(sanitizedPayload);
  if (!parsed.success) {
    return createGuardErrorResponse(
      400,
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      requestId
    );
  }

  const input = parsed.data;

  // 7. Crisis-language check BEFORE any Gemini call
  const hasCrisisLanguage =
    detectCrisisLanguage(input.decision) ||
    detectCrisisLanguage(input.reasons) ||
    detectCrisisLanguage(input.context);

  if (hasCrisisLanguage) {
    // Log ONLY event name, never user text
    logger.info("analyze.support", {}, requestId);

    const supportPayload: SupportResponse = {
      kind: "support",
      message: SUPPORT_MESSAGE,
      helplines: SUPPORT_HELPLINES,
    };

    return NextResponse.json(supportPayload, {
      status: 200,
      headers: {
        "x-request-id": requestId,
        "Cache-Control": "no-store",
      },
    });
  }

  // 8. Log request: decisionType and lengths only
  logger.info(
    "analyze.request",
    {
      decisionType: input.decisionType,
      decisionLen: input.decision.length,
      reasonsLen: input.reasons.length,
      contextLen: input.context ? input.context.length : 0,
    },
    requestId
  );

  // 9. Execute analysis
  try {
    const result = await analyze(input, requestId);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-request-id": requestId,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    if (err instanceof BadAIOutputError) {
      logger.error(
        "analyze.error",
        { code: "BAD_AI_OUTPUT", reason: err.reasonCode },
        requestId
      );
      return createGuardErrorResponse(
        502,
        "BAD_AI_OUTPUT",
        "We couldn't produce a reliable analysis this time. Please try again.",
        requestId
      );
    }

    if (err instanceof AIUnavailableError) {
      logger.error(
        "analyze.error",
        { code: "AI_UNAVAILABLE", upstreamStatus: err.status },
        requestId
      );
      return createGuardErrorResponse(
        503,
        "AI_UNAVAILABLE",
        "The AI service is busy right now. Please try again in a minute.",
        requestId
      );
    }

    if (err instanceof AnalysisTimeoutError) {
      logger.error("analyze.error", { code: "TIMEOUT" }, requestId);
      return createGuardErrorResponse(
        504,
        "TIMEOUT",
        "That took longer than expected. Please try again.",
        requestId
      );
    }

    if (err instanceof ConfigError) {
      logger.error(
        "analyze.error",
        { code: "CONFIG_ERROR", missingVars: err.missingOrInvalidVars },
        requestId
      );
      return createGuardErrorResponse(
        500,
        "SERVER_ERROR",
        "Something went wrong on our side. Please try again.",
        requestId
      );
    }

    logger.error("analyze.error", { code: "SERVER_ERROR" }, requestId);
    return createGuardErrorResponse(
      500,
      "SERVER_ERROR",
      "Something went wrong on our side. Please try again.",
      requestId
    );
  }
}
