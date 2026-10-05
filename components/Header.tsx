"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./auth/AuthProvider";
import { SignInModal } from "./auth/SignInModal";
import { EmailVerificationBanner } from "./auth/EmailVerificationBanner";
import { useView } from "./navigation/ViewContext";

export function Header() {
  const { user, loading, displayName, email, emailVerified, signInMethod, signOut } = useAuth();
  const { returnToLanding } = useView();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !avatarButtonRef.current?.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        avatarButtonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const userInitial = (displayName?.[0] || email?.[0] || "U").toUpperCase();

  return (
    <>
      <header className="w-full border-b border-[#dbd4c7] bg-[#faf8f5]/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              returnToLanding();
            }}
            aria-label="Perspectra, home"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer text-left"
          >
            <Image
              src="/brand/logo-mark.png"
              width={40}
              height={40}
              alt=""
              priority
              className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-[10px] overflow-hidden object-cover shrink-0 select-none"
            />
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#18263e]">
              Perspectra
            </span>
          </button>

          <div className="relative">
            {loading ? (
              <div className="min-h-[44px] px-3.5 py-1.5 flex items-center text-[15px] text-[#6c7c94]">
                <span className="w-2 h-2 rounded-full bg-[#dbd4c7] animate-pulse" />
              </div>
            ) : user ? (
              <div>
                <button
                  ref={avatarButtonRef}
                  type="button"
                  id="user-menu-button"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`User menu for ${displayName}`}
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="w-10 h-10 rounded-full bg-[#18263e] text-[#faf8f5] font-serif font-bold text-[16px] flex items-center justify-center hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
                >
                  {userInitial}
                </button>

                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-[#faf8f5] border border-[#dbd4c7] shadow-lg overflow-hidden z-40 focus:outline-none"
                  >
                    {/* Centered user identity block */}
                    <div className="px-4 py-3.5 border-b border-[#f3ede2] text-center flex flex-col items-center">
                      <div
                        className="w-12 h-12 rounded-full bg-[#18263e] text-[#faf8f5] font-serif font-bold text-xl flex items-center justify-center shadow-xs mb-2 select-none"
                        aria-hidden="true"
                      >
                        {userInitial}
                      </div>
                      <p className="w-full text-[15px] font-bold text-[#18263e] truncate text-center">
                        {displayName}
                      </p>
                      {email && (
                        <p className="w-full text-[13px] text-[#6c7c94] truncate text-center">
                          {email}
                        </p>
                      )}
                      {!emailVerified && signInMethod === "password" && (
                        <span className="inline-block mt-1.5 text-[11px] font-semibold text-[#b46b19] bg-[#fdf7ee] px-2 py-0.5 rounded border border-[#ebd1a4]">
                          Email not verified
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-2 text-[15px] font-medium text-[#18263e] hover:bg-[#f3ede2] transition-colors focus-visible:bg-[#f3ede2] focus-visible:outline-none cursor-pointer"
                      >
                        My profile
                      </Link>

                      <Link
                        href="/saved"
                        role="menuitem"
                        onClick={() => setIsMenuOpen(false)}
                        className="block px-4 py-2 text-[15px] font-medium text-[#18263e] hover:bg-[#f3ede2] transition-colors focus-visible:bg-[#f3ede2] focus-visible:outline-none cursor-pointer"
                      >
                        My analyses
                      </Link>

                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setIsMenuOpen(false);
                          await signOut();
                        }}
                        className="w-full text-left px-4 py-2 text-[15px] font-medium text-[#b46b19] hover:bg-[#f3ede2] transition-colors focus-visible:bg-[#f3ede2] focus-visible:outline-none cursor-pointer"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsSignInModalOpen(true)}
                className="min-h-[44px] px-3.5 py-1.5 text-[15px] sm:text-base font-medium text-[#18263e] bg-transparent border border-[#dbd4c7] rounded-lg hover:bg-[#f3ede2] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Log in / Sign up
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Dismissible email verification notice for unverified accounts */}
      <EmailVerificationBanner />

      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
}
