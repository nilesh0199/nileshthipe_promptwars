"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthProvider";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function SignInModal({
  isOpen,
  onClose,
  onSuccess,
  triggerRef,
}: SignInModalProps) {
  const { signInWithGoogle, authError, configured } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    // Save active element if triggerRef not provided
    const previousActiveElement =
      triggerRef?.current || (document.activeElement as HTMLElement | null);

    // Focus the initial interactive button
    const timer = setTimeout(() => {
      firstFocusableRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements);
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Prevent background scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      // Return focus to trigger
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  const handleContinueWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    const user = await signInWithGoogle();
    setIsSigningIn(false);

    if (user) {
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    }
  }, [signInWithGoogle, onSuccess, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18263e]/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-modal-title"
        aria-describedby="signin-modal-desc"
        className="w-full max-w-md bg-[#faf8f5] border border-[#dbd4c7] rounded-2xl p-6 sm:p-7 shadow-lg space-y-5 animate-in fade-in duration-200"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md bg-[#18263e] flex items-center justify-center text-[#faf8f5] font-serif font-bold text-xs select-none"
              aria-hidden="true"
            >
              P
            </span>
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
              Perspectra Account
            </span>
          </div>

          <h2
            id="signin-modal-title"
            className="font-serif font-bold text-[#18263e] text-[22px] sm:text-[24px]"
          >
            Sign in to save your analyses
          </h2>

          <p
            id="signin-modal-desc"
            className="text-[15px] sm:text-[16px] text-[#4e5e77] leading-relaxed"
          >
            Sign in to save your analyses. They stay private to your account.
          </p>
        </div>

        {/* Unconfigured Notice */}
        {!configured && (
          <div
            role="status"
            className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] p-3 text-[14px] text-[#6c7c94]"
          >
            Sign-in isn&apos;t available right now.
          </div>
        )}

        {/* Error Alert */}
        {authError && (
          <div
            role="alert"
            className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] p-3 text-[14px] text-[#b46b19] font-medium"
          >
            {authError}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            ref={firstFocusableRef}
            type="button"
            disabled={isSigningIn || !configured}
            onClick={handleContinueWithGoogle}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl font-semibold text-[15px] sm:text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xs"
          >
            {/* Minimal SVG Google G icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] px-5 py-2 text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] hover:bg-[#f3ede2] rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
