/**
 * Pure profile validation and document construction utilities.
 * Completely decoupled from Firebase / server code.
 * Profile data is strictly account-only and NEVER sent to the AI.
 */

export interface ProfileInput {
  displayName?: string | null;
  age?: number | string | null;
  profession?: string | null;
}

export interface ProfileDoc {
  displayName: string;
  age: number | null;
  profession: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProfileValidationResult {
  ok: boolean;
  errors: {
    displayName?: string;
    age?: string;
    profession?: string;
  };
}

/**
 * Validates profile fields against boundary rules:
 * - displayName: required, 2 to 60 characters after trimming.
 * - age: optional integer between 13 and 120. Empty/blank/null becomes null. Rejects decimals and non-numeric strings.
 * - profession: optional, up to 80 characters.
 */
export function validateProfile(input: ProfileInput): ProfileValidationResult {
  const errors: ProfileValidationResult["errors"] = {};

  // 1. Display Name validation
  const trimmedName = typeof input.displayName === "string" ? input.displayName.trim() : "";
  if (!trimmedName) {
    errors.displayName = "Please enter your name.";
  } else if (trimmedName.length < 2) {
    errors.displayName = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 60) {
    errors.displayName = "Name must be 60 characters or fewer.";
  }

  // 2. Age validation
  const rawAge = input.age;
  if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
    if (typeof rawAge === "number") {
      if (!Number.isInteger(rawAge)) {
        errors.age = "Age must be a whole number.";
      } else if (rawAge < 13 || rawAge > 120) {
        errors.age = "Age must be between 13 and 120.";
      }
    } else if (typeof rawAge === "string") {
      const trimmedAge = rawAge.trim();
      if (trimmedAge !== "") {
        // Must contain only digits (no decimal points or symbols)
        if (!/^\d+$/.test(trimmedAge)) {
          errors.age = "Age must be a whole number.";
        } else {
          const parsed = parseInt(trimmedAge, 10);
          if (parsed < 13 || parsed > 120) {
            errors.age = "Age must be between 13 and 120.";
          }
        }
      }
    } else {
      errors.age = "Age must be a whole number.";
    }
  }

  // 3. Profession validation
  const rawProfession = input.profession;
  if (typeof rawProfession === "string") {
    if (rawProfession.length > 80) {
      errors.profession = "Profession must be 80 characters or fewer.";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Builds a sanitized profile document payload with strictly no undefined values.
 */
export function buildProfileDoc(values: ProfileInput): {
  displayName: string;
  age: number | null;
  profession: string | null;
} {
  const displayName = typeof values.displayName === "string" ? values.displayName.trim() : "";

  let age: number | null = null;
  if (values.age !== undefined && values.age !== null && values.age !== "") {
    if (typeof values.age === "number" && Number.isInteger(values.age)) {
      age = values.age;
    } else if (typeof values.age === "string" && /^\d+$/.test(values.age.trim())) {
      age = parseInt(values.age.trim(), 10);
    }
  }

  let profession: string | null = null;
  if (typeof values.profession === "string") {
    const trimmedProf = values.profession.trim();
    profession = trimmedProf.length > 0 ? trimmedProf : null;
  }

  return {
    displayName,
    age,
    profession,
  };
}

/**
 * Resolves a human-friendly display name with fallback precedence:
 * profileName -> authName -> email prefix -> "Account"
 */
export function resolveDisplayName(params: {
  profileName?: string | null;
  authName?: string | null;
  email?: string | null;
}): string {
  if (params.profileName && typeof params.profileName === "string" && params.profileName.trim().length > 0) {
    return params.profileName.trim();
  }
  if (params.authName && typeof params.authName === "string" && params.authName.trim().length > 0) {
    return params.authName.trim();
  }
  if (params.email && typeof params.email === "string" && params.email.includes("@")) {
    const prefix = params.email.split("@")[0].trim();
    if (prefix.length > 0) {
      return prefix;
    }
  }
  return "Account";
}
