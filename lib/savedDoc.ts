import type { Analysis, Receipt, DecisionType } from "./schema";

export interface SaveDocInput {
  decisionType: DecisionType;
  decision: string;
  reasons: string;
  context: string;
}

export interface BuildAnalysisDocParams {
  input: {
    decisionType: DecisionType;
    decision: string;
    reasons: string;
    context?: string;
  };
  analysis: Analysis;
  receipt: Receipt;
  triage: Record<string, string>;
  notes: string;
  certaintyBefore: number | null;
  certaintyAfter: number | null;
}

export interface AnalysisDoc {
  uid: string;
  title: string;
  input: SaveDocInput;
  analysis: Analysis;
  receipt: Receipt;
  triage: Record<string, string>;
  notes: string;
  certaintyBefore: number | null;
  certaintyAfter: number | null;
}

/**
 * Recursively replaces any undefined values with null, as Firestore rejects undefined.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val)) {
    result[k] = sanitizeForFirestore(v);
  }
  return result as T;
}

/**
 * Builds the analysis document object for storage.
 * Pure function with NO firebase imports, suitable for unit testing.
 */
export function buildAnalysisDoc(
  uid: string,
  params: BuildAnalysisDocParams
): AnalysisDoc {
  const rawTitle =
    params.analysis?.decision_summary?.trim() ||
    params.input?.decision?.trim() ||
    "Untitled Decision";

  // Truncate title to 120 characters maximum
  const title = rawTitle.slice(0, 120);

  const rawDoc: AnalysisDoc = {
    uid,
    title,
    input: {
      decisionType: params.input.decisionType,
      decision: params.input.decision || "",
      reasons: params.input.reasons || "",
      context: params.input.context || "",
    },
    analysis: params.analysis,
    receipt: params.receipt,
    triage: params.triage || {},
    notes: params.notes || "",
    certaintyBefore:
      params.certaintyBefore !== undefined ? params.certaintyBefore : null,
    certaintyAfter:
      params.certaintyAfter !== undefined ? params.certaintyAfter : null,
  };

  return sanitizeForFirestore(rawDoc);
}

/**
 * Decides whether to proceed with save or prompt sign-in.
 * Returns "save" if a valid user object exists, "prompt-sign-in" otherwise.
 */
export function decideSaveAction(
  user: { uid?: string | null } | null | undefined
): "save" | "prompt-sign-in" {
  if (user && typeof user === "object" && typeof user.uid === "string" && user.uid.trim().length > 0) {
    return "save";
  }
  return "prompt-sign-in";
}
