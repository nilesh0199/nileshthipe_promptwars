// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Workspace } from "@/components/Workspace";
import { AuthProvider } from "@/components/auth/AuthProvider";

function renderWorkspace(onExit = vi.fn()) {
  return render(
    <AuthProvider>
      <Workspace onExit={onExit} />
    </AuthProvider>
  );
}

describe("Type Picker & Workspace Interview Flow", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with no type pre-selected on fresh visit", () => {
    renderWorkspace();

    // Screen 1: "What kind of decision is this?"
    expect(screen.getByRole("heading", { name: /what kind of decision is this\?/i })).toBeInTheDocument();

    // No tile has aria-pressed="true"
    const tiles = screen.getAllByRole("button", { name: /career|study|relocation|financial|personal/i });
    expect(tiles.every((tile) => tile.getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("clicking a type tile shows checkmark and advances after 900ms, restarting if another tile is chosen", async () => {
    vi.useFakeTimers();
    renderWorkspace();

    const careerTile = screen.getByRole("button", { name: /career and work/i });
    const studyTile = screen.getByRole("button", { name: /study and academics/i });

    // Click career tile
    act(() => {
      careerTile.click();
    });

    // Check mark should appear immediately on Career
    expect(careerTile.getAttribute("aria-pressed")).toBe("true");
    expect(careerTile.querySelector("svg")).not.toBeNull();

    // Advance by 400ms (< 900ms) - still on screen 1
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getByRole("heading", { name: /what kind of decision is this\?/i })).toBeInTheDocument();

    // Switch selection to Study before timer completes
    act(() => {
      studyTile.click();
    });

    expect(studyTile.getAttribute("aria-pressed")).toBe("true");
    expect(studyTile.querySelector("svg")).not.toBeNull();
    expect(careerTile.getAttribute("aria-pressed")).toBe("false");

    // Advance by another 500ms (total 900ms from start, but only 500ms for study) - still waiting
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("heading", { name: /what kind of decision is this\?/i })).toBeInTheDocument();

    // Advance remaining 400ms for Study (total 900ms for Study)
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Advanced to Question 2: "What are you deciding?"
    expect(screen.getByRole("heading", { name: /what are you deciding\?/i })).toBeInTheDocument();
  });

  it("returning to type picker shows outline with no check mark", async () => {
    vi.useFakeTimers();
    renderWorkspace();

    // Pick Career and wait 900ms to advance
    act(() => {
      screen.getByRole("button", { name: /career/i }).click();
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByRole("heading", { name: /what are you deciding\?/i })).toBeInTheDocument();

    // Go back to Screen 1 using Back button
    act(() => {
      screen.getAllByRole("button", { name: /back/i })[0].click();
    });

    expect(screen.getByRole("heading", { name: /what kind of decision is this\?/i })).toBeInTheDocument();

    // On return, check mark SVG is NOT shown on the tile
    const careerTile = screen.getByRole("button", { name: /career/i });
    expect(careerTile.querySelector("svg")).toBeNull();

    // Visually hidden (current choice) indicator is present for screen readers
    expect(screen.getByText(/\(current choice\)/i)).toBeInTheDocument();
  });

  it("validates required fields and displays inline messages", async () => {
    vi.useFakeTimers();
    renderWorkspace();

    // Select Career
    act(() => {
      screen.getByRole("button", { name: /career/i }).click();
      vi.advanceTimersByTime(900);
    });

    // Try to continue without typing in decision
    act(() => {
      screen.getByRole("button", { name: /^continue$/i }).click();
    });

    expect(screen.getByText(/Add a sentence or two to continue\./i)).toBeInTheDocument();
  });

  it("allows skipping optional context screen to proceed directly to analysis", async () => {
    vi.useFakeTimers();
    renderWorkspace();

    // Screen 1: Pick type
    act(() => {
      screen.getByRole("button", { name: /career/i }).click();
      vi.advanceTimersByTime(900);
    });

    // Screen 2: Fill decision
    const user = userEvent.setup({ delay: null });
    vi.useRealTimers();
    const decisionInput = screen.getByRole("textbox");
    await user.type(decisionInput, "Should I accept the offer?");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    // Screen 3: Fill reasons
    const reasonsInput = screen.getByRole("textbox");
    await user.type(reasonsInput, "Good compensation and team.");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    // Screen 4: Context is optional -> Skip button present and primary action is submit
    expect(screen.getByRole("heading", { name: /anything else that matters\?/i })).toBeInTheDocument();
    const skipContextBtn = screen.getByRole("button", { name: /skip/i });
    expect(skipContextBtn).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: /show me another perspective/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it("sends payload to /api/analyze with decisionType, decision, reasons, context, and NEVER certaintyBefore", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: "analysis",
        analysis: {
          decision_summary: "Summary",
          reasoning_map: [],
          findings: [],
          premortem_questions: [],
          high_stakes_domain: "none",
          closing_note: "Note",
        },
        receipt: {
          language_check: "passed",
          findings_total: 0,
          findings_grounded: 0,
          quotes_dropped: 0,
          retried: false,
        },
        input: {
          decision: "Should I move?",
          reasons: "Better opportunity.",
          context: "",
        },
      }),
    });
    global.fetch = fetchSpy;

    renderWorkspace();
    const user = userEvent.setup();

    // Use example button to quickly fill valid state
    await user.click(screen.getByRole("button", { name: /use an example/i }));

    // Advance from decision and reasons
    await user.click(screen.getByRole("button", { name: /^continue$/i })); // from decision
    await user.click(screen.getByRole("button", { name: /^continue$/i })); // from reasons

    // Context screen: submit directly for analysis
    await user.click(screen.getByRole("button", { name: /show me another perspective/i }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    const sentBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(sentBody.decisionType).toBeDefined();
    expect(sentBody.decision).toBeDefined();
    expect(sentBody.reasons).toBeDefined();
    expect(sentBody.context).toBeDefined();

    // CRITICAL: certaintyBefore must NEVER be included in the server payload!
    expect(sentBody.certaintyBefore).toBeUndefined();
    expect("certaintyBefore" in sentBody).toBe(false);
  });

  it("renders calm SupportCard with no results UI and no save buttons when response has kind 'support'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: "support",
        message: "We want to pause here. You deserve real support.",
        helplines: [
          { name: "Tele-MANAS (India)", contact: "14416", note: "Free 24x7" },
        ],
      }),
    });

    renderWorkspace();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /use an example/i }));
    await user.click(screen.getByRole("button", { name: /^continue$/i })); // decision
    await user.click(screen.getByRole("button", { name: /^continue$/i })); // reasons
    await user.click(screen.getByRole("button", { name: /show me another perspective/i })); // context submit

    // Support card should appear
    expect(await screen.findByText(/Support and Resources/i)).toBeInTheDocument();
    expect(screen.getByText(/We want to pause here/i)).toBeInTheDocument();
    expect(screen.getByText(/Tele-MANAS \(India\)/i)).toBeInTheDocument();
    expect(screen.getByText("14416")).toBeInTheDocument();

    // No analysis UI or Save buttons
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save analysis/i })).not.toBeInTheDocument();

    // Actions available: Edit my answers and Start over
    expect(screen.getByRole("button", { name: /edit my answers/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });
});
