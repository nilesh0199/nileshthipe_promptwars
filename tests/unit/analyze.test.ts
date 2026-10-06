import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  analyze,
  BadAIOutputError,
  AIQuotaError,
  AIUnavailableError,
  AnalysisTimeoutError,
} from "@/lib/server/analyze";
import { resetEnvCacheForTests } from "@/lib/server/env";
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
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    delete process.env.GEMINI_FALLBACK_MODEL;
    resetEnvCacheForTests();
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

  it("throws AIQuotaError without retry on the same model when upstream returns 429", async () => {
    const upstreamError = new Error("Resource has been exhausted (e.g. check quota).");
    (upstreamError as { status?: number }).status = 429;

    mockCallGemini.mockRejectedValueOnce(upstreamError);

    const err = await analyze(sampleInput, "req-test-5").catch((e) => e);
    expect(err).toBeInstanceOf(AIQuotaError);
    expect(err.status).toBe(429);
    // Quota errors must never be retried on the same model
    expect(mockCallGemini).toHaveBeenCalledTimes(1);
  });

  it("retries with fallback model when upstream returns 429 and fallback model is configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-fallback-flash";
    resetEnvCacheForTests();

    const upstreamError = new Error("Resource has been exhausted (e.g. check quota).");
    (upstreamError as { status?: number }).status = 429;

    // Attempt 1: 429 on primary model
    mockCallGemini.mockRejectedValueOnce(upstreamError);
    // Attempt 2: success on fallback model
    mockCallGemini.mockResolvedValueOnce({
      text: validModelJson,
      tokenUsage: { totalTokens: 250 },
    });

    const result = await analyze(sampleInput, "req-test-fallback");
    expect(result.kind).toBe("analysis");
    expect(result.receipt.retried).toBe(true);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
    expect(mockCallGemini).toHaveBeenLastCalledWith(
      expect.objectContaining({ modelOverride: "gemini-fallback-flash" })
    );
  });

  it("retries once after ~1.5s when upstream returns 503 overload and succeeds on second attempt", async () => {
    const upstreamError = new Error("The service is temporarily unavailable.");
    (upstreamError as { status?: number }).status = 503;

    // Attempt 1 fails with 503
    mockCallGemini.mockRejectedValueOnce(upstreamError);
    // Attempt 2 succeeds
    mockCallGemini.mockResolvedValueOnce({
      text: validModelJson,
      tokenUsage: { totalTokens: 210 },
    });

    const result = await analyze(sampleInput, "req-test-503-retry");
    expect(result.kind).toBe("analysis");
    expect(result.receipt.retried).toBe(true);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("throws AIUnavailableError when upstream returns 503 twice", async () => {
    const upstreamError = new Error("The service is temporarily unavailable.");
    (upstreamError as { status?: number }).status = 503;

    mockCallGemini.mockRejectedValueOnce(upstreamError);
    mockCallGemini.mockRejectedValueOnce(upstreamError);

    const err = await analyze(sampleInput, "req-test-503-twice").catch((e) => e);
    expect(err).toBeInstanceOf(AIUnavailableError);
    expect(err.status).toBe(503);
    expect(mockCallGemini).toHaveBeenCalledTimes(2);
  });

  it("skips retry and fallback when remaining deadline time is under 8 seconds", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_FALLBACK_MODEL = "gemini-fallback-flash";
    resetEnvCacheForTests();

    const startTime = 100000;
    let currentTime = startTime;

    // Spy on Date.now to simulate elapsed time
    const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => currentTime);

    // Attempt 1 consumes 21 seconds (leaving 7s < 8s) and returns 429
    mockCallGemini.mockImplementation(async () => {
      currentTime = startTime + 21000;
      const err = new Error("Quota exceeded");
      (err as { status?: number }).status = 429;
      throw err;
    });

    const err = await analyze(sampleInput, "req-test-under8s").catch((e) => e);
    expect(err).toBeInstanceOf(AIQuotaError);
    // Under 8s remaining: fallback not attempted
    expect(mockCallGemini).toHaveBeenCalledTimes(1);

    dateSpy.mockRestore();
  });

  it("throws AnalysisTimeoutError when Gemini call aborts or times out", async () => {
    const timeoutError = new Error("The operation was aborted due to timeout");
    timeoutError.name = "AbortError";

    mockCallGemini.mockRejectedValueOnce(timeoutError);

    await expect(analyze(sampleInput, "req-test-6")).rejects.toThrow(AnalysisTimeoutError);
  });
});
