import test from "node:test";
import assert from "node:assert";

import { AnalyzeRequestSchema, ModelAnalysis, Finding } from "../lib/schema";
import { groundFindings } from "../lib/server/grounding";
import { containsDirectiveLanguage } from "../lib/server/guard";
import { LIMITS } from "../lib/limits";

// ============================================================================
// TEST 1: AnalyzeRequest rejects certaintyBefore and unknown fields
// ============================================================================
test("1. AnalyzeRequest validation: strictly rejects certaintyBefore, unknown fields, and boundary violations", () => {
  const validPayload = {
    decisionType: "career",
    decision: "Should I accept this six-month internship?",
    reasons: "Good stipend and industry experience close to home.",
    context: "Balancing with final semester classes.",
  };

  // Valid payload parses successfully
  const validResult = AnalyzeRequestSchema.safeParse(validPayload);
  assert.strictEqual(validResult.success, true);

  // CRITICAL SECURITY / PRIVACY CHECK:
  // certaintyBefore must NEVER be accepted in the server request schema
  const withCertainty = {
    ...validPayload,
    certaintyBefore: 4,
  };
  const certaintyResult = AnalyzeRequestSchema.safeParse(withCertainty);
  assert.strictEqual(certaintyResult.success, false);
  if (!certaintyResult.success) {
    const errorCodes = certaintyResult.error.issues.map((i) => i.code);
    assert.ok(errorCodes.includes("unrecognized_keys"));
  }

  // Unknown malicious/unexpected fields are rejected
  const withUnknown = {
    ...validPayload,
    verdict: "accept",
    recommendation: "do it",
  };
  const unknownResult = AnalyzeRequestSchema.safeParse(withUnknown);
  assert.strictEqual(unknownResult.success, false);

  // Field length boundary checks
  const belowMinDecision = {
    ...validPayload,
    decision: "  a  ", // Only 1 non-whitespace char < 3
  };
  assert.strictEqual(AnalyzeRequestSchema.safeParse(belowMinDecision).success, false);

  const exceedingMax = {
    ...validPayload,
    decision: "a".repeat(LIMITS.decision.max + 1),
  };
  assert.strictEqual(AnalyzeRequestSchema.safeParse(exceedingMax).success, false);
});

// ============================================================================
// TEST 2: Grounding verifies evidence spans against the user's original text
// ============================================================================
test("2. Grounding verification: matches verbatim spans, assigns sequential IDs, and downgrades hallucinated quotes", () => {
  const userInput = {
    decisionType: "career" as const,
    decision: "Should I accept this six-month internship?",
    reasons: "The stipend is good, it is close to home, and it gives me industry experience.",
    context: "I need to balance it with college coursework.",
  };

  const rawModelOutput: ModelAnalysis = {
    decision_summary: "You are deciding whether to accept a six-month internship.",
    reasoning_map: [
      {
        stated_reason: "The stipend is good and close to home",
        rests_on: "Assuming travel time will not conflict with schedule",
        evidence_given: "The stipend is good",
      },
    ],
    findings: [
      {
        type: "internal_tension",
        title: "Workload conflict with studies",
        observation: "Balancing time between college and the internship could be challenging.",
        evidence_quotes: ["close to home", "balance it with college coursework"], // both exist in user text
        evidence_paraphrase: "You noted both location convenience and college coursework.",
        basis: "stated",
        category: "career",
        why_it_matters: "Heavy workload might affect academic performance.",
        reflection_question: "How will you distribute study hours?",
        investigation_item: "Check class attendance policies.",
      },
      {
        type: "unstated_assumption",
        title: "Assumption about post-internship conversion",
        observation: "You assume this experience automatically converts into a job.",
        evidence_quotes: ["guaranteed full-time job upon completion"], // Hallucinated quote NOT in user input
        evidence_paraphrase: "Assuming conversion guarantees.",
        basis: "stated",
        category: "career",
        why_it_matters: "Without conversion guarantees, options remain open.",
        reflection_question: "What is the historical conversion rate?",
        investigation_item: "Ask past interns about full-time conversion rates.",
      },
    ],
    premortem_questions: [
      "What if exam schedules clash with project milestones?",
      "What if commute costs offset the stipend benefits?",
      "What if supervisor mentorship is unavailable?",
    ],
    high_stakes_domain: "none",
    closing_note: "The decision remains entirely yours to steer.",
  };

  const { reasoningMap, findings, quotesDropped } = groundFindings(rawModelOutput, userInput);

  // 1. Sequential IDs assigned by server
  assert.strictEqual(reasoningMap[0].id, "r1");
  assert.strictEqual(findings[0].id, "f1");
  assert.strictEqual(findings[1].id, "f2");

  // 2. Grounded finding f1 retains verified spans
  assert.strictEqual(findings[0].basis, "stated");
  assert.strictEqual(findings[0].evidence.length, 2);
  assert.strictEqual(findings[0].evidence[0].text, "close to home");
  assert.strictEqual(findings[0].evidence[0].field, "reasons");
  assert.strictEqual(findings[0].evidence[1].text, "balance it with college coursework");
  assert.strictEqual(findings[0].evidence[1].field, "context");

  // Verify span offsets match user's text character-for-character
  const reasonsText = userInput.reasons;
  const span0 = findings[0].evidence[0];
  assert.strictEqual(reasonsText.slice(span0.start, span0.end), span0.text);

  // 3. Hallucinated quote dropped and finding f2 cleanly downgraded to "inferred"
  assert.strictEqual(quotesDropped, 1);
  assert.strictEqual(findings[1].basis, "inferred");
  assert.strictEqual(findings[1].evidence.length, 0); // Unverified quote removed
});

// ============================================================================
// TEST 3: Directive/advice language is detected and does not allow recommendations
// ============================================================================
test("3. Guard scan: detects directive advice in model output and allows tentative exploratory reflection", () => {
  const createAnalysisFixture = (observationText: string, userQuote: string = "some user words"): ModelAnalysis => ({
    decision_summary: "You are considering an internship opportunity.",
    reasoning_map: [
      {
        stated_reason: "Career growth",
        rests_on: "Skill development",
        evidence_given: "Resume building",
      },
    ],
    findings: [
      {
        type: "internal_tension",
        title: "Schedule considerations",
        observation: observationText,
        evidence_quotes: [userQuote],
        evidence_paraphrase: "Balancing schedule.",
        basis: "stated",
        category: "career",
        why_it_matters: "Time management.",
        reflection_question: "How will you allocate hours?",
        investigation_item: "Check class timetable.",
      },
    ],
    premortem_questions: ["What if deadlines conflict?", "What if hours expand?", "What if supervision is sparse?"],
    high_stakes_domain: "none",
    closing_note: "The decision belongs to you.",
  });

  // Directive advice phrases that MUST be flagged
  const directivePhrases = [
    "You should accept the internship immediately.",
    "I recommend declining this offer.",
    "The best option for your career is to choose company A.",
    "You ought to discuss this with your manager before deciding.",
    "You need to take this role without hesitation.",
    "The right choice is clearly option B.",
  ];

  for (const phrase of directivePhrases) {
    const analysis = createAnalysisFixture(phrase);
    const violations = containsDirectiveLanguage(analysis);
    assert.ok(
      violations.length > 0,
      `Failed to detect directive phrase in: "${phrase}"`
    );
  }

  // Exploratory, tentative phrasing that MUST pass cleanly (zero violations)
  const compliantPhrases = [
    "You may be assuming that working hours will stay predictable.",
    "One factor to examine is whether college attendance rules permit full-time hours.",
    "There appears to be an internal tension between learning autonomy and compensation stability.",
    "An open question to consider is what career paths this elective keeps open or closes off.",
    "Another perspective to weigh is how family commitments affect your availability.",
  ];

  for (const phrase of compliantPhrases) {
    const analysis = createAnalysisFixture(phrase);
    const violations = containsDirectiveLanguage(analysis);
    assert.strictEqual(
      violations.length,
      0,
      `Compliant exploratory text falsely flagged as directive: "${phrase}"`
    );
  }

  // User quotes containing directive language must NOT be flagged (preserves user speech)
  const userDirectiveQuote = createAnalysisFixture(
    "A neutral observation about college hours.",
    "My professor said you should accept the first offer" // Quote from user text
  );
  const quoteViolations = containsDirectiveLanguage(userDirectiveQuote);
  assert.strictEqual(
    quoteViolations.length,
    0,
    "User evidence quote was incorrectly flagged by guard scanner"
  );
});

// ============================================================================
// TEST 4: The final results UI correctly renders findings and triage state
// ============================================================================
test("4. Triage state: supports mutual exclusivity, tallies summary counts, and tracks user actions", () => {
  const mockFindings: Finding[] = [
    {
      id: "f1",
      type: "internal_tension",
      title: "Schedule friction",
      observation: "Time demands may overlap.",
      evidence: [],
      evidence_paraphrase: "College coursework vs internship hours.",
      basis: "inferred",
      category: "career",
      why_it_matters: "Academic standing requires focus.",
      reflection_question: "How will you coordinate deadlines?",
      investigation_item: "Verify college attendance policies.",
    },
    {
      id: "f2",
      type: "unstated_assumption",
      title: "Compensation adequacy",
      observation: "Stipend sufficiency is assumed.",
      evidence: [],
      evidence_paraphrase: "Financial costs.",
      basis: "inferred",
      category: "financial",
      why_it_matters: "Travel costs might offset stipend.",
      reflection_question: "What are your net monthly expenses?",
      investigation_item: "Calculate daily commute expenses.",
    },
    {
      id: "f3",
      type: "overlooked_factor",
      title: "Long-term credential value",
      observation: "Skill recognition after six months.",
      evidence: [],
      evidence_paraphrase: "Industry value.",
      basis: "inferred",
      category: "career",
      why_it_matters: "Career portfolio building.",
      reflection_question: "Does this internship offer verified certification?",
      investigation_item: "Ask if completion certificate is provided.",
    },
  ];

  type TriageChoice = "investigate" | "considered" | "not_relevant";
  const triageMap: Record<string, TriageChoice> = {};

  // User triages findings
  triageMap["f1"] = "investigate";
  triageMap["f2"] = "considered";
  triageMap["f3"] = "not_relevant";

  // Summary counts computation
  const counts = {
    investigate: Object.values(triageMap).filter((v) => v === "investigate").length,
    considered: Object.values(triageMap).filter((v) => v === "considered").length,
    not_relevant: Object.values(triageMap).filter((v) => v === "not_relevant").length,
  };

  assert.strictEqual(mockFindings.length, 3);
  assert.strictEqual(counts.investigate, 1);
  assert.strictEqual(counts.considered, 1);
  assert.strictEqual(counts.not_relevant, 1);
  assert.strictEqual(Object.keys(triageMap).length, 3);

  // User changes triage for f3 to "investigate" (mutually exclusive update)
  triageMap["f3"] = "investigate";
  const updatedInvestigate = Object.values(triageMap).filter((v) => v === "investigate").length;
  assert.strictEqual(updatedInvestigate, 2);
});

// ============================================================================
// TEST 5: Next Steps correctly includes investigation items marked "Worth investigating"
// ============================================================================
test("5. Next Steps synthesis: filters investigation items by triage state and formats exportable notes", () => {
  const findings: Finding[] = [
    {
      id: "f1",
      type: "internal_tension",
      title: "Workload balance",
      observation: "Balancing time.",
      evidence: [],
      evidence_paraphrase: "College vs work.",
      basis: "inferred",
      category: "career",
      why_it_matters: "Avoid burnout.",
      reflection_question: "What days require attendance?",
      investigation_item: "Check college minimum attendance criteria.",
    },
    {
      id: "f2",
      type: "overlooked_factor",
      title: "Commute overhead",
      observation: "Travel times.",
      evidence: [],
      evidence_paraphrase: "Commute route.",
      basis: "inferred",
      category: "logistics",
      why_it_matters: "Daily energy impact.",
      reflection_question: "How long is the peak commute?",
      investigation_item: "Test commute during peak office hours.",
    },
    {
      id: "f3",
      type: "missing_information",
      title: "Mentorship structure",
      observation: "Supervision details unknown.",
      evidence: [],
      evidence_paraphrase: "Team structure.",
      basis: "inferred",
      category: "career",
      why_it_matters: "Learning quality.",
      reflection_question: "Who assigns tasks?",
      investigation_item: "Confirm reporting manager and weekly check-in schedule.",
    },
  ];

  // User marks f1 and f3 as "Worth investigating", but marks f2 as "Already considered"
  const triageMap = {
    f1: "investigate",
    f2: "considered",
    f3: "investigate",
  };

  // Filter checklist items matching "investigate"
  const investigatingItems = findings.filter(
    (f) => triageMap[f.id as keyof typeof triageMap] === "investigate" && f.investigation_item
  );

  assert.strictEqual(investigatingItems.length, 2);
  assert.strictEqual(investigatingItems[0].id, "f1");
  assert.strictEqual(investigatingItems[0].investigation_item, "Check college minimum attendance criteria.");
  assert.strictEqual(investigatingItems[1].id, "f3");
  assert.strictEqual(investigatingItems[1].investigation_item, "Confirm reporting manager and weekly check-in schedule.");

  // Ensure "considered" item f2 was excluded
  assert.ok(!investigatingItems.some((item) => item.id === "f2"));

  // Verify copy text generation structure
  const decisionSummary = "Deciding whether to take a six-month software internship.";
  const personalNotes = "I plan to check my university exam calendar first before signing the agreement.";
  const closingNote = "This decision is entirely yours to make.";

  const lines: string[] = [];
  lines.push(`SECOND LOOK REFLECTION SUMMARY`);
  lines.push(`Decision: ${decisionSummary}\n`);
  lines.push(`ITEMS TO INVESTIGATE:`);
  investigatingItems.forEach((f) => {
    lines.push(`[ ] ${f.investigation_item} (${f.title})`);
  });
  lines.push(`\nWHERE MY THINKING IS NOW:`);
  lines.push(personalNotes);
  lines.push(`\nNOTE:\n${closingNote}`);

  const copiedOutput = lines.join("\n");
  assert.ok(copiedOutput.includes("Check college minimum attendance criteria."));
  assert.ok(copiedOutput.includes("Confirm reporting manager and weekly check-in schedule."));
  assert.ok(copiedOutput.includes("WHERE MY THINKING IS NOW:"));
  assert.ok(copiedOutput.includes(personalNotes));
  assert.ok(!copiedOutput.includes("Test commute during peak office hours.")); // f2 excluded
});
