export class ConfigError extends Error {
  public readonly missingOrInvalidVars: string[];

  constructor(vars: string[]) {
    super(`Missing or invalid environment variables: ${vars.join(", ")}`);
    this.name = "ConfigError";
    this.missingOrInvalidVars = vars;
  }
}

export type ThinkingLevelSetting = "low" | "medium" | "high";

export interface ServerEnv {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  GEMINI_THINKING_LEVEL: ThinkingLevelSetting;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_SECONDS: number;
  RATE_LIMIT_GLOBAL_MAX: number;
  ALLOWED_ORIGINS: string[];
}

let cachedEnv: ServerEnv | null = null;

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}

/**
 * Parses process.env lazily on first invocation.
 * Never logs or exposes values; lists only variable names on failure.
 */
export function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const errors: string[] = [];

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    errors.push("GEMINI_API_KEY");
  }

  const rawModel = process.env.GEMINI_MODEL?.trim();
  const model = rawModel || "gemini-2.5-flash";
  const MODEL_REGEX = /^[a-zA-Z0-9.-]+$/;
  if (!MODEL_REGEX.test(model)) {
    errors.push("GEMINI_MODEL");
  }

  let thinkingLevel: ThinkingLevelSetting = "medium";
  const rawThinking = process.env.GEMINI_THINKING_LEVEL?.trim().toLowerCase();
  if (rawThinking) {
    if (rawThinking === "low" || rawThinking === "medium" || rawThinking === "high") {
      thinkingLevel = rawThinking;
    } else {
      errors.push("GEMINI_THINKING_LEVEL");
    }
  }

  const isProd = process.env.NODE_ENV === "production";

  let rateLimitMax = isProd ? 20 : 120;
  if (process.env.RATE_LIMIT_MAX) {
    const parsed = parseInt(process.env.RATE_LIMIT_MAX.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push("RATE_LIMIT_MAX");
    } else {
      rateLimitMax = parsed;
    }
  }

  let rateLimitWindowSeconds = 600;
  if (process.env.RATE_LIMIT_WINDOW_SECONDS) {
    const parsed = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push("RATE_LIMIT_WINDOW_SECONDS");
    } else {
      rateLimitWindowSeconds = parsed;
    }
  }

  let rateLimitGlobalMax = 300;
  if (process.env.RATE_LIMIT_GLOBAL_MAX) {
    const parsed = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX.trim(), 10);
    if (isNaN(parsed) || parsed <= 0) {
      errors.push("RATE_LIMIT_GLOBAL_MAX");
    } else {
      rateLimitGlobalMax = parsed;
    }
  }

  const allowedOrigins: string[] = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (errors.length > 0) {
    throw new ConfigError(errors);
  }

  cachedEnv = {
    GEMINI_API_KEY: apiKey!,
    GEMINI_MODEL: model!,
    GEMINI_THINKING_LEVEL: thinkingLevel,
    RATE_LIMIT_MAX: rateLimitMax,
    RATE_LIMIT_WINDOW_SECONDS: rateLimitWindowSeconds,
    RATE_LIMIT_GLOBAL_MAX: rateLimitGlobalMax,
    ALLOWED_ORIGINS: allowedOrigins,
  };

  return cachedEnv;
}
