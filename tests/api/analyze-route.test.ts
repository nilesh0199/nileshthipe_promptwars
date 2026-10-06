import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET, PUT, DELETE } from "@/app/api/analyze/route";
import { rateLimiter } from "@/lib/server/rateLimit";
import * as analyzeModule from "@/lib/server/analyze";
import * as envModule from "@/lib/server/env";

// Mock analyze module for route handler tests
vi.mock("@/lib/server/analyze", async () => {
  const actual = await vi.importActual<typeof analyzeModule>("@/lib/server/analyze");
  return {
    ...actual,
    analyze: vi.fn(),
  };
});

describe("API Route: /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimiter.reset();
  });

  const validPayload = {
    decisionType: "career",
    decision: "Should I accept the offer?",
    reasons: "Great growth opportunities.",
    context: "Starting next month.",
  };

  function createNextRequest(options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    url?: string;
  }): NextRequest {
    const url = options.url || "http://localhost:3000/api/analyze";
    const reqHeaders = new Headers(options.headers || {
      "Content-Type": "application/json",
      host: "localhost:3000",
    });

    return new NextRequest(url, {
      method: options.method || "POST",
      headers: reqHeaders,
      body: options.body,
    });
  }

  it("returns 405 with Allow header for non-POST HTTP methods", async () => {
    const resGet = await GET();
    expect(resGet.status).toBe(405);
    expect(resGet.headers.get("allow")).toBe("POST");
    expect(resGet.headers.get("cache-control")).toBe("no-store");

    const resPut = await PUT();
    expect(resPut.status).toBe(405);
    expect(resPut.headers.get("allow")).toBe("POST");

    const resDelete = await DELETE();
    expect(resDelete.status).toBe(405);
    expect(resDelete.headers.get("allow")).toBe("POST");
  });

  it("returns 400 INVALID_INPUT for wrong content-type header", async () => {
    const req = createNextRequest({
      headers: { "Content-Type": "text/plain", host: "localhost:3000" },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(res.headers.get("x-request-id")).toBeDefined();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 400 INVALID_INPUT for malformed JSON body", async () => {
    const req = createNextRequest({
      headers: { "Content-Type": "application/json", host: "localhost:3000" },
      body: "not json {",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 INVALID_INPUT for oversized body (> 8 KB)", async () => {
    const hugeDecision = "a".repeat(8200);
    const req = createNextRequest({
      headers: { "Content-Type": "application/json", host: "localhost:3000" },
      body: JSON.stringify({ ...validPayload, decision: hugeDecision }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 INVALID_INPUT for missing required fields", async () => {
    const missingReasons = { decisionType: "career", decision: "Valid decision" };
    const req = createNextRequest({
      body: JSON.stringify(missingReasons),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 400 INVALID_INPUT when certaintyBefore or unknown fields are provided", async () => {
    const poisoned = { ...validPayload, certaintyBefore: 4 };
    const req = createNextRequest({
      body: JSON.stringify(poisoned),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("returns 403 FORBIDDEN for foreign Origin header", async () => {
    const req = createNextRequest({
      headers: {
        "Content-Type": "application/json",
        host: "perspectra.vercel.app",
        origin: "https://evil-attacker.com",
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("This request couldn't be accepted.");
  });

  it("returns 429 RATE_LIMITED with Retry-After when per-IP limit is exceeded", async () => {
    // Fill quota using the shared rateLimiter
    const clientKey = "test-ip-address";
    const now = Date.now();

    // Trigger requests with client ip header
    for (let i = 0; i < 200; i++) {
      rateLimiter.check(clientKey, now);
    }

    const req = createNextRequest({
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
        "x-forwarded-for": clientKey,
      },
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeDefined();
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("returns 200 with kind 'support' for crisis sentence without calling analyze", async () => {
    const crisisPayload = {
      decisionType: "life",
      decision: "I want to die and have no future",
      reasons: "Everything is hopeless",
      context: "",
    };

    const req = createNextRequest({
      body: JSON.stringify(crisisPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.kind).toBe("support");
    expect(body.message).toContain("We want to pause here");
    expect(body.helplines.length).toBeGreaterThanOrEqual(2);

    // CRITICAL: analyze must never be called for crisis statements
    expect(analyzeModule.analyze).not.toHaveBeenCalled();
  });

  it("returns 200 with kind 'analysis', receipt, and input on successful request", async () => {
    const mockSuccessResponse = {
      kind: "analysis" as const,
      analysis: {
        decision_summary: "Deciding on career offer",
        reasoning_map: [],
        findings: [],
        premortem_questions: [],
        high_stakes_domain: "none" as const,
        closing_note: "Your decision.",
      },
      receipt: {
        language_check: "passed" as const,
        findings_total: 0,
        findings_grounded: 0,
        quotes_dropped: 0,
        retried: false,
      },
      input: {
        decision: validPayload.decision,
        reasons: validPayload.reasons,
        context: validPayload.context,
      },
    };

    vi.mocked(analyzeModule.analyze).mockResolvedValueOnce(mockSuccessResponse);

    const req = createNextRequest({
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.kind).toBe("analysis");
    expect(body.analysis).toBeDefined();
    expect(body.receipt).toBeDefined();
    expect(body.input).toBeDefined();
    expect(res.headers.get("x-request-id")).toBeDefined();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns generic 500 without stack trace on ConfigError or unexpected error", async () => {
    vi.mocked(analyzeModule.analyze).mockRejectedValueOnce(
      new envModule.ConfigError(["GEMINI_API_KEY"])
    );

    const req = createNextRequest({
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.code).toBe("SERVER_ERROR");
    expect(body.error.message).toBe("Something went wrong on our side. Please try again.");
    // No sensitive information or stack traces leaked
    expect(JSON.stringify(body)).not.toContain("stack");
    expect(JSON.stringify(body)).not.toContain("GEMINI_API_KEY");
  });

  it("returns 503 AI_QUOTA with Retry-After 30 header when AIQuotaError is thrown", async () => {
    vi.mocked(analyzeModule.analyze).mockRejectedValueOnce(
      new analyzeModule.AIQuotaError(429)
    );

    const req = createNextRequest({
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("30");

    const body = await res.json();
    expect(body.error.code).toBe("AI_QUOTA");
    expect(body.error.message).toBe(
      "The AI service has reached its limit for now. Please wait a minute and try again."
    );
  });

  it("returns 503 AI_UNAVAILABLE when AIUnavailableError is thrown", async () => {
    vi.mocked(analyzeModule.analyze).mockRejectedValueOnce(
      new analyzeModule.AIUnavailableError(503)
    );

    const req = createNextRequest({
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.code).toBe("AI_UNAVAILABLE");
    expect(body.error.message).toBe(
      "The AI service is busy right now. Please try again in a minute."
    );
  });
});
