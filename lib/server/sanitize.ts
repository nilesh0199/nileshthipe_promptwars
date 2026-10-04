/**
 * Input sanitiser for text fields in the AnalyzeRequest pipeline.
 *
 * Runs BEFORE length validation, prompt construction, and quote grounding:
 * 1. Unicode normalises to NFC form.
 * 2. Strips control characters EXCEPT newline (\n), carriage return (\r), and tab (\t).
 * 3. Strips zero-width and bidirectional-override characters:
 *    U+200B-U+200F, U+202A-U+202E, U+2060-U+2064, U+2066-U+2069, U+FEFF.
 *
 * Keeps all standard Unicode text (e.g. Hindi, Marathi, accent characters, emojis).
 */

const DISALLOWED_CHARS_REGEX =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/gu;

export function sanitizeInputText(raw: string): string {
  if (typeof raw !== "string") {
    return "";
  }

  // 1. Unicode NFC normalization
  const normalized = raw.normalize("NFC");

  // 2. Remove prohibited control, zero-width, and bidirectional-override characters
  return normalized.replace(DISALLOWED_CHARS_REGEX, "");
}

/**
 * Sanitises the text fields of an untyped or semi-typed request payload
 * prior to Zod length validation. Preserves all other keys so schema validation
 * can enforce strict key rules.
 */
export function sanitizeRequestPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...payload };

  if (typeof result.decision === "string") {
    result.decision = sanitizeInputText(result.decision);
  }
  if (typeof result.reasons === "string") {
    result.reasons = sanitizeInputText(result.reasons);
  }
  if (typeof result.context === "string") {
    result.context = sanitizeInputText(result.context);
  }

  return result;
}
