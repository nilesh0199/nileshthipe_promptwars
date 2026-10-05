"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";

export function EmailVerificationBanner() {
  const { user, emailVerified, signInMethod, resendVerification } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!user || emailVerified || signInMethod !== "password" || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (countdown > 0 || isSending) return;
    setIsSending(true);
    try {
      await resendVerification();
      setCountdown(60);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Email verification notice"
      className="w-full bg-[#fdf7ee] border-b border-[#ebd1a4] px-4 py-2.5 sm:px-6 transition-all"
    >
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3 text-[15px] sm:text-[16px] text-[#18263e]">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-[#b46b19] shrink-0"
            aria-hidden="true"
          />
          <p>
            Please verify your email. We sent a link to{" "}
            <strong className="font-semibold">{user.email}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleResend}
            disabled={countdown > 0 || isSending}
            aria-disabled={countdown > 0 || isSending}
            className="min-h-[44px] px-3.5 py-1.5 text-[15px] font-medium text-[#18263e] bg-[#ffffff] border border-[#ebd1a4] rounded-lg hover:bg-[#faf8f5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            {countdown > 0 ? `Resend (${countdown}s)` : isSending ? "Sending..." : "Resend"}
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss email verification banner"
            className="min-h-[44px] px-3 py-1.5 text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
