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
} from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(firebaseConfigured && auth));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
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
      setUser(result.user);
      return result.user;
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || "";

      if (
        errorCode === "auth/popup-closed-by-user" ||
        errorCode === "auth/cancelled-popup-request"
      ) {
        // User voluntarily dismissed popup: no error message
        setAuthError(null);
      } else if (errorCode === "auth/popup-blocked") {
        setAuthError(
          "Your browser blocked the sign-in window. Allow pop-ups and try again."
        );
      } else if (errorCode === "auth/network-request-failed") {
        setAuthError(
          "We couldn't reach the sign-in service. Check your connection and try again."
        );
      } else if (errorCode === "auth/unauthorized-domain") {
        setAuthError("This site's address isn't authorised for sign-in yet.");
      } else {
        setAuthError("Sign-in didn't work. Please try again.");
      }
      return null;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: firebaseConfigured,
        signInWithGoogle,
        signOut,
        authError,
        clearAuthError,
      }}
    >
      {children}
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
