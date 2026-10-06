// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  CLIENT_STORAGE_KEYS,
  clearUserScopedClientState,
  registerPendingWriteTimer,
  cancelPendingWriteTimers,
  getPendingWriteTimerCount,
  setPendingSave,
  getPendingSave,
  clearPendingSave,
  PENDING_SAVE_STORAGE_KEY,
  PENDING_SAVE_EXPIRY_MS,
} from "@/lib/clientState";

describe("lib/clientState.ts", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    cancelPendingWriteTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports explicit list of client storage keys", () => {
    expect(CLIENT_STORAGE_KEYS).toContain("perspectra_workspace_v2");
    expect(CLIENT_STORAGE_KEYS).toContain("perspectra_pending_save_v1");
  });

  it("clearUserScopedClientState removes all perspectra keys from both sessionStorage and localStorage", () => {
    window.sessionStorage.setItem("perspectra_workspace_v2", "draft data");
    window.sessionStorage.setItem("perspectra_pending_save_v1", "pending data");
    window.sessionStorage.setItem("perspectra_custom_key", "custom");
    window.sessionStorage.setItem("unrelated_key", "keep this");

    window.localStorage.setItem("perspectra_workspace_v2", "draft data local");
    window.localStorage.setItem("perspectra_other", "other");
    window.localStorage.setItem("unrelated_local", "keep local");

    clearUserScopedClientState();

    expect(window.sessionStorage.getItem("perspectra_workspace_v2")).toBeNull();
    expect(window.sessionStorage.getItem("perspectra_pending_save_v1")).toBeNull();
    expect(window.sessionStorage.getItem("perspectra_custom_key")).toBeNull();
    expect(window.sessionStorage.getItem("unrelated_key")).toBe("keep this");

    expect(window.localStorage.getItem("perspectra_workspace_v2")).toBeNull();
    expect(window.localStorage.getItem("perspectra_other")).toBeNull();
    expect(window.localStorage.getItem("unrelated_local")).toBe("keep local");
  });

  it("registers and cancels pending write timers", () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const timer1 = setTimeout(spy, 1000);
    const timer2 = setTimeout(spy, 2000);

    const unregister1 = registerPendingWriteTimer(timer1);
    registerPendingWriteTimer(timer2);

    expect(getPendingWriteTimerCount()).toBe(2);

    // Cancel all
    cancelPendingWriteTimers();
    expect(getPendingWriteTimerCount()).toBe(0);

    vi.advanceTimersByTime(3000);
    expect(spy).not.toHaveBeenCalled();

    unregister1();
  });

  describe("Pending Save hardening (Phase 8d)", () => {
    const dummyPayload = {
      input: {
        decisionType: "career" as const,
        decision: "Should I take the job offer?",
        reasons: "Good salary and benefits.",
        context: "Remote work option.",
      },
      analysis: {
        decision_summary: "Decision analysis summary",
        reasoning_map: [],
        findings: [],
        premortem_questions: [],
        high_stakes_domain: "none" as const,
        closing_note: "Neutral closing note",
      },
      receipt: {
        language_check: "passed" as const,
        findings_total: 0,
        findings_grounded: 0,
        quotes_dropped: 0,
        retried: false,
      },
      triage: {},
      notes: "My personal reflections",
      certaintyBefore: 3,
      certaintyAfter: 4,
    };

    it("setPendingSave stores payload with metadata (createdAt, initiatedBySave: true)", () => {
      const fixedNow = 1700000000000;
      setPendingSave(dummyPayload, fixedNow);

      const raw = window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual(dummyPayload);
      expect(parsed.createdAt).toBe(fixedNow);
      expect(parsed.initiatedBySave).toBe(true);
    });

    it("getPendingSave retrieves stored payload within 10-minute expiry", () => {
      const now = 1700000000000;
      setPendingSave(dummyPayload, now);

      // 5 minutes later (300,000 ms)
      const later = now + 5 * 60 * 1000;
      const retrieved = getPendingSave(later);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.data.input.decision).toBe("Should I take the job offer?");
      expect(retrieved?.initiatedBySave).toBe(true);
    });

    it("getPendingSave discards payload and clears storage if older than 10 minutes", () => {
      const now = 1700000000000;
      setPendingSave(dummyPayload, now);

      // 10 minutes and 1 second later
      const expiredNow = now + PENDING_SAVE_EXPIRY_MS + 1000;
      const retrieved = getPendingSave(expiredNow);
      expect(retrieved).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("getPendingSave discards payload and clears storage if createdAt is in the future", () => {
      const now = 1700000000000;
      setPendingSave(dummyPayload, now);

      const pastClock = now - 5000;
      const retrieved = getPendingSave(pastClock);
      expect(retrieved).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("getPendingSave discards invalid payload without initiatedBySave flag", () => {
      window.sessionStorage.setItem(
        PENDING_SAVE_STORAGE_KEY,
        JSON.stringify({
          data: dummyPayload,
          createdAt: Date.now(),
          initiatedBySave: false, // Invalid flag
        })
      );

      const retrieved = getPendingSave();
      expect(retrieved).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("getPendingSave discards corrupted JSON", () => {
      window.sessionStorage.setItem(PENDING_SAVE_STORAGE_KEY, "{ corrupted JSON");
      const retrieved = getPendingSave();
      expect(retrieved).toBeNull();
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("clearPendingSave removes pending save item from sessionStorage", () => {
      setPendingSave(dummyPayload);
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      clearPendingSave();
      expect(window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("getPendingSave handles non-object JSON values such as primitives and null", () => {
      window.sessionStorage.setItem(PENDING_SAVE_STORAGE_KEY, "null");
      expect(getPendingSave()).toBeNull();

      window.sessionStorage.setItem(PENDING_SAVE_STORAGE_KEY, "42");
      expect(getPendingSave()).toBeNull();

      window.sessionStorage.setItem(
        PENDING_SAVE_STORAGE_KEY,
        JSON.stringify({ createdAt: Date.now(), initiatedBySave: true })
      );
      expect(getPendingSave()).toBeNull();

      window.sessionStorage.setItem(
        PENDING_SAVE_STORAGE_KEY,
        JSON.stringify({ data: dummyPayload, createdAt: "invalid", initiatedBySave: true })
      );
      expect(getPendingSave()).toBeNull();
    });

    it("gracefully handles storage exceptions during set, get, and clear operations", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => setPendingSave(dummyPayload)).not.toThrow();
      setItemSpy.mockRestore();

      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      expect(getPendingSave()).toBeNull();
      getItemSpy.mockRestore();

      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("StorageDisabled");
      });
      expect(() => clearPendingSave()).not.toThrow();
      expect(() => clearUserScopedClientState()).not.toThrow();
      removeItemSpy.mockRestore();
    });

    it("handles SSR / undefined window without throwing", () => {
      const originalWindow = global.window;
      try {
        // @ts-expect-error simulating non-browser environment
        delete global.window;

        expect(() => setPendingSave(dummyPayload)).not.toThrow();
        expect(getPendingSave()).toBeNull();
        expect(() => clearPendingSave()).not.toThrow();
        expect(() => clearUserScopedClientState()).not.toThrow();
      } finally {
        global.window = originalWindow;
      }
    });
  });
});
