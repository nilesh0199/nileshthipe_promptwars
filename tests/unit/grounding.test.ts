import { describe, it, expect } from "vitest";
import { groundFindings } from "@/lib/server/grounding";
import type { ModelAnalysis, AnalyzeRequest } from "@/lib/schema";

describe("Grounding Engine (lib/server/grounding.ts)", () => {
  const userInput: AnalyzeRequest = {
    decisionType: "career",
    decision: "Should I accept the senior developer offer in Pune?",
    reasons: "The salary is 40% higher, but my current team is supportive. I also worry about a 90-minute commute.",
    context: "My partner works remotely from our current home.",
  };

  const baseAnalysis: ModelAnalysis = {
    decision_summary: "You are deciding whether to accept a senior developer offer in Pune.",
    reasoning_map: [
      {
        stated_reason: "Salary is 40% higher",
        rests_on: "Assuming costs remain balanced",
        evidence_given: "40% higher",
      },
      {
        stated_reason: "Current team is supportive",
        rests_on: "Culture matters for long-term tenure",
        evidence_given: null,
      },
    ],
    findings: [
      {
        type: "internal_tension",
        title: "Salary vs Team Support",
        observation: "You note competing priorities between financial gain and team culture.",
        evidence_quotes: ["salary is 40% higher", "current team is supportive"],
        evidence_paraphrase: "Highlighted compensation and culture.",
        basis: "stated",
        category: "career",
        why_it_matters: "Financial upside can sometimes be counterbalanced by work environment.",
        reflection_question: "How important is daily team rapport compared to compensation?",
        investigation_item: "Evaluate team culture at the offering company.",
      },
    ],
    premortem_questions: ["What if the commute causes burnout?"],
    high_stakes_domain: "none",
    closing_note: "The decision remains yours.",
  };

  it("grounds exact quotes across fields and slices back to exact text", () => {
    const { findings, quotesDropped } = groundFindings(baseAnalysis, userInput);

    expect(quotesDropped).toBe(0);
    expect(findings.length).toBe(1);
    const f1 = findings[0];
    expect(f1.evidence.length).toBe(2);

    // Verify first span in reasons
    const span1 = f1.evidence[0];
    expect(span1.field).toBe("reasons");
    expect(userInput.reasons.slice(span1.start, span1.end)).toBe(span1.text);
    expect(span1.text).toBe("salary is 40% higher");

    // Verify second span in reasons
    const span2 = f1.evidence[1];
    expect(span2.field).toBe("reasons");
    expect(userInput.reasons.slice(span2.start, span2.end)).toBe(span2.text);
    expect(span2.text).toBe("current team is supportive");
  });

  it("verifies quotes in context and decision fields accurately", () => {
    const analysisWithAllFields: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          evidence_quotes: [
            "senior developer offer in Pune", // In decision
            "partner works remotely", // In context
          ],
        },
      ],
    };

    const { findings } = groundFindings(analysisWithAllFields, userInput);
    const f = findings[0];
    expect(f.evidence.length).toBe(2);

    expect(f.evidence[0].field).toBe("decision");
    expect(userInput.decision.slice(f.evidence[0].start, f.evidence[0].end)).toBe("senior developer offer in Pune");

    expect(f.evidence[1].field).toBe("context");
    expect(userInput.context.slice(f.evidence[1].start, f.evidence[1].end)).toBe("partner works remotely");
  });

  it("normalises case, multiple whitespace, curly quotes, and dashes", () => {
    const inputWithPunctuation: AnalyzeRequest = {
      decisionType: "life",
      decision: "Choosing between two directions",
      reasons: 'I am weighing "long—term" growth versus a friend’s advice.',
      context: "",
    };

    const analysisWithVariedQuote: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          // Model returned plain hyphen, straight quotes, lowercase
          evidence_quotes: ['"long-term" growth', "friend's advice"],
        },
      ],
    };

    const { findings, quotesDropped } = groundFindings(analysisWithVariedQuote, inputWithPunctuation);
    expect(quotesDropped).toBe(0);
    const spans = findings[0].evidence;
    expect(spans.length).toBe(2);

    // Slices exactly match original text with original punctuation preserved
    expect(inputWithPunctuation.reasons.slice(spans[0].start, spans[0].end)).toBe(spans[0].text);
    expect(inputWithPunctuation.reasons.slice(spans[1].start, spans[1].end)).toBe(spans[1].text);
  });

  it("grounds non-Latin international text (Hindi and Marathi)", () => {
    const hindiMarathiInput: AnalyzeRequest = {
      decisionType: "study",
      decision: "उच्च शिक्षणासाठी परदेशी जावे का?", // Marathi
      reasons: "माझ्या कुटुंबाला माझी काळजी वाटते आणि आर्थिक भार मोठा आहे.", // Marathi + Hindi script
      context: "शिष्यवृत्ती उपलब्ध होण्याची शक्यता आहे.",
    };

    const multiLingualAnalysis: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          evidence_quotes: [
            "परदेशी जावे का?",
            "आर्थिक भार मोठा आहे",
            "शिष्यवृत्ती उपलब्ध होण्याची शक्यता",
          ],
        },
      ],
    };

    const { findings, quotesDropped } = groundFindings(multiLingualAnalysis, hindiMarathiInput);
    expect(quotesDropped).toBe(0);
    expect(findings[0].evidence.length).toBe(3);

    expect(findings[0].evidence[0].field).toBe("decision");
    expect(findings[0].evidence[0].text).toBe("परदेशी जावे का?");

    expect(findings[0].evidence[1].field).toBe("reasons");
    expect(findings[0].evidence[1].text).toBe("आर्थिक भार मोठा आहे");

    expect(findings[0].evidence[2].field).toBe("context");
    expect(findings[0].evidence[2].text).toBe("शिष्यवृत्ती उपलब्ध होण्याची शक्यता");
  });

  it("drops quotes that do not appear in any user field and tallies quotesDropped", () => {
    const hallucinatedAnalysis: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          evidence_quotes: [
            "totally fabricated quote never said",
            "salary is 40% higher",
            "another imaginary statement",
          ],
        },
      ],
    };

    const { findings, quotesDropped } = groundFindings(hallucinatedAnalysis, userInput);
    expect(quotesDropped).toBe(2);
    expect(findings[0].evidence.length).toBe(1);
    expect(findings[0].evidence[0].text).toBe("salary is 40% higher");
  });

  it("downgrades 'stated' finding to 'inferred' when all evidence quotes are dropped", () => {
    const fullyUnfoundedAnalysis: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          basis: "stated",
          evidence_quotes: ["hallucination not found anywhere in input"],
        },
      ],
    };

    const { findings, quotesDropped } = groundFindings(fullyUnfoundedAnalysis, userInput);
    expect(quotesDropped).toBe(1);
    expect(findings[0].evidence.length).toBe(0);
    expect(findings[0].basis).toBe("inferred");
  });

  it("assigns sequential IDs (r1, r2, ... for reasoning map and f1, f2, ... for findings)", () => {
    const multipleItemsAnalysis: ModelAnalysis = {
      ...baseAnalysis,
      reasoning_map: [
        { stated_reason: "Reason 1", rests_on: "P1", evidence_given: null },
        { stated_reason: "Reason 2", rests_on: "P2", evidence_given: null },
        { stated_reason: "Reason 3", rests_on: "P3", evidence_given: null },
      ],
      findings: [
        { ...baseAnalysis.findings[0], title: "Finding 1" },
        { ...baseAnalysis.findings[0], title: "Finding 2" },
      ],
    };

    const { reasoningMap, findings } = groundFindings(multipleItemsAnalysis, userInput);

    expect(reasoningMap.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    expect(findings.map((f) => f.id)).toEqual(["f1", "f2"]);
  });

  it("handles empty/malformed quotes, quotes < 4 characters, and preserves non-stated basis", () => {
    const edgeAnalysis: ModelAnalysis = {
      ...baseAnalysis,
      findings: [
        {
          ...baseAnalysis.findings[0],
          basis: "inferred",
          evidence_quotes: [
            null as unknown as string,
            "",
            "   ",
            "abc", // < 4 chars
            '...“salary is 40% higher”...', // wrapped in ellipses and quotes
          ],
        },
      ],
    };

    const { findings, quotesDropped } = groundFindings(edgeAnalysis, userInput);
    expect(quotesDropped).toBe(4); // 4 invalid quotes dropped
    expect(findings[0].evidence.length).toBe(1);
    expect(findings[0].evidence[0].text).toBe("salary is 40% higher");
    expect(findings[0].basis).toBe("inferred"); // Basis preserved as inferred
  });
});
