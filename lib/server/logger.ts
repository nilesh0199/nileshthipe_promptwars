export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  event: string;
  requestId?: string;
  [key: string]: unknown;
}

const REDACT_KEY_REGEX = /key|token|secret|authorization|password/i;

function sanitizeValue(key: string, value: unknown): unknown {
  if (REDACT_KEY_REGEX.test(key)) {
    return "[REDACTED]";
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      res[k] = sanitizeValue(k, v);
    }
    return res;
  }
  return value;
}

/**
 * Emits a single JSON object per line to stdout.
 * Never logs user text, model output, prompts, or raw upstream errors.
 * Redacts any key matching sensitive credential names.
 */
export function log(payload: LogPayload): void {
  const isProd = process.env.NODE_ENV === "production";
  if (payload.level === "debug" && isProd) {
    return;
  }

  const { level, event, requestId, ...extra } = payload;
  const sanitizedExtra: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(extra)) {
    sanitizedExtra[k] = sanitizeValue(k, v);
  }

  const logEntry = {
    time: new Date().toISOString(),
    level,
    event,
    ...(requestId ? { requestId } : {}),
    ...sanitizedExtra,
  };

  process.stdout.write(JSON.stringify(logEntry) + "\n");
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>, requestId?: string) =>
    log({ level: "debug", event, requestId, ...meta }),
  info: (event: string, meta?: Record<string, unknown>, requestId?: string) =>
    log({ level: "info", event, requestId, ...meta }),
  warn: (event: string, meta?: Record<string, unknown>, requestId?: string) =>
    log({ level: "warn", event, requestId, ...meta }),
  error: (event: string, meta?: Record<string, unknown>, requestId?: string) =>
    log({ level: "error", event, requestId, ...meta }),
};
