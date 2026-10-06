"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, firebaseConfigured } from "@/lib/firebase";
import { resolveDisplayName } from "@/lib/profile";
import { saveProfile, ensureProfile } from "@/lib/profileStore";
import { cancelPendingWriteTimers, clearUserScopedClientState } from "@/lib/clientState";

export type SignInMethod = "google" | "password" | null;

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  displayName: string;
  email: string | null;
  signInMethod: SignInMethod;
  sessionEpoch: number;
  signOutNotice: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signUpWithEmail: (params: {
    name: string;
    email: string;
    password: string;
  }) => Promise<User | null>;
  signInWithEmail: (params: {
    email: string;
    password: string;
  }) => Promise<User | null>;
  sendPasswordReset: (email: string) => Promise<string>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Maps Firebase Auth error codes to calm, human-friendly messages without account enumeration.
 */
export function mapAuthError(errorCode: string): string {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in.";
    case "auth/weak-password":
      return "Choose a stronger password (at least 8 characters).";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "We couldn't reach the sign-in service. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't enabled yet.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    case "auth/unauthorized-domain":
      return "This site's address isn't authorised for sign-in yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function computeSignInMethod(user: User | null): SignInMethod {
  if (!user || !Array.isArray(user.providerData)) return null;
  if (user.providerData.some((p) => p?.providerId === "google.com")) {
    return "google";
  }
  if (user.providerData.some((p) => p?.providerId === "password")) {
    return "password";
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(firebaseConfigured && auth));
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionEpoch, setSessionEpoch] = useState<number>(0);
  const [signOutNotice, setSignOutNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          await ensureProfile(currentUser);
        }
        setUser(currentUser);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthError(null);

    if (!firebaseConfigured || !auth) {
      setAuthError("Sign-in isn't available right now.");
      return null;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      await ensureProfile(result.user);
      setUser(result.user);
      return result.user;
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || "";
      const msg = mapAuthError(errorCode);
      setAuthError(msg || null);
      return null;
    }
  }, []);

  const signUpWithEmail = useCallback(
    async ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }): Promise<User | null> => {
      setAuthError(null);

      if (!firebaseConfigured || !auth) {
        setAuthError("Sign-in isn't available right now.");
        return null;
      }

      try {
        const trimmedName = name.trim();
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const newUser = cred.user;

        // 1. Update auth display name
        await updateProfile(newUser, { displayName: trimmedName });

        // 2. Create profile document
        await saveProfile(newUser.uid, { displayName: trimmedName });

        // 3. Refresh auth state
        if (typeof newUser.reload === "function") {
          await newUser.reload();
        }
        const updatedUser = auth.currentUser || newUser;
        setUser(updatedUser);
        return updatedUser;
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || "";
        const msg = mapAuthError(errorCode);
        setAuthError(msg);
        return null;
      }
    },
    []
  );

  const signInWithEmail = useCallback(
    async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<User | null> => {
      setAuthError(null);

      if (!firebaseConfigured || !auth) {
        setAuthError("Sign-in isn't available right now.");
        return null;
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureProfile(cred.user);
        setUser(cred.user);
        return cred.user;
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || "";
        const msg = mapAuthError(errorCode);
        setAuthError(msg);
        return null;
      }
    },
    []
  );

  const sendPasswordReset = useCallback(
    async (email: string): Promise<string> => {
      setAuthError(null);
      const alwaysMessage =
        "If an account exists for that email, we've sent a reset link.";

      if (!firebaseConfigured || !auth) {
        setAuthError("Sign-in isn't available right now.");
        return alwaysMessage;
      }

      try {
        await sendPasswordResetEmail(auth, email.trim());
      } catch {
        // Never leak whether the email exists
      }
      return alwaysMessage;
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    // 1. Cancel any pending debounced write timers
    cancelPendingWriteTimers();

    // 2. Clear all user-scoped client state from browser storage
    clearUserScopedClientState();

    // 3. Sign out of Firebase
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch {
        // Non-fatal if network error
      }
    }

    // 4. Reset user and increment session epoch to unmount/reset in-memory components
    setUser(null);
    setSessionEpoch((prev) => prev + 1);

    // 5. Return to landing page
    try {
      router.push("/");
    } catch {
      // Safe in test environments
    }

    // 6. Announce sign-out confirmation in polite aria-live region
    setSignOutNotice("You've been signed out.");
    setTimeout(() => {
      setSignOutNotice(null);
    }, 4000);
  }, [router]);

  const displayName = resolveDisplayName({
    authName: user?.displayName,
    email: user?.email,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: firebaseConfigured,
        displayName,
        email: user?.email || null,
        signInMethod: computeSignInMethod(user),
        sessionEpoch,
        signOutNotice,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        sendPasswordReset,
        signOut,
        authError,
        clearAuthError,
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {signOutNotice}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
