import { describe, it, expect } from "vitest";
import { sanitizeInputText, sanitizeRequestPayload } from "@/lib/server/sanitize";
import { detectCrisisLanguage, SUPPORT_MESSAGE, SUPPORT_HELPLINES } from "@/lib/safety";
import { MemoryRateLimiter, extractClientKey } from "@/lib/server/rateLimit";

describe("Input Sanitiser (lib/server/sanitize.ts)", () => {
  it("removes control characters while preserving newlines, carriage returns, and tabs", () => {
    const raw = "Header\u0000\u0001\u0007\u001B\r\n\tIndented text\nFooter\u007F\u0085";
    const cleaned = sanitizeInputText(raw);
    expect(cleaned).toBe("Header\r\n\tIndented text\nFooter");
  });

  it("removes zero-width and bidirectional override characters", () => {
    const malicious = "Text\u200Bwith\u200Czero\u200Dwidth\u202Aand\u202Ebidi\u2060overrides\uFEFF";
    const cleaned = sanitizeInputText(malicious);
    expect(cleaned).toBe("Textwithzerowidthandbidioverrides");
  });

  it("preserves standard international Unicode text and emojis", () => {
    const hindi = "मुझे अपनी नौकरी बदलनी चाहिए या नहीं?";
    expect(sanitizeInputText(hindi)).toBe(hindi);

    const marathi = "मी नवीन व्यवसाय सुरू करावा का?";
    expect(sanitizeInputText(marathi)).toBe(marathi);

    const french = "Je dois choisir entre Paris et Lyon pour le café ☕";
    expect(sanitizeInputText(french)).toBe(french);

    const emojis = "⚖️ Weighing my options 🚀";
    expect(sanitizeInputText(emojis)).toBe(emojis);
  });

  it("normalises decomposed Unicode to NFC canonical form", () => {
    // e + combining acute accent -> é in NFC
    const decomposed = "e\u0301";
    const cleaned = sanitizeInputText(decomposed);
    expect(cleaned).toBe("é");
  });

  it("sanitizeRequestPayload correctly transforms string fields and leaves non-strings intact", () => {
    const payload = {
      decisionType: "career",
      decision: "Quit\u200B now?\u0000",
      reasons: "Too much stress.\n\tNeed peace.",
      context: "Family\uFEFF support.",
      certaintyBefore: 3,
    };

    const sanitized = sanitizeRequestPayload(payload);
    expect(sanitized.decision).toBe("Quit now?");
    expect(sanitized.reasons).toBe("Too much stress.\n\tNeed peace.");
    expect(sanitized.context).toBe("Family support.");
    expect(sanitized.certaintyBefore).toBe(3);
    expect(sanitized.decisionType).toBe("career");
  });
});

describe("Crisis Language Detector (lib/safety.ts)", () => {
  it("returns true for explicit first-person crisis and self-harm statements", () => {
    const crisisStatements = [
      "I want to die",
      "I just wanna die right now",
      "I wish I were dead",
      "I wish I was dead",
      "Thinking about ending my life",
      "I want to end my own life",
      "I am going to take my own life",
      "I want to kill myself",
      "I am killing myself tonight",
      "I'm suicidal",
      "I am suicidal",
      "I feel suicidal every single day",
      "I don't want to live anymore",
      "I do not want to live",
      "There is no reason to live",
      "There is no point in living",
      "Everyone would be better off dead without me",
      "I want to harm myself",
      "I am harming myself",
      "I want to hurt myself",
      "I am cutting myself",
    ];

    for (const statement of crisisStatements) {
      expect(detectCrisisLanguage(statement), `Failed to detect crisis in: "${statement}"`).toBe(true);
    }
  });

  it("returns false for neutral topic words, academic discussion, and policy mentions", () => {
    const neutralTexts = [
      "I am attending a suicide prevention course on Saturday.",
      "The college issued a new self-harm policy.",
      "Writing a sociology paper on suicide prevention hotline statistics.",
      "Studying global self-harm trends for public health research.",
    ];

    for (const text of neutralTexts) {
      expect(detectCrisisLanguage(text), `False positive on neutral text: "${text}"`).toBe(false);
    }
  });

  it("returns false for ordinary decisions and stressful situations", () => {
    const regularDecisions = [
      "Should I resign from my job because the workload is killing my social life?",
      "I feel burnt out from studying for medical entrance exams.",
      "Should I move back to Bangalore or stay in Chennai with family?",
      "",
    ];

    for (const text of regularDecisions) {
      expect(detectCrisisLanguage(text)).toBe(false);
    }
  });

  it("provides verified helpline resources with Tele-MANAS details", () => {
    expect(SUPPORT_MESSAGE).toContain("We want to pause here");
    expect(SUPPORT_HELPLINES.length).toBeGreaterThanOrEqual(2);
    const indiaHelpline = SUPPORT_HELPLINES.find((h) => h.name.includes("India"));
    expect(indiaHelpline).toBeDefined();
    expect(indiaHelpline?.contact).toContain("14416");
  });
});

describe("Rate Limiter (lib/server/rateLimit.ts)", () => {
  it("allows N requests, blocks at N+1, and resets after window using injected clock", () => {
    const limiter = new MemoryRateLimiter({
      maxRequests: 2,
      windowSeconds: 5,
      globalMaxPerHour: 100,
      maxMapSize: 10,
    });

    const t0 = 5000000;

    // 1st request
    expect(limiter.check("client-a", t0).allowed).toBe(true);

    // 2nd request
    expect(limiter.check("client-a", t0 + 1000).allowed).toBe(true);

    // 3rd request -> blocked (exceeded 2)
    const blocked = limiter.check("client-a", t0 + 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("RATE_LIMITED");
    expect(blocked.retryAfterSeconds).toBe(3); // 5000000 + 5000 - 5002000 = 3000ms -> 3s

    // Request from different client succeeds
    expect(limiter.check("client-b", t0 + 2000).allowed).toBe(true);

    // After window expires (t0 + 5500), client-a is allowed again
    const afterExpiry = limiter.check("client-a", t0 + 5500);
    expect(afterExpiry.allowed).toBe(true);
  });

  it("enforces global hourly instance cap", () => {
    const limiter = new MemoryRateLimiter({
      maxRequests: 10,
      windowSeconds: 60,
      globalMaxPerHour: 3,
      maxMapSize: 10,
    });

    const t0 = 1000000;
    expect(limiter.check("c1", t0).allowed).toBe(true);
    expect(limiter.check("c2", t0 + 10).allowed).toBe(true);
    expect(limiter.check("c3", t0 + 20).allowed).toBe(true);

    // Global cap of 3 reached
    const globalBlocked = limiter.check("c4", t0 + 30);
    expect(globalBlocked.allowed).toBe(false);
    expect(globalBlocked.isGlobal).toBe(true);
    expect(globalBlocked.reason).toBe("AI_UNAVAILABLE");
    expect(globalBlocked.retryAfterSeconds).toBe(60);
  });

  it("prunes expired entries and caps the map size", () => {
    const limiter = new MemoryRateLimiter({
      maxRequests: 5,
      windowSeconds: 2,
      globalMaxPerHour: 100,
      maxMapSize: 3,
    });

    const t0 = 1000000;
    limiter.check("user-1", t0);
    limiter.check("user-2", t0);
    limiter.check("user-3", t0);
    limiter.check("user-4", t0);
    limiter.check("user-5", t0);

    // Map size must never exceed maxMapSize (3)
    expect(limiter.size()).toBeLessThanOrEqual(3);

    // Pruning after expiration drops old keys
    limiter.prune(t0 + 5000, 2000, 3);
    expect(limiter.size()).toBe(0);
  });

  it("extracts client key from headers hierarchy", () => {
    expect(extractClientKey({ "x-forwarded-for": "203.0.113.195, 10.0.0.1" })).toBe("203.0.113.195");
    expect(extractClientKey({ "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(extractClientKey({})).toBe("unknown");

    const headersObj = new Headers();
    headersObj.set("x-forwarded-for", "192.0.2.1");
    expect(extractClientKey(headersObj)).toBe("192.0.2.1");
  });
});
