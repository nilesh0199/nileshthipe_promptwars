import type { DecisionTypeId } from "./decisionTypes";

export type DecisionInput = {
  decision: string;
  options: string;
  reasons: string;
  knownFacts: string;
  uncertainties: string;
  constraints: string;
  decisionType: DecisionTypeId;
  // certaintyBefore is for the user only and must never be sent to the AI.
  certaintyBefore: number | null;
};
