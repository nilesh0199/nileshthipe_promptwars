import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyze,
  BadAIOutputError,
  AIUnavailableError,
  AnalysisTimeoutError,
} from "@/lib/server/analyze";
import type { AnalyzeRequest } from "@/lib/schema";

// Mock ONLY callGemini, never the validators, guard, or grounding
const mockCallGemini = vi.fn();

vi.mock("@/lib/server/gemini", () => ({
  callGemini: (...args: unknown[]) => mockCallGemini(...args),
}));

// Mock logger to keep test output quiet
vi.mock("@/lib/server/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Analyze Orchestration (lib/server/analyze.ts)", () => {
  const sampleInput: AnalyzeRequest = {
    decisionType: "career",
    decision: "Should I accept the offer?",
    reasons: "Good compensation and team.",
    context: "Final decision by Friday.",
  };

  const validModelJson = JSON.stringify({
    decision_summary: "You are deciding whether to accept the offer.",
    reasoning_map: [
      {
        stated_reason: "Good compensation",
        rests_on: "Assuming financial gains align with personal goals",
        evidence_given: "Good compensation",
      },
    ],
    findings: [
      {
        type: "unstated_assumption",
        title: "Compensation vs Work-Life",
        observation: "You may be assuming the pace will be sustainable.",
        evidence_quotes: ["Good compensation and team"],
        evidence_paraphrase: "Highlighted compensation and colleagues.",
        basis: "stated",
        category: "career",
        why_it_matters: "Work culture influences longevity.",
        reflection_question: "How might the expected working hours compare?",
        investigation_item: "Inquire about average team hours.",
      },
    ],
    premortem_questions: ["What if the team dynamic shifts after joining?"],
    high_stakes_domain: "none",
    closing_note: "The decision remains yours.",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("completes success path on first attempt without retry", async () => {
    mockCallGemini.mockResolvedValueOnce({
      text: validModelJson,
      tokenUsage: { totalTokens: 250 },
    });

    const result = await analyze(sampleInput, "req-test-1");

    expect(result.kind).toBe("analysis");
    expect(result.analysis.decision_summary).toBe("You are deciding whether to accept the offer.");
    expect(result.receipt.retried).toBe(false);
    expect(result.receipt.findings_total).toBe(1);
    expect(result.input.decision).toBe(sampleInput.decision);
    expect(mockCallGemini).toHaveBeenCalledTimes(1);
  });

  it("retries when attempt 1 contains directive language and succeeds on clean attempt 2", async () => {
    const directiveModelJson = JSON.stringify({
      decision_summary: "You are deciding whether to accept the offer.",
      reasoning_map: [],
      findings: [
        {
          type: "overlooked_factor",
          title: "Career Advice",
          observation: "You should accept this job without hesitation.", // Directive phrase!
          evidence_quotes: [],
          evidence_paraphrase: "Noted compensation.",
          basis: "inferred",
          category: "career",
          why_it_matters: "Important.",
          reflection_question: "What else matters?",
          investigation_item: "Check terms.",
        },
      ],
      premortem_questions: ["What if conditions change?"],
      high_stakes_domain: "none",
      closing_note: "Your decision.",
    });

    // Attempt 1: directive failure
    mockCallGemini.mockResolvedValueOnce({
      text: directiveModelJson,
      tokenUsage: { totalTokens: 180 },
    });
    // Attempt 2: clean success
    mockCallGemini.mockResolvedValueOnce({
      text: validModelJson,
      tokenUsage: { totalTokens: 220 },
    });

    const result = await analyze(sampleInput, "req-test-2");

    expect(result.receipt.retried).toBe(true);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("throws BadAIOutputError when AI returns malformed JSON on both attempts", async () => {
    mockCallGemini.mockResolvedValueOnce({ text: "Not a valid JSON response {" });
    mockCallGemini.mockResolvedValueOnce({ text: "Still not JSON {" });

    await expect(analyze(sampleInput, "req-test-3")).rejects.toThrow(BadAIOutputError);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("retries when response is empty on attempt 1", async () => {
    mockCallGemini.mockResolvedValueOnce({ text: "   " }); // Empty response
    mockCallGemini.mockResolvedValueOnce({ text: validModelJson });

    const result = await analyze(sampleInput, "req-test-4");
    expect(result.receipt.retried).toBe(true);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("throws AIUnavailableError without retrying when upstream returns 429 quota or 503 server error", async () => {
    const upstreamError = new Error("Resource has been exhausted (e.g. check quota).");
    (upstreamError as { status?: number }).status = 429;

    mockCallGemini.mockRejectedValueOnce(upstreamError);

    await expect(analyze(sampleInput, "req-test-5")).rejects.toThrow(AIUnavailableError);
    // Quota errors must never be retried
    expect(mockCallGemini).toHaveBeenCalledTimes(1);
  });

  it("throws AnalysisTimeoutError when Gemini call aborts or times out", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "AbortError";

    mockCallGemini.mockRejectedValueOnce(timeoutError);

    await expect(analyze(sampleInput, "req-test-6")).rejects.toThrow(AnalysisTimeoutError);
  });

  it("skips retry when remaining deadline time is under 8 seconds", async () => {
    const startTime = 100000;
    let currentTime = startTime;

    // Spy on Date.now to simulate elapsed time
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    // Attempt 1 fails with bad json
    mockCallGemini.mockImplementation(async () => {
      // Simulate that attempt 1 consumed 21 seconds (leaving only 7s < 8s)
      currentTime = startTime + 21000;
      return { text: "invalid json" };
    });

    await expect(analyze(sampleInput, "req-test-7")).rejects.toThrow(BadAIOutputError);
    // Only 1 attempt made because remaining time (7s) < 8s retry threshold
    expect(mockCallGemini).toHaveBeenCalledTimes(1);

    dateSpy.mockRestore();
  });
});
