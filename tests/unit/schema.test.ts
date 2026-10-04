import { describe, it, expect } from "vitest";
import {
  AnalyzeRequestSchema,
  ModelAnalysisSchema,
  type ModelAnalysis,
} from "@/lib/schema";
import { LIMITS } from "@/lib/limits";

describe("AnalyzeRequestSchema", () => {
  const validPayload = {
    decisionType: "career" as const,
    decision: "Should I accept this six-month internship?",
    reasons: "Good stipend and industry experience close to home.",
    context: "Balancing with final semester classes.",
  };

  it("accepts valid input within allowed limits", () => {
    const result = AnalyzeRequestSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("passes at limit boundary and fails at one character over boundary for decision", () => {
    const atLimit = {
      ...validPayload,
      decision: "a".repeat(LIMITS.decision.max),
    };
    expect(AnalyzeRequestSchema.safeParse(atLimit).success).toBe(true);

    const overLimit = {
      ...validPayload,
      decision: "a".repeat(LIMITS.decision.max + 1),
    };
    expect(AnalyzeRequestSchema.safeParse(overLimit).success).toBe(false);
  });

  it("passes at limit boundary and fails at one character over boundary for reasons", () => {
    const atLimit = {
      ...validPayload,
      reasons: "b".repeat(LIMITS.reasons.max),
    };
    expect(AnalyzeRequestSchema.safeParse(atLimit).success).toBe(true);

    const overLimit = {
      ...validPayload,
      reasons: "b".repeat(LIMITS.reasons.max + 1),
    };
    expect(AnalyzeRequestSchema.safeParse(overLimit).success).toBe(false);
  });

  it("passes at limit boundary and fails at one character over boundary for context", () => {
    const atLimit = {
      ...validPayload,
      context: "c".repeat(LIMITS.context.max),
    };
    expect(AnalyzeRequestSchema.safeParse(atLimit).success).toBe(true);

    const overLimit = {
      ...validPayload,
      context: "c".repeat(LIMITS.context.max + 1),
    };
    expect(AnalyzeRequestSchema.safeParse(overLimit).success).toBe(false);
  });

  it("rejects whitespace-only required fields", () => {
    const wsDecision = { ...validPayload, decision: "     " };
    expect(AnalyzeRequestSchema.safeParse(wsDecision).success).toBe(false);

    const wsReasons = { ...validPayload, reasons: "\t \n " };
    expect(AnalyzeRequestSchema.safeParse(wsReasons).success).toBe(false);
  });

  it("strictly rejects certaintyBefore field", () => {
    const withCertainty = {
      ...validPayload,
      certaintyBefore: 4,
    };
    const result = AnalyzeRequestSchema.safeParse(withCertainty);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.code === "unrecognized_keys")).toBe(true);
    }
  });

  it("strictly rejects unknown keys", () => {
    const withUnknown = {
      ...validPayload,
      customNote: "malicious inject",
    };
    const result = AnalyzeRequestSchema.safeParse(withUnknown);
    expect(result.success).toBe(false);
  });
});

describe("ModelAnalysisSchema", () => {
  const validModelAnalysis: ModelAnalysis = {
    decision_summary: "You are deciding whether to accept a six-month internship.",
    reasoning_map: [
      {
        stated_reason: "Good stipend",
        rests_on: "Assuming travel costs do not exceed compensation",
        evidence_given: "Stipend is good",
      },
    ],
    findings: [
      {
        type: "unstated_assumption",
        title: "Internship conversion likelihood",
        observation: "You may be assuming this role easily leads to a full-time position.",
        evidence_quotes: ["Good stipend"],
        evidence_paraphrase: "You noted the financial benefit.",
        basis: "stated",
        category: "career",
        why_it_matters: "Early career expectations impact satisfaction.",
        reflection_question: "What has the historical conversion rate been for interns?",
        investigation_item: "Ask past interns about conversion frequency.",
      },
    ],
    premortem_questions: [
      "What if coursework demands spike during peak project weeks?",
    ],
    high_stakes_domain: "none",
    closing_note: "The choice between immediate experience and academics is yours.",
  };

  it("accepts a well-formed exploratory analysis", () => {
    const result = ModelAnalysisSchema.safeParse(validModelAnalysis);
    expect(result.success).toBe(true);
  });

  it("strictly rejects forbidden directive fields (recommendation, verdict, score, ranking, confidence, best_option)", () => {
    const forbiddenFields = [
      "recommendation",
      "verdict",
      "score",
      "ranking",
      "confidence",
      "best_option",
    ];

    for (const field of forbiddenFields) {
      const poisoned = {
        ...validModelAnalysis,
        [field]: "Take the internship",
      };
      const result = ModelAnalysisSchema.safeParse(poisoned);
      expect(result.success).toBe(false);
    }
  });

  it("enforces maximum array bounds (reasoning_map max 4, findings max 7, premortem max 3)", () => {
    // reasoning_map > 4
    const overReasons = {
      ...validModelAnalysis,
      reasoning_map: Array(5).fill(validModelAnalysis.reasoning_map[0]),
    };
    expect(ModelAnalysisSchema.safeParse(overReasons).success).toBe(false);

    // findings > 7
    const overFindings = {
      ...validModelAnalysis,
      findings: Array(8).fill(validModelAnalysis.findings[0]),
    };
    expect(ModelAnalysisSchema.safeParse(overFindings).success).toBe(false);

    // premortem_questions > 3
    const overPremortem = {
      ...validModelAnalysis,
      premortem_questions: Array(4).fill("What if the company restructures?"),
    };
    expect(ModelAnalysisSchema.safeParse(overPremortem).success).toBe(false);
  });
});
