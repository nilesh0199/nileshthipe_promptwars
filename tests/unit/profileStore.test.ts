import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfile, saveProfile, ensureProfile } from "@/lib/profileStore";
import type { User } from "firebase/auth";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db, collection, id) => ({ collection, id }));
const mockServerTimestamp = vi.fn(() => "MOCK_TIMESTAMP");
const mockUpdateProfile = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (db: unknown, collection: string, id: string) => mockDoc(db, collection, id),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (ref: unknown, data: unknown, options?: unknown) => mockSetDoc(ref, data, options),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock("firebase/auth", () => ({
  updateProfile: (user: unknown, profile: unknown) => mockUpdateProfile(user, profile),
}));

vi.mock("@/lib/firebase", () => ({
  db: { _type: "mockDb" },
  auth: {
    currentUser: {
      uid: "user_123",
      displayName: "Initial Name",
      email: "user@example.com",
    },
  },
  firebaseConfigured: true,
}));

describe("Profile Store (lib/profileStore.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProfile returns null when document does not exist", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
    });

    const result = await getProfile("user_123");
    expect(result).toBeNull();
    expect(mockDoc).toHaveBeenCalledWith({ _type: "mockDb" }, "profiles", "user_123");
  });

  it("getProfile returns formatted profile when document exists", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        displayName: "Ada Lovelace",
        age: 36,
        profession: "Mathematician",
        createdAt: "TIME_1",
        updatedAt: "TIME_2",
      }),
    });

    const result = await getProfile("user_123");
    expect(result).toEqual({
      displayName: "Ada Lovelace",
      age: 36,
      profession: "Mathematician",
      createdAt: "TIME_1",
      updatedAt: "TIME_2",
    });
  });

  it("saveProfile sets createdAt only on first creation and synchronizes auth displayName", async () => {
    // 1. Initial creation (doc does not exist)
    mockGetDoc.mockResolvedValueOnce({
      exists: () => false,
    });

    await saveProfile("user_123", {
      displayName: "Charles Babbage",
      age: 50,
      profession: "Inventor",
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      { collection: "profiles", id: "user_123" },
      {
        displayName: "Charles Babbage",
        age: 50,
        profession: "Inventor",
        createdAt: "MOCK_TIMESTAMP",
        updatedAt: "MOCK_TIMESTAMP",
      },
      { merge: true }
    );

    // Verify auth.currentUser displayName was synchronized
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "user_123" }),
      { displayName: "Charles Babbage" }
    );

    // 2. Existing profile update (does not overwrite createdAt)
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
    });

    await saveProfile("user_123", {
      displayName: "Charles Updated",
      age: "51",
      profession: "",
    });

    expect(mockSetDoc).toHaveBeenCalledWith(
      { collection: "profiles", id: "user_123" },
      {
        displayName: "Charles Updated",
        age: 51,
        profession: null,
        updatedAt: "MOCK_TIMESTAMP",
      },
      { merge: true }
    );
  });

  it("ensureProfile creates a default profile if none exists", async () => {
    // Non-existent profile -> creates default profile with fallback name
    mockGetDoc.mockResolvedValueOnce({ exists: () => false }); // getProfile
    mockGetDoc.mockResolvedValueOnce({ exists: () => false }); // saveProfile isNew check

    const mockUser = {
      uid: "user_456",
      displayName: "Grace Hopper",
      email: "grace@navy.mil",
    } as unknown as User;

    await ensureProfile(mockUser);

    expect(mockSetDoc).toHaveBeenCalledWith(
      { collection: "profiles", id: "user_456" },
      expect.objectContaining({
        displayName: "Grace Hopper",
      }),
      { merge: true }
    );
  });

  it("ensureProfile does nothing if profile already exists", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ displayName: "Existing" }),
    });

    const mockUser = {
      uid: "user_456",
      displayName: "Grace Hopper",
      email: "grace@navy.mil",
    } as unknown as User;

    await ensureProfile(mockUser);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
