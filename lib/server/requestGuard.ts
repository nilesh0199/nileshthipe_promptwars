import { NextResponse } from "next/server";

export const MAX_BODY_BYTES = 8192; // 8 KB

export interface GuardErrorDetails {
  status: number;
  code: string;
  message: string;
  headers?: Record<string, string>;
}

/**
 * Validates the HTTP method against an allowed list.
 */
export function checkMethod(
  method: string,
  allowedMethods: string[] = ["POST"]
): { ok: boolean; allowHeader?: string } {
  const isAllowed = allowedMethods.includes(method.toUpperCase());
  if (isAllowed) {
    return { ok: true };
  }
  return {
    ok: false,
    allowHeader: allowedMethods.join(", "),
  };
}

/**
 * Validates that Content-Type is application/json.
 */
export function checkContentType(contentType: string | null | undefined): boolean {
  if (!contentType) {
    return false;
  }
  const normalized = contentType.toLowerCase().trim();
  return normalized.includes("application/json");
}

/**
 * Validates origin for same-origin compliance.
 * Missing Origin header is allowed (same-site navigation, curl, server-to-server).
 * If Origin is present, its host must match request Host or be in allowedOrigins.
 */
export function checkSameOrigin(
  origin: string | null | undefined,
  host: string | null | undefined,
  allowedOrigins: string[] = []
): boolean {
  // Missing Origin is explicitly allowed
  if (!origin) {
    return true;
  }

  let originHost = "";
  try {
    const originUrl = new URL(origin);
    originHost = originUrl.host.toLowerCase();
  } catch {
    return false;
  }

  const expectedHost = (host || "").trim().toLowerCase();
  if (expectedHost && originHost === expectedHost) {
    return true;
  }

  // Check against allowed origins list
  for (const allowed of allowedOrigins) {
    const cleanAllowed = allowed.trim().toLowerCase();
    if (!cleanAllowed) continue;

    if (cleanAllowed === origin.toLowerCase() || cleanAllowed === originHost) {
      return true;
    }

    try {
      const allowedUrl = new URL(cleanAllowed);
      if (allowedUrl.host.toLowerCase() === originHost) {
        return true;
      }
    } catch {
      // If allowed is not a full URL, direct string comparison above handled it
    }
  }

  return false;
}

/**
 * Validates body size against the maximum byte limit.
 */
export function checkBodySize(
  contentLengthHeader: string | null | undefined,
  byteLength: number,
  maxBytes: number = MAX_BODY_BYTES
): boolean {
  if (contentLengthHeader) {
    const parsed = parseInt(contentLengthHeader, 10);
    if (!isNaN(parsed) && parsed > maxBytes) {
      return false;
    }
  }

  return byteLength <= maxBytes;
}

/**
 * Standardised error response factory with security headers and request tracing.
 */
export function createGuardErrorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "x-request-id": requestId,
        "Cache-Control": "no-store",
        ...additionalHeaders,
      },
    }
  );
}
