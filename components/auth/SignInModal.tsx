"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "./AuthProvider";

export interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  initialMode?: "login" | "signup";
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  triggerRef,
  initialMode = "login",
}: SignInModalProps) {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    authError,
    clearAuthError,
    configured,
  } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "reset">(initialMode);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync mode with initialMode when opened
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMode(initialMode);
      setErrors({});
      setResetMessage(null);
    }
  }

  // Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement =
      triggerRef?.current || (document.activeElement as HTMLElement | null);

    const timer = setTimeout(() => {
      if (!dialogRef.current?.contains(document.activeElement)) {
        firstFocusableRef.current?.focus();
      }
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
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement?.focus();
    };
  }, [isOpen, onClose, triggerRef]);

  const handleContinueWithGoogle = useCallback(async () => {
    clearAuthError();
    setIsGoogleSubmitting(true);
    const user = await signInWithGoogle();
    setIsGoogleSubmitting(false);

    if (user) {
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    }
  }, [signInWithGoogle, onSuccess, onClose, clearAuthError]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    const newErrors: { name?: string; email?: string; password?: string } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Please enter your email.";
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      newErrors.email = "That email address doesn't look right.";
    }

    if (mode === "reset") {
      if (newErrors.email) {
        setErrors(newErrors);
        emailInputRef.current?.focus();
        return;
      }
      setIsSubmitting(true);
      const msg = await sendPasswordReset(trimmedEmail);
      setIsSubmitting(false);
      setResetMessage(msg);
      return;
    }

    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        newErrors.name = "Please enter your name.";
      } else if (trimmedName.length < 2) {
        newErrors.name = "Name must be at least 2 characters.";
      } else if (trimmedName.length > 60) {
        newErrors.name = "Name must be 60 characters or fewer.";
      }

      if (!password) {
        newErrors.password = "Please enter a password.";
      } else if (password.length < 8) {
        newErrors.password = "Choose a stronger password (at least 8 characters).";
      }
    } else {
      // login mode
      if (!password) {
        newErrors.password = "Please enter your password.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (newErrors.name) {
        nameInputRef.current?.focus();
      } else if (newErrors.email) {
        emailInputRef.current?.focus();
      } else if (newErrors.password) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    let loggedInUser = null;
    if (mode === "signup") {
      loggedInUser = await signUpWithEmail({
        name,
        email: trimmedEmail,
        password,
      });
    } else {
      loggedInUser = await signInWithEmail({
        email: trimmedEmail,
        password,
      });
    }

    setIsSubmitting(false);

    if (loggedInUser) {
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const isBusy = isSubmitting || isGoogleSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18263e]/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-desc"
        className="w-full max-w-md bg-[#faf8f5] border border-[#dbd4c7] rounded-2xl p-6 sm:p-7 shadow-lg space-y-5 animate-in fade-in duration-200"
      >
        {/* Brand Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-mark.png"
              width={24}
              height={24}
              alt=""
              className="w-6 h-6 rounded-[6px] overflow-hidden object-cover shrink-0 select-none"
            />
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
              Perspectra Account
            </span>
          </div>

          <h2
            id="auth-modal-title"
            className="font-serif font-bold text-[#18263e] text-[22px] sm:text-[24px]"
          >
            {mode === "reset"
              ? "Reset your password"
              : mode === "signup"
              ? "Create your account"
              : "Sign in to save your analyses"}
          </h2>

          <p
            id="auth-modal-desc"
            className="text-[16px] text-[#4e5e77] leading-relaxed"
          >
            {mode === "reset"
              ? "Enter your email address to receive a password reset link."
              : mode === "signup"
              ? "Create a private account to save and revisit your analyses."
              : "Sign in to save your analyses. They stay private to your account."}
          </p>
        </div>

        {/* Unconfigured Notice */}
        {!configured && (
          <div
            role="status"
            className="p-3.5 bg-[#f3ede2] border border-[#dbd4c7] rounded-xl text-[16px] text-[#4e5e77] space-y-1"
          >
            <p className="font-semibold text-[#18263e]">
              Sign-in isn&apos;t available right now
            </p>
            <p className="text-[15px]">
              Authentication is currently not configured. You can continue
              using Perspectra as a guest.
            </p>
          </div>
        )}

        {/* Server Error Alert */}
        {authError && (
          <div
            role="alert"
            className="p-3.5 bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl text-[16px] text-[#b46b19]"
          >
            {authError}
          </div>
        )}

        {/* Reset Success Status */}
        {resetMessage && (
          <div
            role="status"
            className="p-3.5 bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl text-[16px] text-[#18263e]"
          >
            {resetMessage}
          </div>
        )}

        {/* Mode Selector Tabs (only shown when not in reset view) */}
        {mode !== "reset" && (
          <div
            role="tablist"
            aria-label="Authentication modes"
            className="flex border-b border-[#dbd4c7] gap-4"
          >
            <button
              ref={firstFocusableRef}
              type="button"
              role="tab"
              id="tab-login"
              aria-selected={mode === "login"}
              aria-controls="panel-login"
              onClick={() => {
                setMode("login");
                setErrors({});
                clearAuthError();
              }}
              className={`pb-2.5 text-[16px] font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                mode === "login"
                  ? "border-[#18263e] text-[#18263e]"
                  : "border-transparent text-[#6c7c94] hover:text-[#18263e]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              id="tab-signup"
              aria-selected={mode === "signup"}
              aria-controls="panel-signup"
              onClick={() => {
                setMode("signup");
                setErrors({});
                clearAuthError();
              }}
              className={`pb-2.5 text-[16px] font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                mode === "signup"
                  ? "border-[#18263e] text-[#18263e]"
                  : "border-transparent text-[#6c7c94] hover:text-[#18263e]"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {/* Continue with Google button (shown on both login and signup) */}
        {mode !== "reset" && (
          <>
            <button
              type="button"
              disabled={isBusy || !configured}
              onClick={handleContinueWithGoogle}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#dbd4c7] bg-[#ffffff] hover:bg-[#faf8f5] text-[#18263e] font-semibold text-[16px] flex items-center justify-center gap-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isGoogleSubmitting ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative flex py-1 items-center" aria-hidden="true">
              <div className="flex-grow border-t border-[#dbd4c7]"></div>
              <span className="flex-shrink mx-3 text-[15px] text-[#6c7c94]">or</span>
              <div className="flex-grow border-t border-[#dbd4c7]"></div>
            </div>
          </>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
          {/* Name Field (Create account only) */}
          {mode === "signup" && (
            <div className="space-y-1">
              <label
                htmlFor="auth-name"
                className="block text-[16px] font-medium text-[#18263e]"
              >
                Name
              </label>
              <input
                ref={nameInputRef}
                id="auth-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-describedby={errors.name ? "name-error" : undefined}
                aria-invalid={Boolean(errors.name)}
                disabled={isBusy}
                className="w-full min-h-[46px] px-3.5 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
              />
              {errors.name && (
                <p id="name-error" className="text-[15px] text-[#b46b19] font-medium">
                  {errors.name}
                </p>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-1">
            <label
              htmlFor="auth-email"
              className="block text-[16px] font-medium text-[#18263e]"
            >
              Email
            </label>
            <input
              ref={emailInputRef}
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={Boolean(errors.email)}
              disabled={isBusy}
              className="w-full min-h-[46px] px-3.5 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
            />
            {errors.email && (
              <p id="email-error" className="text-[15px] text-[#b46b19] font-medium">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field (not shown in reset mode) */}
          {mode !== "reset" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="block text-[16px] font-medium text-[#18263e]"
                >
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setErrors({});
                      clearAuthError();
                    }}
                    className="text-[15px] text-[#18263e] hover:text-[#b46b19] font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-describedby={
                    errors.password
                      ? "password-error"
                      : mode === "signup"
                      ? "password-hint"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.password)}
                  disabled={isBusy}
                  className="w-full min-h-[46px] pl-3.5 pr-20 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] px-2 text-[14px] font-medium text-[#6c7c94] hover:text-[#18263e] cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "signup" && !errors.password && (
                <p id="password-hint" className="text-[15px] text-[#6c7c94]">
                  At least 8 characters
                </p>
              )}

              {errors.password && (
                <p id="password-error" className="text-[15px] text-[#b46b19] font-medium">
                  {errors.password}
                </p>
              )}
            </div>
          )}

          {/* Action Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isBusy || !configured}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#18263e] text-[#faf8f5] font-semibold text-[16px] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isSubmitting
                ? "Processing..."
                : mode === "reset"
                ? "Send reset link"
                : mode === "signup"
                ? "Create account"
                : "Log in"}
            </button>
          </div>
        </form>

        {/* Footer Navigation within Modal */}
        <div className="pt-2 border-t border-[#f3ede2] text-center text-[15px] text-[#6c7c94]">
          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrors({});
                clearAuthError();
              }}
              className="font-medium text-[#18263e] hover:text-[#b46b19] cursor-pointer"
            >
              &larr; Back to log in
            </button>
          ) : mode === "login" ? (
            <p>
              New here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrors({});
                  clearAuthError();
                }}
                className="font-semibold text-[#18263e] hover:text-[#b46b19] underline cursor-pointer"
              >
                Create account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrors({});
                  clearAuthError();
                }}
                className="font-semibold text-[#18263e] hover:text-[#b46b19] underline cursor-pointer"
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const SignInModal = AuthModal;
