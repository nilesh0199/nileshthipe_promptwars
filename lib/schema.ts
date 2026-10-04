import { z } from "zod";
import { LIMITS } from "./limits";

// 1. AnalyzeRequest Schema (strict: unknown keys like certaintyBefore are rejected)
export const AnalyzeRequestSchema = z
  .object({
    decisionType: z.enum(["study", "career", "money", "life", "other"]),
    decision: z
      .string()
      .trim()
      .min(LIMITS.decision.min, "Decision must be at least 3 characters")
      .max(LIMITS.decision.max, `Decision exceeds ${LIMITS.decision.max} characters`),
    reasons: z
      .string()
      .trim()
      .min(LIMITS.reasons.min, "Reasons must be at least 3 characters")
      .max(LIMITS.reasons.max, `Reasons exceeds ${LIMITS.reasons.max} characters`),
    context: z
      .string()
      .trim()
      .max(LIMITS.context.max, `Context exceeds ${LIMITS.context.max} characters`),
  })
  .strict();

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// 2. ModelAnalysis Schema (what Gemini must return; no ids)
export const FindingTypeSchema = z.enum([
  "unstated_assumption",
  "overlooked_factor",
  "internal_tension",
  "missing_information",
  "alternative_perspective",
]);
export type FindingType = z.infer<typeof FindingTypeSchema>;

export const FindingBasisSchema = z.enum(["stated", "inferred", "unknown"]);
export type FindingBasis = z.infer<typeof FindingBasisSchema>;

export const FindingCategorySchema = z.enum([
  "academic",
  "financial",
  "career",
  "wellbeing",
  "relationships",
  "logistics",
  "long_term",
  "other",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const HighStakesDomainSchema = z.enum([
  "none",
  "health",
  "legal",
  "financial",
  "immigration",
  "safety",
]);
export type HighStakesDomain = z.infer<typeof HighStakesDomainSchema>;

export const ModelReasoningEntrySchema = z
  .object({
    stated_reason: z.string().max(200),
    rests_on: z.string().max(250),
    evidence_given: z.string().max(200).nullable(),
  })
  .strict();
export type ModelReasoningEntry = z.infer<typeof ModelReasoningEntrySchema>;

export const ModelFindingSchema = z
  .object({
    type: FindingTypeSchema,
    title: z.string().max(90),
    observation: z.string().max(350),
    evidence_quotes: z.array(z.string().max(200)).max(2),
    evidence_paraphrase: z.string().max(250),
    basis: FindingBasisSchema,
    category: FindingCategorySchema,
    why_it_matters: z.string().max(300),
    reflection_question: z.string().max(250),
    investigation_item: z.string().max(200),
  })
  .strict();
export type ModelFinding = z.infer<typeof ModelFindingSchema>;

export const ModelAnalysisSchema = z
  .object({
    decision_summary: z.string().max(300),
    reasoning_map: z.array(ModelReasoningEntrySchema).max(4),
    findings: z.array(ModelFindingSchema).max(7),
    premortem_questions: z.array(z.string().max(250)).max(3),
    high_stakes_domain: HighStakesDomainSchema,
    closing_note: z.string().max(250),
  })
  .strict();
export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>;

// 3. Server-enriched Analysis & Spans
export interface EvidenceSpan {
  field: "decision" | "reasons" | "context";
  start: number;
  end: number;
  text: string;
}

export interface ReasoningEntry {
  id: string; // r1, r2, ...
  stated_reason: string;
  rests_on: string;
  evidence_given: string | null;
}

export interface Finding {
  id: string; // f1, f2, ...
  type: FindingType;
  title: string;
  observation: string;
  evidence: EvidenceSpan[];
  evidence_paraphrase: string;
  basis: FindingBasis;
  category: FindingCategory;
  why_it_matters: string;
  reflection_question: string;
  investigation_item: string;
}

export interface Analysis {
  decision_summary: string;
  reasoning_map: ReasoningEntry[];
  findings: Finding[];
  premortem_questions: string[];
  high_stakes_domain: HighStakesDomain;
  closing_note: string;
}

// 4. Receipt & Responses
export interface Receipt {
  language_check: "passed";
  findings_total: number;
  findings_grounded: number;
  quotes_dropped: number;
  retried: boolean;
}

export interface AnalyzeResponse {
  analysis: Analysis;
  receipt: Receipt;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// 5. Model-facing OpenAPI JSON Schema for Gemini generateContent
// Note: Keywords rejected by Gemini API ($schema, additionalProperties, length constraints) are omitted.
export const MODEL_FACING_SCHEMA = {
  type: "object",
  description: "Structured exploratory reflection on the user's decision reasoning. Strictly non-directive.",
  properties: {
    decision_summary: {
      type: "string",
      description: "Neutral restatement of what the person is deciding in their own terms",
    },
    reasoning_map: {
      type: "array",
      description: "Up to 4 main reasons given, what each rests on, and any cited support",
      items: {
        type: "object",
        properties: {
          stated_reason: {
            type: "string",
            description: "The explicit reason given by the user",
          },
          rests_on: {
            type: "string",
            description: "The assumption or premise this stated reason quietly depends upon",
          },
          evidence_given: {
            type: "string",
            nullable: true,
            description: "Concrete support cited by the user, or null if none was provided",
          },
        },
        required: ["stated_reason", "rests_on", "evidence_given"],
      },
    },
    findings: {
      type: "array",
      description: "4 to 7 material findings examining assumptions, blind spots, tensions, and questions",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "unstated_assumption",
              "overlooked_factor",
              "internal_tension",
              "missing_information",
              "alternative_perspective",
            ],
            description: "Type of reflection finding",
          },
          title: {
            type: "string",
            description: "Short exploratory title for the finding",
          },
          observation: {
            type: "string",
            description: "Tentative observation about the user's thinking without judgment or directive advice",
          },
          evidence_quotes: {
            type: "array",
            description: "0 to 2 exact verbatim phrases copied character-for-character from the user text",
            items: {
              type: "string",
            },
          },
          evidence_paraphrase: {
            type: "string",
            description: "Neutral paraphrase connecting the finding to the user's situation",
          },
          basis: {
            type: "string",
            enum: ["stated", "inferred", "unknown"],
            description: "stated if supported by verbatim quote, inferred if reasoned reading, unknown if unmentioned",
          },
          category: {
            type: "string",
            enum: [
              "academic",
              "financial",
              "career",
              "wellbeing",
              "relationships",
              "logistics",
              "long_term",
              "other",
            ],
            description: "Contextual category of the finding",
          },
          why_it_matters: {
            type: "string",
            description: "Why examining this specific factor is meaningful for the decision",
          },
          reflection_question: {
            type: "string",
            description: "Open-ended question that cannot be answered with yes or no",
          },
          investigation_item: {
            type: "string",
            description: "A neutral fact, constraint, or viewpoint worth checking, not a decision",
          },
        },
        required: [
          "type",
          "title",
          "observation",
          "evidence_quotes",
          "evidence_paraphrase",
          "basis",
          "category",
          "why_it_matters",
          "reflection_question",
          "investigation_item",
        ],
      },
    },
    premortem_questions: {
      type: "array",
      description: "Exactly 3 premortem questions asking what might contribute if this went badly in 6 months",
      items: {
        type: "string",
      },
    },
    high_stakes_domain: {
      type: "string",
      enum: ["none", "health", "legal", "financial", "immigration", "safety"],
      description: "High-stakes domain flag if applicable, otherwise none",
    },
    closing_note: {
      type: "string",
      description: "One or two sentences reminding the user that the decision is entirely theirs",
    },
  },
  required: [
    "decision_summary",
    "reasoning_map",
    "findings",
    "premortem_questions",
    "high_stakes_domain",
    "closing_note",
  ],
};
