// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultsView } from "@/components/results/ResultsView";
import type { AnalysisSuccessResponse } from "@/lib/schema";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe("ResultsView & Safe Rendering", () => {
  const sampleData: AnalysisSuccessResponse = {
    kind: "analysis",
    analysis: {
      decision_summary: "Deciding between offer A and current company.",
      reasoning_map: [
        {
          id: "r1",
          stated_reason: "Higher pay",
          rests_on: "Living costs won't rise",
          evidence_given: "20% raise",
        },
      ],
      findings: [
        {
          id: "f1",
          type: "unstated_assumption",
          title: "Career growth velocity",
          observation: "You assume title growth will be faster at the new company.",
          evidence: [
            {
              field: "reasons",
              start: 0,
              end: 10,
              text: "Higher pay",
            },
          ],
          evidence_paraphrase: "Noted compensation advantage.",
          basis: "stated",
          category: "career",
          why_it_matters: "Progression depends on team structure.",
          reflection_question: "How does the promotion cycle work?",
          investigation_item: "Check promotion review intervals.",
        },
        {
          id: "f2",
          type: "overlooked_factor",
          title: "Commute overhead",
          observation: "Commute is longer than expected.",
          evidence: [],
          evidence_paraphrase: "Unstated commute time.",
          basis: "inferred",
          category: "logistics",
          why_it_matters: "Energy affects daily quality of life.",
          reflection_question: "How long is peak travel?",
          investigation_item: "Test commute during rush hour.",
        },
        {
          id: "f3",
          type: "missing_information",
          title: "Health benefit details",
          observation: "Healthcare coverage details are unmentioned.",
          evidence: [],
          evidence_paraphrase: "Benefits unstated.",
          basis: "unknown",
          category: "wellbeing",
          why_it_matters: "Out-of-pocket medical expenses may offset pay.",
          reflection_question: "What is the deductible?",
          investigation_item: "Request benefits booklet from HR.",
        },
      ],
      premortem_questions: ["What if the new team restructures in 3 months?"],
      high_stakes_domain: "none",
      closing_note: "The choice is entirely yours.",
    },
    receipt: {
      language_check: "passed",
      findings_total: 3,
      findings_grounded: 1,
      quotes_dropped: 0,
      retried: false,
    },
    input: {
      decision: "Should I accept the offer?",
      reasons: "Higher pay and better perks.",
      context: "Offer expires next week.",
    },
  };

  const originalInput = {
    decisionType: "career" as const,
    decision: "Should I accept the offer?",
    reasons: "Higher pay and better perks.",
    context: "Offer expires next week.",
    certaintyBefore: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles triage mutual exclusivity and updates live tally", async () => {
    render(
      <ResultsView
        data={sampleData}
        originalInput={originalInput}
        onBackToAnswers={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const user = userEvent.setup();

    // Finding f1: Click "Worth investigating"
    const investigateButtons = screen.getAllByRole("button", { name: /worth investigating/i });
    await user.click(investigateButtons[0]);

    // Live tally updates
    expect(screen.getByText(/You marked/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 triaged/i)).toBeInTheDocument();

    // Switch f1 to "Already considered" (mutual exclusivity)
    const consideredButtons = screen.getAllByRole("button", { name: /already considered/i });
    await user.click(consideredButtons[0]);

    // Investigation count drops to 0, considered count becomes 1
    expect(screen.getByText(/1 of 3 triaged/i)).toBeInTheDocument();
  });

  it("Next steps checklist contains only items triaged as 'Worth investigating'", async () => {
    render(
      <ResultsView
        data={sampleData}
        originalInput={originalInput}
        onBackToAnswers={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const user = userEvent.setup();

    // Mark f1 ("Check promotion review intervals") as investigate
    const investigateButtons = screen.getAllByRole("button", { name: /worth investigating/i });
    await user.click(investigateButtons[0]);

    // Mark f2 as "Already considered"
    const consideredButtons = screen.getAllByRole("button", { name: /already considered/i });
    await user.click(consideredButtons[1]);

    // Navigate to "Next steps" tab
    await user.click(screen.getByRole("tab", { name: /next steps/i }));

    // f1 investigation item must be present
    expect(screen.getByText(/Check promotion review intervals/i)).toBeInTheDocument();

    // f2 investigation item must NOT be in the checklist
    expect(screen.queryByText(/Test commute during rush hour/i)).not.toBeInTheDocument();
  });

  it("In your words tab renders grounded highlights as <mark> elements", async () => {
    render(
      <ResultsView
        data={sampleData}
        originalInput={originalInput}
        onBackToAnswers={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const user = userEvent.setup();

    // Navigate to "In your words" tab
    await user.click(screen.getByRole("tab", { name: /in your words/i }));

    // Find <mark> elements
    const markElement = document.querySelector("mark");
    expect(markElement).toBeInTheDocument();
    expect(markElement?.textContent).toContain("Higher pay");
  });

  it("displays correct labels for 'inferred' and 'unknown' basis badges", () => {
    render(
      <ResultsView
        data={sampleData}
        originalInput={originalInput}
        onBackToAnswers={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    // f2 has basis 'inferred' -> displays "Inferred perspective"
    expect(screen.getByText(/Inferred perspective/i)).toBeInTheDocument();

    // f3 has basis 'unknown' -> displays "Unstated factor"
    expect(screen.getByText(/Unstated factor/i)).toBeInTheDocument();
  });

  it("safely escapes HTML tags in findings and quotes without executing scripts or injecting elements", () => {
    const maliciousData: AnalysisSuccessResponse = {
      ...sampleData,
      analysis: {
        ...sampleData.analysis,
        findings: [
          {
            ...sampleData.analysis.findings[0],
            title: "<script>alert('xss')</script> Malicious Title",
            observation: "<img src=x onerror=alert('xss')> Dangerous Image Observation",
            why_it_matters: "<b>Bold text injection</b>",
          },
        ],
      },
    };

    render(
      <ResultsView
        data={maliciousData}
        originalInput={originalInput}
        onBackToAnswers={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    // Assert literal text is rendered visibly as plain text
    expect(screen.getByText(/<script>alert\('xss'\)<\/script>/i)).toBeInTheDocument();
    expect(screen.getByText(/<img src=x onerror=alert\('xss'\)>/i)).toBeInTheDocument();

    // Assert that NO actual <script> or <img> DOM elements were created in the document body
    expect(document.querySelector("script[src*='alert']")).toBeNull();
    expect(document.querySelector("img[onerror*='alert']")).toBeNull();
  });
});
