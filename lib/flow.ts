import { DecisionInput } from "./types";

export type FlowScreenId = "type" | "decision" | "reasons" | "context";

export interface FlowScreenConfig {
  id: FlowScreenId;
  heading: string;
  whyWeAsk: string;
  field: keyof DecisionInput;
  rows?: number;
  required: boolean;
  canSkip?: boolean;
  primaryActionLabel?: string;
}

export const WORKSPACE_SCREENS: FlowScreenConfig[] = [
  {
    id: "type",
    heading: "What kind of decision is this?",
    whyWeAsk: "Selecting an area focuses the inquiry lenses on relevant blind spots.",
    field: "decisionType",
    required: true,
  },
  {
    id: "decision",
    heading: "What are you deciding?",
    whyWeAsk: "One or two sentences is enough. Include the options if you have them.",
    field: "decision",
    rows: 3,
    required: true,
  },
  {
    id: "reasons",
    heading: "What's drawing you toward it?",
    whyWeAsk: "Your reasons, in your own words. This is what we'll look at most closely.",
    field: "reasons",
    rows: 5,
    required: true,
  },
  {
    id: "context",
    heading: "Anything else that matters?",
    whyWeAsk: "Facts you know, things you're unsure about, deadlines. All optional.",
    field: "context",
    rows: 5,
    required: false,
    canSkip: true,
    primaryActionLabel: "Show me another perspective",
  },
];
