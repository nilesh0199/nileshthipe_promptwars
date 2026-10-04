import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/schema";
import {
  analyze,
  BadAIOutputError,
  AIUnavailableError,
  AnalysisTimeoutError,
} from "@/lib/server/analyze";
import { ConfigError } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 8192; // 8 KB

function makeErrorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string
) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "x-request-id": requestId,
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  // Check content-length header if provided
  const contentLengthHeader = req.headers.get("content-length");
  if (
    contentLengthHeader &&
    parseInt(contentLengthHeader, 10) > MAX_BODY_BYTES
  ) {
    logger.warn(
      "analyze.request_oversized",
      { headerBytes: contentLengthHeader },
      requestId
    );
    return makeErrorResponse(
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      400,
      requestId
    );
  }

  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch {
    return makeErrorResponse(
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      400,
      requestId
    );
  }

  // Reject bodies larger than 8 KB (byte length)
  const byteLength = new TextEncoder().encode(bodyText).length;
  if (byteLength > MAX_BODY_BYTES) {
    logger.warn(
      "analyze.request_oversized",
      { bodyBytes: byteLength },
      requestId
    );
    return makeErrorResponse(
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      400,
      requestId
    );
  }

  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(bodyText);
  } catch {
    return makeErrorResponse(
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      400,
      requestId
    );
  }

  const parsed = AnalyzeRequestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return makeErrorResponse(
      "INVALID_INPUT",
      "Something in your answers couldn't be read. Please check them and try again.",
      400,
      requestId
    );
  }

  const input = parsed.data;

  // Log analyze.request: decisionType and input lengths only!
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
      return makeErrorResponse(
        "BAD_AI_OUTPUT",
        "We couldn't produce a reliable analysis this time. Please try again.",
        502,
        requestId
      );
    }

    if (err instanceof AIUnavailableError) {
      logger.error(
        "analyze.error",
        { code: "AI_UNAVAILABLE", upstreamStatus: err.status },
        requestId
      );
      return makeErrorResponse(
        "AI_UNAVAILABLE",
        "The AI service is busy right now. Please try again in a minute.",
        503,
        requestId
      );
    }

    if (err instanceof AnalysisTimeoutError) {
      logger.error("analyze.error", { code: "TIMEOUT" }, requestId);
      return makeErrorResponse(
        "TIMEOUT",
        "That took longer than expected. Please try again.",
        504,
        requestId
      );
    }

    if (err instanceof ConfigError) {
      logger.error(
        "analyze.error",
        { code: "CONFIG_ERROR", missingVars: err.missingOrInvalidVars },
        requestId
      );
      return makeErrorResponse(
        "SERVER_ERROR",
        "Something went wrong on our side. Please try again.",
        500,
        requestId
      );
    }

    // Generic server error
    logger.error("analyze.error", { code: "SERVER_ERROR" }, requestId);
    return makeErrorResponse(
      "SERVER_ERROR",
      "Something went wrong on our side. Please try again.",
      500,
      requestId
    );
  }
}
