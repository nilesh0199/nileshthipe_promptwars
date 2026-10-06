// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResultsView } from "@/components/results/ResultsView";
import { Workspace } from "@/components/Workspace";
import { AuthProvider } from "@/components/auth/AuthProvider";
import type { AnalysisSuccessResponse } from "@/lib/schema";

vi.mock("@/components/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const mockSampleData: AnalysisSuccessResponse = {
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
        investigation_item: "Ask about review cycles and median tenure before promotion.",
      },
      {
        id: "f2",
        type: "overlooked_factor",
        title: "Commute friction",
        observation: "Commute overhead is unaddressed in the reasoning.",
        evidence: [],
        evidence_paraphrase: "No commute details provided.",
        basis: "inferred",
        category: "logistics",
        why_it_matters: "A 90-minute daily commute erodes work-life balance.",
        reflection_question: "How will daily travel affect evening obligations?",
        investigation_item: "Do a trial run during peak morning rush hour.",
      },
    ],
    premortem_questions: ["What if the team restructures within 90 days?"],
    high_stakes_domain: "none",
    closing_note: "The decision is entirely yours to make.",
  },
  receipt: {
    language_check: "passed",
    findings_total: 2,
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

const mockOriginalInput = {
  decisionType: "career" as const,
  decision: "Should I accept the offer?",
  reasons: "Higher pay and better perks.",
  context: "Offer expires next week.",
  certaintyBefore: 3,
};

describe("Phase 9: Results Redesign & Reliability Integration", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  describe("Single-Flight Submission Guard in Workspace", () => {
    it("rapid double clicks on submit do not trigger duplicate calls to /api/analyze", async () => {
      const fetchMock = vi.fn().mockImplementation(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockSampleData,
            });
          }, 150);
        })
      );
      global.fetch = fetchMock;

      render(
        <AuthProvider>
          <Workspace onExit={vi.fn()} />
        </AuthProvider>
      );

      const user = userEvent.setup();

      // Click "Use an example" to quickly fill state and jump to decision screen
      await user.click(screen.getByRole("button", { name: /use an example/i }));

      // Advance through decision and reasons
      await user.click(screen.getByRole("button", { name: /^continue$/i })); // decision
      await user.click(screen.getByRole("button", { name: /^continue$/i })); // reasons

      // Context screen: submit button
      const submitBtn = screen.getByRole("button", { name: /show me another perspective/i });

      // Rapidly fire two clicks on the submit button
      await Promise.all([
        user.click(submitBtn),
        user.click(submitBtn),
      ]);

      // Assert fetch was called exactly once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Compact FindingCard & Expandable Details", () => {
    it("renders compact card with title, basis tag, observation, and 3 triage buttons", () => {
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Title
      expect(screen.getByText("Career growth velocity")).toBeInTheDocument();
      // Basis tag
      expect(screen.getByText("Based on your words")).toBeInTheDocument();
      // Observation
      expect(screen.getByText(/You assume title growth will be faster/i)).toBeInTheDocument();

      // 3 triage buttons
      const investigateBtns = screen.getAllByRole("button", { name: /worth investigating/i });
      const consideredBtns = screen.getAllByRole("button", { name: /already considered/i });
      const notRelevantBtns = screen.getAllByRole("button", { name: /not relevant/i });

      expect(investigateBtns).toHaveLength(2);
      expect(consideredBtns).toHaveLength(2);
      expect(notRelevantBtns).toHaveLength(2);
    });

    it("toggles card details with expand button and aria-expanded", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const expandBtns = screen.getAllByRole("button", { name: /details/i });
      const firstExpandBtn = expandBtns[0];
      expect(firstExpandBtn).toHaveAttribute("aria-expanded", "false");

      // Click to expand
      await user.click(firstExpandBtn);
      expect(firstExpandBtn).toHaveAttribute("aria-expanded", "true");

      // Detailed sections are revealed
      expect(screen.getByText("Why it matters")).toBeInTheDocument();
      expect(screen.getByText("Progression depends on team structure.")).toBeInTheDocument();
      expect(screen.getByText("A question to sit with")).toBeInTheDocument();
      expect(screen.getByText(/How does the promotion cycle work\?/i)).toBeInTheDocument();
      expect(screen.getByText("What you could check")).toBeInTheDocument();
      expect(screen.getByText("Ask about review cycles and median tenure before promotion.")).toBeInTheDocument();

      // Click to collapse
      await user.click(firstExpandBtn);
      expect(firstExpandBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("clicking 'View highlighted in text' switches to 'Your words' tab", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Expand first card
      const expandBtns = screen.getAllByRole("button", { name: /details/i });
      await user.click(expandBtns[0]);

      // Click "View highlighted in text"
      const viewHighlightLink = screen.getByRole("button", { name: /view highlighted in text/i });
      await user.click(viewHighlightLink);

      // Active tab should now be "Your words"
      const wordsTab = screen.getByRole("tab", { name: /your words/i });
      expect(wordsTab).toHaveAttribute("aria-selected", "true");
    });

    it("desktop results tab bar is positioned sticky top-16 with solid background directly under header", () => {
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          isMobileView={false}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const tablist = screen.getByRole("tablist", { name: /analysis sections/i });
      const tabContainer = tablist.parentElement;
      expect(tabContainer).toBeInTheDocument();
      expect(tabContainer?.className).toContain("sticky");
      expect(tabContainer?.className).toContain("top-16");
      expect(tabContainer?.className).toContain("bg-[#faf8f5]");
      expect(tabContainer?.className).toContain("border-b");
    });
  });

  describe("Filter Chips & Mobile Select", () => {
    it("desktop filter chips show non-zero counts and filter visible findings", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Check chips rendered
      const allChip = screen.getByRole("button", { name: /all \(2\)/i });
      const assumptionsChip = screen.getByRole("button", { name: /assumptions \(1\)/i });
      const overlookedChip = screen.getByRole("button", { name: /overlooked factors \(1\)/i });

      expect(allChip).toHaveAttribute("aria-pressed", "true");
      expect(assumptionsChip).toHaveAttribute("aria-pressed", "false");
      expect(overlookedChip).toHaveAttribute("aria-pressed", "false");

      // Filter by assumptions
      await user.click(assumptionsChip);
      expect(assumptionsChip).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Career growth velocity")).toBeInTheDocument();
      expect(screen.queryByText("Commute friction")).not.toBeInTheDocument();

      // Filter by overlooked
      await user.click(overlookedChip);
      expect(overlookedChip).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByText("Career growth velocity")).not.toBeInTheDocument();
      expect(screen.getByText("Commute friction")).toBeInTheDocument();
    });

    it("mobile select dropdown filters visible findings", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const select = screen.getByRole("combobox", { name: /show:/i });
      expect(select).toBeInTheDocument();

      // Change selection to "overlooked_factor"
      await user.selectOptions(select, "overlooked_factor");
      expect(screen.queryByText("Career growth velocity")).not.toBeInTheDocument();
      expect(screen.getByText("Commute friction")).toBeInTheDocument();
    });
  });

  describe("Next Steps Checklist & Empty State", () => {
    it("renders numbered <ol> checklist with finding titles for items marked 'Worth investigating'", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Mark f1 as Worth investigating
      const investigateBtns = screen.getAllByRole("button", { name: /worth investigating/i });
      await user.click(investigateBtns[0]);

      // Navigate to Next steps tab
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      await user.click(nextTab);

      // Numbered list should exist
      const list = screen.getByRole("list");
      expect(list.tagName.toLowerCase()).toBe("ol");
      expect(screen.getByText(/Ask about review cycles and median tenure before promotion\./i)).toBeInTheDocument();
      expect(screen.getByText(/\(Career growth velocity\)/i)).toBeInTheDocument();

      // Commute item should NOT be present
      expect(screen.queryByText(/Do a trial run during peak morning rush hour/i)).not.toBeInTheDocument();
    });

    it("renders explicit empty state when no findings are marked worth investigating", async () => {
      const user = userEvent.setup();
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Navigate to Next steps tab directly
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      await user.click(nextTab);

      // Empty state prompt
      expect(
        screen.getByText(/Nothing selected yet/i)
      ).toBeInTheDocument();
    });
  });

  describe("Mobile Bottom Navigation", () => {
    it("renders fixed bottom navigation with 4 buttons, badges, and keyboard arrow switching", () => {
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
          isMobileView={true}
        />
      );

      // Mobile nav landmark
      const mobileNav = screen.getByRole("navigation", { name: /results sections/i });
      expect(mobileNav).toBeInTheDocument();

      // 4 tab buttons
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(4);
      expect(tabs[0]).toHaveTextContent(/findings/i);
      expect(tabs[1]).toHaveTextContent(/your words/i);
      expect(tabs[2]).toHaveTextContent(/premortem/i);
      expect(tabs[3]).toHaveTextContent(/next steps/i);

      // ArrowRight advances tab
      fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
      expect(tabs[1]).toHaveAttribute("aria-selected", "true");

      // ArrowRight again
      fireEvent.keyDown(tabs[1], { key: "ArrowRight" });
      expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("Copy My Notes Action & Feedback", () => {
    it("copies formatted notes to clipboard and shows 2-second feedback", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Navigate to Next steps tab
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      fireEvent.click(nextTab);

      // Click "Copy my notes"
      const copyBtn = screen.getByRole("button", { name: /copy my notes/i });
      fireEvent.click(copyBtn);

      // Clipboard called with formatted plain text
      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledTimes(1);
      });
      const copiedText = writeTextMock.mock.calls[0][0];
      expect(copiedText).toContain("Perspectra: my notes");
      expect(copiedText).toContain("Deciding between offer A and current company.");

      // Feedback message shown
      expect(screen.getByText("Copied")).toBeInTheDocument();
    });

    it("shows fallback manual copy area with textarea if clipboard write fails", async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard denied"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Navigate to Next steps tab
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      fireEvent.click(nextTab);

      // Click "Copy my notes"
      const copyBtn = screen.getByRole("button", { name: /copy my notes/i });
      fireEvent.click(copyBtn);

      // Fallback manual copy region appears
      expect(await screen.findByRole("region", { name: /manual copy area/i })).toBeInTheDocument();
      expect(screen.getByText(/couldn't copy automatically/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Perspectra: my notes/)).toBeInTheDocument();
    });
  });

  describe("End-of-Tab Sequential Navigation & Certainty Scale Removal", () => {
    it("allows user to navigate through all tabs using bottom next and previous buttons", async () => {
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Start on Findings tab
      expect(screen.getByRole("tabpanel", { name: /findings/i })).not.toHaveAttribute("hidden");

      // 1. Findings -> Next: Your words
      const nextToWordsBtn = screen.getByRole("button", { name: /next: your words/i });
      fireEvent.click(nextToWordsBtn);
      expect(screen.getByRole("tabpanel", { name: /your words/i })).not.toHaveAttribute("hidden");

      // 2. Words -> Previous: Findings
      const backToFindingsBtn = screen.getByRole("button", { name: /previous: findings/i });
      fireEvent.click(backToFindingsBtn);
      expect(screen.getByRole("tabpanel", { name: /findings/i })).not.toHaveAttribute("hidden");

      // Jump back to Words
      fireEvent.click(screen.getByRole("button", { name: /next: your words/i }));

      // 3. Words -> Next: Premortem
      const nextToPremortemBtn = screen.getByRole("button", { name: /next: premortem/i });
      fireEvent.click(nextToPremortemBtn);
      expect(screen.getByRole("tabpanel", { name: /premortem/i })).not.toHaveAttribute("hidden");

      // 4. Premortem -> Previous: Your words
      const backToWordsBtn = screen.getByRole("button", { name: /previous: your words/i });
      fireEvent.click(backToWordsBtn);
      expect(screen.getByRole("tabpanel", { name: /your words/i })).not.toHaveAttribute("hidden");

      // Forward to Premortem again
      fireEvent.click(screen.getByRole("button", { name: /next: premortem/i }));

      // 5. Premortem -> Next: Next steps
      const nextToStepsBtn = screen.getByRole("button", { name: /next: next steps/i });
      fireEvent.click(nextToStepsBtn);
      expect(screen.getByRole("tabpanel", { name: /next steps/i })).not.toHaveAttribute("hidden");

      // 6. Next steps -> Previous: Premortem
      const backToPremortemBtn = screen.getByRole("button", { name: /previous: premortem/i });
      fireEvent.click(backToPremortemBtn);
      expect(screen.getByRole("tabpanel", { name: /premortem/i })).not.toHaveAttribute("hidden");

      // Forward to Next steps again
      fireEvent.click(screen.getByRole("button", { name: /next: next steps/i }));

      // 7. Next steps -> Back to Findings
      const returnToFindingsBtn = screen.getByRole("button", { name: /back to findings/i });
      fireEvent.click(returnToFindingsBtn);
      expect(screen.getByRole("tabpanel", { name: /findings/i })).not.toHaveAttribute("hidden");
    });

    it("verifies 1-5 certainty rating scale is absent from Next steps tab", () => {
      render(
        <ResultsView
          data={mockSampleData}
          originalInput={mockOriginalInput}
          onBackToAnswers={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Navigate to Next steps tab
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      fireEvent.click(nextTab);

      // The 1-5 certainty rating section should not exist
      expect(screen.queryByRole("heading", { name: /how sure do you feel now\?/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("radiogroup", { name: /certainty rating after analysis/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/before analysis:/i)).not.toBeInTheDocument();
    });
  });
});
