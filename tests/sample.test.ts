import test from "node:test";
import assert from "node:assert";
import { AnalyzeRequestSchema } from "../lib/schema.ts";

test("AnalyzeRequestSchema rejects certaintyBefore and unknown fields", () => {
  const valid = {
    decisionType: "career",
    decision: "Should I accept the offer?",
    reasons: "Great team and culture.",
    context: "Commute is 20 minutes.",
  };
  assert.ok(AnalyzeRequestSchema.safeParse(valid).success);

  // Rejects certaintyBefore
  const withCertainty = {
    ...valid,
    certaintyBefore: 4,
  };
  const certaintyResult = AnalyzeRequestSchema.safeParse(withCertainty);
  assert.strictEqual(certaintyResult.success, false);

  // Rejects unknown fields
  const withUnknown = {
    ...valid,
    extraField: "not allowed",
  };
  const unknownResult = AnalyzeRequestSchema.safeParse(withUnknown);
  assert.strictEqual(unknownResult.success, false);
});
