import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAnalysisDoc,
  decideSaveAction,
  sanitizeForFirestore,
  type BuildAnalysisDocParams,
} from "@/lib/savedDoc";
import {
  saveAnalysis,
  updateAnalysis,
  getAnalysis,
  deleteAnalysis,
  listAnalyses,
  deleteAllAnalyses,
} from "@/lib/saved";

// Mock firebase/firestore module
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockWriteBatch = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _methodName: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock("@/lib/firebase", () => ({
  db: { _type: "mock_firestore_db" },
  firebaseConfigured: true,
}));

describe("savedDoc Pure Module (lib/savedDoc.ts)", () => {
  const sampleParams: BuildAnalysisDocParams = {
    input: {
      decisionType: "career",
      decision: "Should I accept the offer?",
      reasons: "Great team and role.",
      context: undefined,
    },
    analysis: {
      decision_summary: "A".repeat(200), // Should be truncated to 120 chars for title
      high_stakes_domain: "none",
      findings: [],
      premortem_questions: [],
      reasoning_map: [],
      closing_note: "Your decision.",
    },
    receipt: {
      language_check: "passed",
      retried: false,
      findings_total: 0,
      findings_grounded: 0,
      quotes_dropped: 0,
    },
    triage: { f1: "investigate" },
    notes: "My personal notes",
    certaintyBefore: 3,
    certaintyAfter: null,
  };

  it("buildAnalysisDoc sets uid, truncates title to 120 chars, and enforces allowed keys without undefined", () => {
    const doc = buildAnalysisDoc("user_12345", sampleParams);

    expect(doc.uid).toBe("user_12345");
    expect(doc.title.length).toBe(120);
    expect(doc.title).toBe("A".repeat(120));

    const expectedKeys = [
      "uid",
      "title",
      "input",
      "analysis",
      "receipt",
      "triage",
      "notes",
      "certaintyBefore",
      "certaintyAfter",
    ].sort();
    expect(Object.keys(doc).sort()).toEqual(expectedKeys);

    // Verify no undefined anywhere
    expect(doc.certaintyAfter).toBeNull();
    expect(doc.input.context).toBe("");
  });

  it("sanitizeForFirestore converts undefined values to null recursively", () => {
    const nested = {
      a: undefined,
      b: "valid",
      c: [undefined, { d: undefined, e: 42 }],
    };
    const sanitized = sanitizeForFirestore(nested);
    expect(sanitized.a).toBeNull();
    expect(sanitized.b).toBe("valid");
    expect(sanitized.c[0]).toBeNull();
    const item = (sanitized.c as Array<{ d?: unknown; e?: number }>)[1];
    expect(item?.d).toBeNull();
    expect(item?.e).toBe(42);
  });

  it("decideSaveAction returns 'prompt-sign-in' for guest and 'save' for authenticated user", () => {
    expect(decideSaveAction(null)).toBe("prompt-sign-in");
    expect(decideSaveAction(undefined)).toBe("prompt-sign-in");
    expect(decideSaveAction({} as { uid?: string })).toBe("prompt-sign-in");
    expect(decideSaveAction({ uid: "" })).toBe("prompt-sign-in");
    expect(decideSaveAction({ uid: "   " })).toBe("prompt-sign-in");

    expect(decideSaveAction({ uid: "google_user_999" })).toBe("save");
  });
});

describe("Firestore Saved Analyses (lib/saved.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveAnalysis writes owner uid, timestamps, and only allowed keys", async () => {
    mockCollection.mockReturnValue("analyses_collection_ref");
    mockAddDoc.mockResolvedValue({ id: "doc_saved_abc" });

    const params: BuildAnalysisDocParams = {
      input: {
        decisionType: "study",
        decision: "Study in UK or US?",
        reasons: "Cost vs opportunity.",
        context: "Have scholarships.",
      },
      analysis: {
        decision_summary: "Choosing a study destination",
        reasoning_map: [],
        findings: [],
        premortem_questions: [],
        high_stakes_domain: "none",
        closing_note: "Your decision.",
      },
      receipt: {
        language_check: "passed",
        findings_total: 0,
        findings_grounded: 0,
        quotes_dropped: 0,
        retried: false,
      },
      triage: { f1: "investigate" },
      notes: "Researching visa rules.",
      certaintyBefore: 2,
      certaintyAfter: 4,
    };

    const docId = await saveAnalysis("user_owner_456", params);

    expect(docId).toBe("doc_saved_abc");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);

    const savedPayload = mockAddDoc.mock.calls[0][1];
    expect(savedPayload.uid).toBe("user_owner_456");
    expect(savedPayload.title).toBe("Choosing a study destination");
    expect(savedPayload.createdAt).toBeDefined();
    expect(savedPayload.updatedAt).toBeDefined();
    expect(savedPayload.triage).toEqual({ f1: "investigate" });
  });

  it("updateAnalysis sends only triage, notes, certaintyAfter, and updatedAt", async () => {
    mockDoc.mockReturnValue("doc_ref_xyz");
    mockUpdateDoc.mockResolvedValue(undefined);

    await updateAnalysis("doc_xyz", {
      triage: { f1: "considered", f2: "investigate" },
      notes: "Updated thinking",
      certaintyAfter: 5,
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updates = mockUpdateDoc.mock.calls[0][1];

    expect(updates.triage).toEqual({ f1: "considered", f2: "investigate" });
    expect(updates.notes).toBe("Updated thinking");
    expect(updates.certaintyAfter).toBe(5);
    expect(updates.updatedAt).toBeDefined();
    // Must NOT contain input or analysis overwrites
    expect(updates.input).toBeUndefined();
    expect(updates.analysis).toBeUndefined();
    expect(updates.uid).toBeUndefined();
  });

  it("listAnalyses queries by owner uid and sorts by createdAt descending in client code", async () => {
    mockCollection.mockReturnValue("analyses_collection_ref");
    mockQuery.mockReturnValue("query_ref");

    const mockDocs = [
      {
        id: "doc-older",
        data: () => ({
          uid: "user_owner",
          title: "Older Decision",
          createdAt: { toMillis: () => 1000 },
        }),
      },
      {
        id: "doc-newer",
        data: () => ({
          uid: "user_owner",
          title: "Newer Decision",
          createdAt: { toMillis: () => 2000 },
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => mockDocs.forEach(callback),
    });

    const results = await listAnalyses("user_owner");

    expect(results.length).toBe(2);
    // Newer document must appear first due to client-side sort
    expect(results[0].id).toBe("doc-newer");
    expect(results[1].id).toBe("doc-older");
  });

  it("deleteAllAnalyses batches document deletions for the user", async () => {
    mockCollection.mockReturnValue("analyses_collection_ref");
    mockQuery.mockReturnValue("query_ref");

    const mockBatch = {
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    mockWriteBatch.mockReturnValue(mockBatch);

    const mockDocs = [
      { id: "doc-1", ref: "ref-1" },
      { id: "doc-2", ref: "ref-2" },
      { id: "doc-3", ref: "ref-3" },
    ];

    mockGetDocs.mockResolvedValue({
      empty: false,
      forEach: (callback: (doc: unknown) => void) => mockDocs.forEach(callback),
    });

    await deleteAllAnalyses("user_owner");

    expect(mockBatch.delete).toHaveBeenCalledTimes(3);
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-1");
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-2");
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-3");
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it("deleteAllAnalyses returns early when snapshot is empty", async () => {
    mockCollection.mockReturnValue("analyses_collection_ref");
    mockQuery.mockReturnValue("query_ref");
    mockGetDocs.mockResolvedValue({ empty: true });

    await deleteAllAnalyses("user_owner");
    expect(mockWriteBatch).not.toHaveBeenCalled();
  });

  it("getAnalysis returns document when found, null when not found", async () => {
    mockDoc.mockReturnValue("doc_ref");
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: "doc-123",
      data: () => ({ title: "Found Title", uid: "u1" }),
    });

    const res = await getAnalysis("doc-123");
    expect(res).toEqual({ id: "doc-123", title: "Found Title", uid: "u1" });

    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
    });

    const resNull = await getAnalysis("doc-missing");
    expect(resNull).toBeNull();
  });

  it("deleteAnalysis calls deleteDoc with correct doc reference", async () => {
    mockDoc.mockReturnValue("doc_ref_delete");
    await deleteAnalysis("doc-del-456");
    expect(mockDeleteDoc).toHaveBeenCalledWith("doc_ref_delete");
  });

  it("updateAnalysis correctly updates certaintyAfter (both number and null), triage, and notes", async () => {
    mockDoc.mockReturnValue("doc_ref_update");

    await updateAnalysis("doc-update-1", {
      certaintyAfter: 4,
      notes: "Updated note",
      triage: { f1: "investigate" },
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "doc_ref_update",
      expect.objectContaining({
        certaintyAfter: 4,
        notes: "Updated note",
        triage: { f1: "investigate" },
      })
    );

    // Update with certaintyAfter null
    await updateAnalysis("doc-update-1", {
      certaintyAfter: null,
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      "doc_ref_update",
      expect.objectContaining({
        certaintyAfter: null,
      })
    );
  });

  it("handles diverse timestamp formats (Date, seconds, number, null) in listAnalyses", async () => {
    mockCollection.mockReturnValue("analyses_collection_ref");
    mockQuery.mockReturnValue("query_ref");

    const mockDocs = [
      { id: "d-null", data: () => ({ createdAt: null }) },
      { id: "d-seconds", data: () => ({ createdAt: { seconds: 50 } }) },
      { id: "d-date", data: () => ({ createdAt: new Date(20000) }) },
      { id: "d-num", data: () => ({ createdAt: 30000 }) },
    ];

    mockGetDocs.mockResolvedValue({
      forEach: (callback: (doc: unknown) => void) => mockDocs.forEach(callback),
    });

    const results = await listAnalyses("user_owner");
    expect(results.length).toBe(4);
    // Highest millis (d-seconds = 50000ms) should be first
    expect(results[0].id).toBe("d-seconds");
    expect(results[1].id).toBe("d-num");
    expect(results[2].id).toBe("d-date");
    expect(results[3].id).toBe("d-null");
  });
});
