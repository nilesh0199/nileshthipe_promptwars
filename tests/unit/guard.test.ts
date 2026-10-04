import { describe, it, expect } from "vitest";
import { containsDirectiveLanguage } from "@/lib/server/guard";
import type { ModelAnalysis } from "@/lib/schema";

describe("Directive Language Guard (lib/server/guard.ts)", () => {
  const baseCleanAnalysis: ModelAnalysis = {
    decision_summary: "You are considering two potential paths.",
    reasoning_map: [
      {
        stated_reason: "Higher potential salary",
        rests_on: "Assuming living expenses in the new city do not consume the difference",
        evidence_given: "Offer letter mentions 20% increase",
      },
    ],
    findings: [
      {
        type: "overlooked_factor",
        title: "Relocation and living expenses",
        observation: "You may want to consider lease cancellation costs.",
        evidence_quotes: ["Offer letter mentions 20% increase"],
        evidence_paraphrase: "Noted salary advantage without housing budget.",
        basis: "stated",
        category: "financial",
        why_it_matters: "Net savings may differ from nominal gross salary.",
        reflection_question: "What might typical rent look like in the new neighborhood?",
        investigation_item: "Check rental listings near the office location.",
      },
    ],
    premortem_questions: ["What if the commute turns out to be longer than estimated?"],
    high_stakes_domain: "none",
    closing_note: "This decision is entirely yours to make.",
  };

  it("passes clean exploratory non-directive analysis with no flags", () => {
    const flags = containsDirectiveLanguage(baseCleanAnalysis);
    expect(flags).toEqual([]);
  });

  it("detects every registered directive pattern when placed in observation", () => {
    const phraseExamples: Record<string, string> = {
      you_should: "You should accept the higher offer.",
      you_must: "You must decline before the deadline.",
      you_ought_to: "You ought to discuss this with your family.",
      you_need_to: "You need to take immediate action.",
      you_have_to: "You have to consider only tier-1 firms.",
      i_recommend: "I recommend rejecting the position.",
      i_suggest_you: "I suggest you stay in your current role.",
      i_would_suggest: "I would suggest declining the interview.",
      the_best_option: "This is clearly the best option for you.",
      the_best_choice: "Staying put is the best choice.",
      the_right_choice: "Taking this job is the right choice.",
      the_better_option: "The second company is the better option.",
      my_advice: "My advice is to sign the contract now.",
      go_ahead_and: "Go ahead and submit your resignation.",
      dont_do_it: "Don't do it under any circumstances.",
    };

    const requiredCategories = [
      "you_should",
      "you_must",
      "you_ought_to",
      "you_need_to",
      "you_have_to",
      "i_recommend",
      "i_suggest_you",
      "i_would_suggest",
      "the_best_option",
      "the_best_choice",
      "the_right_choice",
      "the_better_option",
      "my_advice",
      "go_ahead_and",
      "dont_do_it",
    ];

    for (const category of requiredCategories) {
      const phrase = phraseExamples[category];
      expect(phrase, `Missing test phrase for category ${category}`).toBeDefined();

      const poisonedAnalysis: ModelAnalysis = {
        ...baseCleanAnalysis,
        findings: [
          {
            ...baseCleanAnalysis.findings[0],
            observation: `Some context. ${phrase}`,
          },
        ],
      };

      const flags = containsDirectiveLanguage(poisonedAnalysis);
      expect(flags).toContain(category);
    }
  });

  it("does NOT flag tentative phrasing such as 'you may need to check' or 'one factor to examine'", () => {
    const tentativeAnalysis: ModelAnalysis = {
      ...baseCleanAnalysis,
      findings: [
        {
          ...baseCleanAnalysis.findings[0],
          observation: "You may need to examine how health benefits compare between roles.",
          why_it_matters: "One factor to examine is whether dental coverage is included.",
        },
      ],
    };

    const flags = containsDirectiveLanguage(tentativeAnalysis);
    expect(flags).toEqual([]);
  });

  it("excludes evidence_quotes from scanning so verbatim user words with advice phrases do not trigger false positives", () => {
    const analysisWithQuotedUserAdvice: ModelAnalysis = {
      ...baseCleanAnalysis,
      findings: [
        {
          ...baseCleanAnalysis.findings[0],
          // User said in their reasons: "My mentor told me: 'You should accept right away'"
          evidence_quotes: ["You should accept right away", "my advice was to move"],
          observation: "You mentioned counsel from your advisor regarding urgency.",
        },
      ],
    };

    const flags = containsDirectiveLanguage(analysisWithQuotedUserAdvice);
    expect(flags).toEqual([]);
  });

  it("scans deeply nested strings across reasoning_map, premortem_questions, and closing_note", () => {
    // 1. In reasoning_map.rests_on
    const poisonedMap: ModelAnalysis = {
      ...baseCleanAnalysis,
      reasoning_map: [
        {
          stated_reason: "Growth",
          rests_on: "You have to prioritize short-term salary above all.",
          evidence_given: null,
        },
      ],
    };
    expect(containsDirectiveLanguage(poisonedMap)).toContain("you_have_to");

    // 2. In premortem_questions
    const poisonedPremortem: ModelAnalysis = {
      ...baseCleanAnalysis,
      premortem_questions: ["What if you realize I recommend something else?"],
    };
    expect(containsDirectiveLanguage(poisonedPremortem)).toContain("i_recommend");

    // 3. In closing_note
    const poisonedClosing: ModelAnalysis = {
      ...baseCleanAnalysis,
      closing_note: "My advice is final.",
    };
    expect(containsDirectiveLanguage(poisonedClosing)).toContain("my_advice");
  });
});
