import type { Helpline } from "./schema";

/**
 * CRISIS-LANGUAGE FALLBACK
 *
 * Limitation: Keyword matching cannot catch every case of distress or nuanced crisis language.
 * This is a conservative safeguard designed to pause reflection and offer supportive resources
 * when explicit first-person statements indicating self-harm or suicidal ideation are detected.
 */

const FIRST_PERSON_CRISIS_PATTERNS: RegExp[] = [
  // Wanting to die / wishing for death
  /\b(?:i\s+(?:just\s+)?(?:want\s+to|wanna)\s+die|i\s+wish\s+i\s+(?:were|was)\s+dead)\b/i,

  // Ending one's own life / taking one's own life
  /\b(?:(?:end|ending|take|taking)\s+(?:my\s+own\s+life|my\s+life))\b/i,

  // Killing oneself
  /\b(?:(?:kill|killing)\s+myself)\b/i,

  // Being suicidal
  /\b(?:i(?:'m|\s+am|\s+feel|'ve\s+been\s+feeling)?\s+suicidal|feeling\s+suicidal)\b/i,

  // Not wanting to live / no reason to live
  /\b(?:(?:don'?t|do\s+not)\s+(?:want\s+to|wanna)\s+live|no\s+reason\s+to\s+live|no\s+point\s+in\s+living)\b/i,

  // Being better off dead
  /\b(?:better\s+off\s+dead|better\s+off\s+without\s+me)\b/i,

  // Hurting or harming oneself
  /\b(?:(?:harm|harming|hurt|hurting|cut|cutting)\s+myself)\b/i,
];

/**
 * Evaluates whether text contains explicit first-person statements of suicidal intent or self-harm.
 * Does NOT match bare topic words (e.g. "suicide prevention course", "self-harm policy").
 */
export function detectCrisisLanguage(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const normalized = text.toLowerCase();
  return FIRST_PERSON_CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const SUPPORT_MESSAGE =
  "We want to pause here. What you wrote sounds like it may be about more than a decision, and this tool isn't the right place for it. If you're thinking about harming yourself, please reach out to someone you trust or a helpline now. You deserve real support.";

export const SUPPORT_HELPLINES: Helpline[] = [
  {
    name: "Tele-MANAS (India)",
    contact: "14416 or 1-800-891-4416",
    note: "Free, 24x7, in many languages.",
  },
  {
    name: "Elsewhere or in immediate danger",
    contact: "Your local emergency number",
    note: "",
  },
];
