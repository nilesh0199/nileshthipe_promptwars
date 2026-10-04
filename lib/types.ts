import type { DecisionTypeId } from "./decisionTypes";

export type DecisionInput = {
  decisionType: DecisionTypeId | null;
  decision: string;
  reasons: string;
  context: string;
  // certaintyBefore is for the user only and must never be sent to the AI.
  certaintyBefore: number | null;
};
