import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkMethod,
  checkContentType,
  checkSameOrigin,
  checkBodySize,
  createGuardErrorResponse,
} from "@/lib/server/requestGuard";
import { getEnv, resetEnvCacheForTests, ConfigError } from "@/lib/server/env";
import { logger } from "@/lib/server/logger";

describe("Request Guard Helpers (lib/server/requestGuard.ts)", () => {
  it("checkMethod validates allowed HTTP methods and supplies Allow header on rejection", () => {
    expect(checkMethod("POST", ["POST"]).ok).toBe(true);

    const getCheck = checkMethod("GET", ["POST"]);
    expect(getCheck.ok).toBe(false);
    expect(getCheck.allowHeader).toBe("POST");

    const multiCheck = checkMethod("DELETE", ["GET", "POST"]);
    expect(multiCheck.ok).toBe(false);
    expect(multiCheck.allowHeader).toBe("GET, POST");
  });

  it("checkContentType requires application/json", () => {
    expect(checkContentType("application/json")).toBe(true);
    expect(checkContentType("application/json; charset=utf-8")).toBe(true);
    expect(checkContentType("APPLICATION/JSON")).toBe(true);

    expect(checkContentType("text/plain")).toBe(false);
    expect(checkContentType("application/x-www-form-urlencoded")).toBe(false);
    expect(checkContentType(null)).toBe(false);
    expect(checkContentType("")).toBe(false);
  });

  it("checkSameOrigin allows same host and missing Origin, blocks foreign host, honours ALLOWED_ORIGINS", () => {
    // Missing Origin is explicitly allowed (curl, server-to-server)
    expect(checkSameOrigin(null, "perspectra.vercel.app")).toBe(true);
    expect(checkSameOrigin(undefined, "perspectra.vercel.app")).toBe(true);
    expect(checkSameOrigin("", "perspectra.vercel.app")).toBe(true);

    // Matching host
    expect(checkSameOrigin("https://perspectra.vercel.app", "perspectra.vercel.app")).toBe(true);
    expect(checkSameOrigin("http://localhost:3000", "localhost:3000")).toBe(true);

    // Foreign host blocked
    expect(checkSameOrigin("https://attacker-site.com", "perspectra.vercel.app")).toBe(false);
    expect(checkSameOrigin("http://evil.com", "localhost:3000")).toBe(false);

    // Malformed URL blocked
    expect(checkSameOrigin("not-a-valid-url", "localhost:3000")).toBe(false);

    // ALLOWED_ORIGINS whitelist
    const allowed = ["https://preview.vercel.app", "staging.perspectra.app"];
    expect(checkSameOrigin("https://preview.vercel.app", "perspectra.vercel.app", allowed)).toBe(true);
    expect(checkSameOrigin("https://staging.perspectra.app", "perspectra.vercel.app", allowed)).toBe(true);
    expect(checkSameOrigin("https://unauthorized.org", "perspectra.vercel.app", allowed)).toBe(false);
  });

  it("checkBodySize enforces byte limits and inspects Content-Length header", () => {
    expect(checkBodySize(null, 1000, 8192)).toBe(true);
    expect(checkBodySize("500", 500, 8192)).toBe(true);

    // Byte length exceeded
    expect(checkBodySize(null, 9000, 8192)).toBe(false);

    // Content-Length header exceeded
    expect(checkBodySize("10000", 500, 8192)).toBe(false);
  });

  it("createGuardErrorResponse produces compliant JSON error payload and security headers", async () => {
    const res = createGuardErrorResponse(400, "INVALID_INPUT", "Bad format", "req-123", {
      "Custom-Header": "value",
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBe("req-123");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("custom-header")).toBe("value");

    const body = await res.json();
    expect(body).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Bad format",
      },
    });
  });
});

describe("Server Environment (lib/server/env.ts)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetEnvCacheForTests();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    resetEnvCacheForTests();
    process.env = originalEnv;
  });

  it("parses valid environment configuration with defaults", () => {
    process.env.GEMINI_API_KEY = "test-secret-key-123";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";

    const env = getEnv();
    expect(env.GEMINI_API_KEY).toBe("test-secret-key-123");
    expect(env.GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(env.GEMINI_THINKING_LEVEL).toBe("medium");
    expect(env.RATE_LIMIT_MAX).toBe(120); // non-prod default
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(600);
    expect(env.RATE_LIMIT_GLOBAL_MAX).toBe(300);
    expect(env.ALLOWED_ORIGINS).toEqual([]);
  });

  it("throws ConfigError listing missing variable names only, never values", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.RATE_LIMIT_MAX = "invalid-not-a-number";

    try {
      getEnv();
      expect.fail("Should have thrown ConfigError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConfigError);
      const confErr = err as ConfigError;
      expect(confErr.missingOrInvalidVars).toContain("GEMINI_API_KEY");
      expect(confErr.missingOrInvalidVars).toContain("RATE_LIMIT_MAX");
      // Assert that sensitive values are never leaked in the error message
      expect(confErr.message).not.toContain("test-secret-key");
    }
  });

  it("handles production mode defaults, custom rate limits, allowed origins, and thinking levels", () => {
    process.env.GEMINI_API_KEY = "test-key";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.GEMINI_THINKING_LEVEL = "low";
    process.env.RATE_LIMIT_MAX = "50";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "300";
    process.env.RATE_LIMIT_GLOBAL_MAX = "1000";
    process.env.ALLOWED_ORIGINS = "https://app.com, https://admin.app.com";

    const env = getEnv();
    expect(env.RATE_LIMIT_MAX).toBe(50);
    expect(env.RATE_LIMIT_WINDOW_SECONDS).toBe(300);
    expect(env.RATE_LIMIT_GLOBAL_MAX).toBe(1000);
    expect(env.GEMINI_THINKING_LEVEL).toBe("low");
    expect(env.ALLOWED_ORIGINS).toEqual(["https://app.com", "https://admin.app.com"]);

    // Test cached response on consecutive calls
    const cached = getEnv();
    expect(cached).toBe(env);
  });

  it("handles high thinking level and production default rate limit", () => {
    process.env.GEMINI_API_KEY = "test-key";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.RATE_LIMIT_MAX;
    process.env.GEMINI_THINKING_LEVEL = "high";

    const env = getEnv();
    expect(env.RATE_LIMIT_MAX).toBe(20);
    expect(env.GEMINI_THINKING_LEVEL).toBe("high");
  });

  it("rejects invalid model name, thinking level, and negative rate limits", () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "bad model with spaces!";
    process.env.GEMINI_THINKING_LEVEL = "invalid-level";
    process.env.RATE_LIMIT_MAX = "-10";
    process.env.RATE_LIMIT_WINDOW_SECONDS = "0";
    process.env.RATE_LIMIT_GLOBAL_MAX = "not-a-number";

    try {
      getEnv();
      expect.fail("Should have thrown ConfigError");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConfigError);
      const confErr = err as ConfigError;
      expect(confErr.missingOrInvalidVars).toContain("GEMINI_MODEL");
      expect(confErr.missingOrInvalidVars).toContain("GEMINI_THINKING_LEVEL");
      expect(confErr.missingOrInvalidVars).toContain("RATE_LIMIT_MAX");
      expect(confErr.missingOrInvalidVars).toContain("RATE_LIMIT_WINDOW_SECONDS");
      expect(confErr.missingOrInvalidVars).toContain("RATE_LIMIT_GLOBAL_MAX");
    }
  });
});

describe("Structured Logger (lib/server/logger.ts)", () => {
  it("redacts sensitive credential keys (key, token, secret, authorization, password)", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logger.info("auth.test", {
      apiKey: "super-secret-key",
      userToken: "bearer-token-val",
      apiSecret: "my-secret",
      authPassword: "plaintext-password",
      regularMeta: "public-metadata",
    });

    expect(stdoutSpy).toHaveBeenCalled();
    const loggedJson = JSON.parse(stdoutSpy.mock.calls[0][0] as string);

    expect(loggedJson.apiKey).toBe("[REDACTED]");
    expect(loggedJson.userToken).toBe("[REDACTED]");
    expect(loggedJson.apiSecret).toBe("[REDACTED]");
    expect(loggedJson.authPassword).toBe("[REDACTED]");
    expect(loggedJson.regularMeta).toBe("public-metadata");

    stdoutSpy.mockRestore();
  });

  it("never logs user text fields, emitting only structured metadata", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    logger.info(
      "analyze.request",
      {
        decisionType: "career",
        decisionLen: 42,
        reasonsLen: 120,
      },
      "req-uuid-test"
    );

    const loggedJson = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(loggedJson.event).toBe("analyze.request");
    expect(loggedJson.requestId).toBe("req-uuid-test");
    expect(loggedJson.decisionType).toBe("career");
    expect(loggedJson.decisionLen).toBe(42);
    expect(loggedJson.decision).toBeUndefined(); // User text is never logged

    stdoutSpy.mockRestore();
  });
});
