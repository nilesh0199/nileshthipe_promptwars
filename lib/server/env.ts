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
}

let cachedEnv: ServerEnv | null = null;

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

  if (errors.length > 0) {
    throw new ConfigError(errors);
  }

  cachedEnv = {
    GEMINI_API_KEY: apiKey!,
    GEMINI_MODEL: model!,
    GEMINI_THINKING_LEVEL: thinkingLevel,
  };

  return cachedEnv;
}
