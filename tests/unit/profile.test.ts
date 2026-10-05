import { describe, it, expect } from "vitest";
import {
  validateProfile,
  buildProfileDoc,
  resolveDisplayName,
} from "@/lib/profile";
import { mapAuthError } from "@/components/auth/AuthProvider";
import { AnalyzeRequestSchema } from "@/lib/schema";
import { buildUserPrompt, buildSystemInstruction } from "@/lib/server/prompt";

describe("Profile validation and document utilities (lib/profile.ts)", () => {
  describe("validateProfile boundaries", () => {
    it("validates displayName boundaries (1, 2, 60, 61 chars) and trimming", () => {
      // 1 char -> fails
      const oneChar = validateProfile({ displayName: "A" });
      expect(oneChar.ok).toBe(false);
      expect(oneChar.errors.displayName).toBe("Name must be at least 2 characters.");

      // 2 chars -> passes
      const twoChars = validateProfile({ displayName: "Al" });
      expect(twoChars.ok).toBe(true);
      expect(twoChars.errors.displayName).toBeUndefined();

      // 60 chars -> passes
      const sixtyChars = validateProfile({ displayName: "A".repeat(60) });
      expect(sixtyChars.ok).toBe(true);

      // 61 chars -> fails
      const sixtyOneChars = validateProfile({ displayName: "A".repeat(61) });
      expect(sixtyOneChars.ok).toBe(false);
      expect(sixtyOneChars.errors.displayName).toBe("Name must be 60 characters or fewer.");

      // Empty / whitespace only -> fails
      const empty = validateProfile({ displayName: "   " });
      expect(empty.ok).toBe(false);
      expect(empty.errors.displayName).toBe("Please enter your name.");
    });

    it("validates age boundaries (12, 13, 120, 121), decimals, non-numbers, and empty to null", () => {
      // 12 -> fails
      expect(validateProfile({ displayName: "Alice", age: 12 }).ok).toBe(false);
      expect(validateProfile({ displayName: "Alice", age: "12" }).ok).toBe(false);

      // 13 -> passes
      expect(validateProfile({ displayName: "Alice", age: 13 }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", age: "13" }).ok).toBe(true);

      // 120 -> passes
      expect(validateProfile({ displayName: "Alice", age: 120 }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", age: "120" }).ok).toBe(true);

      // 121 -> fails
      expect(validateProfile({ displayName: "Alice", age: 121 }).ok).toBe(false);
      expect(validateProfile({ displayName: "Alice", age: "121" }).ok).toBe(false);

      // Decimals -> fails
      const decimalNum = validateProfile({ displayName: "Alice", age: 25.5 });
      expect(decimalNum.ok).toBe(false);
      expect(decimalNum.errors.age).toBe("Age must be a whole number.");

      const decimalStr = validateProfile({ displayName: "Alice", age: "25.5" });
      expect(decimalStr.ok).toBe(false);
      expect(decimalStr.errors.age).toBe("Age must be a whole number.");

      // Non-numbers -> fails
      const nonNum = validateProfile({ displayName: "Alice", age: "twenty" });
      expect(nonNum.ok).toBe(false);
      expect(nonNum.errors.age).toBe("Age must be a whole number.");

      // Empty string, null, undefined -> all pass without error
      expect(validateProfile({ displayName: "Alice", age: "" }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", age: null }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", age: undefined }).ok).toBe(true);
    });

    it("validates profession boundaries (80, 81 chars) and optional values", () => {
      // 80 chars -> passes
      expect(validateProfile({ displayName: "Alice", profession: "P".repeat(80) }).ok).toBe(true);

      // 81 chars -> fails
      const eightyOne = validateProfile({ displayName: "Alice", profession: "P".repeat(81) });
      expect(eightyOne.ok).toBe(false);
      expect(eightyOne.errors.profession).toBe("Profession must be 80 characters or fewer.");

      // Empty / null / undefined -> passes
      expect(validateProfile({ displayName: "Alice", profession: "" }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", profession: null }).ok).toBe(true);
      expect(validateProfile({ displayName: "Alice", profession: undefined }).ok).toBe(true);
    });
  });

  describe("buildProfileDoc", () => {
    it("ensures output has no undefined values and converts empty to null", () => {
      const doc = buildProfileDoc({
        displayName: "  Bob Builder  ",
        age: undefined,
        profession: undefined,
      });

      expect(doc.displayName).toBe("Bob Builder");
      expect(doc.age).toBeNull();
      expect(doc.profession).toBeNull();

      // Check strictly no undefined values among keys
      expect(Object.values(doc).some((v) => v === undefined)).toBe(false);

      // Numeric age string conversion
      const docWithAge = buildProfileDoc({
        displayName: "Carol",
        age: "35",
        profession: "  Architect  ",
      });
      expect(docWithAge.age).toBe(35);
      expect(docWithAge.profession).toBe("Architect");
    });
  });

  describe("resolveDisplayName precedence", () => {
    it("prioritizes profileName > authName > email prefix > 'Account'", () => {
      // 1. profileName wins
      expect(
        resolveDisplayName({
          profileName: "Custom Name",
          authName: "Google Name",
          email: "test@example.com",
        })
      ).toBe("Custom Name");

      // 2. authName wins if profileName is empty
      expect(
        resolveDisplayName({
          profileName: "   ",
          authName: "Google Name",
          email: "test@example.com",
        })
      ).toBe("Google Name");

      // 3. email prefix wins if both names are missing
      expect(
        resolveDisplayName({
          profileName: null,
          authName: undefined,
          email: "analyst.pro@domain.org",
        })
      ).toBe("analyst.pro");

      // 4. "Account" fallback if email invalid or all empty
      expect(
        resolveDisplayName({
          profileName: "",
          authName: "",
          email: "invalid-email",
        })
      ).toBe("Account");

      expect(
        resolveDisplayName({
          profileName: null,
          authName: null,
          email: null,
        })
      ).toBe("Account");
    });
  });

  describe("Auth error mapping table", () => {
    it("maps Firebase Auth codes to calm wording and verifies credential errors are identical", () => {
      expect(mapAuthError("auth/email-already-in-use")).toBe(
        "An account with this email already exists. Try logging in."
      );
      expect(mapAuthError("auth/weak-password")).toBe(
        "Choose a stronger password (at least 8 characters)."
      );
      expect(mapAuthError("auth/invalid-email")).toBe(
        "That email address doesn't look right."
      );

      // Anti-enumeration: all three credential failures produce the exact same message
      const invalidCredentialMsg = mapAuthError("auth/invalid-credential");
      const wrongPasswordMsg = mapAuthError("auth/wrong-password");
      const userNotFoundMsg = mapAuthError("auth/user-not-found");

      expect(invalidCredentialMsg).toBe("Email or password is incorrect.");
      expect(wrongPasswordMsg).toBe("Email or password is incorrect.");
      expect(userNotFoundMsg).toBe("Email or password is incorrect.");

      expect(mapAuthError("auth/too-many-requests")).toBe(
        "Too many attempts. Please wait a few minutes and try again."
      );
      expect(mapAuthError("auth/network-request-failed")).toBe(
        "We couldn't reach the sign-in service. Check your connection and try again."
      );
      expect(mapAuthError("auth/operation-not-allowed")).toBe(
        "Email sign-in isn't enabled yet."
      );
      expect(mapAuthError("unknown/arbitrary-code")).toBe(
        "Something went wrong. Please try again."
      );
    });
  });

  describe("Profile isolation from AI requests and prompts", () => {
    it("AnalyzeRequestSchema strictly rejects profile fields (name, age, profession)", () => {
      const validPayload = {
        decisionType: "career",
        decision: "I am deciding whether to accept a senior engineering role.",
        reasons: "The compensation is higher, but the hours might be longer.",
        context: "I currently work remotely.",
      };

      // Valid without profile
      expect(AnalyzeRequestSchema.safeParse(validPayload).success).toBe(true);

      // Rejects name/displayName
      expect(
        AnalyzeRequestSchema.safeParse({ ...validPayload, displayName: "Jane Doe" }).success
      ).toBe(false);

      // Rejects age
      expect(
        AnalyzeRequestSchema.safeParse({ ...validPayload, age: 34 }).success
      ).toBe(false);

      // Rejects profession
      expect(
        AnalyzeRequestSchema.safeParse({ ...validPayload, profession: "Engineer" }).success
      ).toBe(false);

      // Rejects profile object
      expect(
        AnalyzeRequestSchema.safeParse({
          ...validPayload,
          profile: { displayName: "Jane", age: 34 },
        }).success
      ).toBe(false);
    });

    it("neither system prompt nor user prompt contains user profile values", () => {
      const mockUserProfile = {
        displayName: "Dr. Evelyn Reed",
        age: 42,
        profession: "Biochemist",
      };

      const sysPrompt = buildSystemInstruction("career");
      expect(sysPrompt).not.toContain(mockUserProfile.displayName);
      expect(sysPrompt).not.toContain(mockUserProfile.profession);
      expect(sysPrompt).not.toContain("profiles/");

      const userPrompt = buildUserPrompt({
        decisionType: "career",
        decision: "Should I accept the offer?",
        reasons: "Better salary, but more travel.",
        context: "Family lives in current city.",
      });

      expect(userPrompt).not.toContain(mockUserProfile.displayName);
      expect(userPrompt).not.toContain(mockUserProfile.profession);
      expect(userPrompt).not.toContain(String(mockUserProfile.age));
      expect(userPrompt).not.toContain("profile");
    });
  });
});
