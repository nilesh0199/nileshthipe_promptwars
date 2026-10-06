"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInModal } from "@/components/auth/SignInModal";
import { getProfile, saveProfile } from "@/lib/profileStore";
import { validateProfile } from "@/lib/profile";

export default function ProfilePage() {
  const { user, loading: authLoading, signInMethod, displayName: authDisplayName } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  const [formData, setFormData] = useState({
    displayName: "",
    age: "",
    profession: "",
  });

  const [initialData, setInitialData] = useState({
    displayName: "",
    age: "",
    profession: "",
  });

  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    age?: string;
    profession?: string;
  }>({});
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const ageInputRef = useRef<HTMLInputElement>(null);
  const professionInputRef = useRef<HTMLInputElement>(null);

  // Reset local state during render when user changes or signs out
  const [prevUid, setPrevUid] = useState<string | null>(user?.uid ?? null);
  if (prevUid !== (user?.uid ?? null)) {
    setPrevUid(user?.uid ?? null);
    setFormData({ displayName: "", age: "", profession: "" });
    setInitialData({ displayName: "", age: "", profession: "" });
    setSavedStatus(null);
    setServerError(null);
  }

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    let isMounted = true;

    getProfile(user.uid)
      .then((profile) => {
        if (!isMounted) return;
        const initialName = profile?.displayName || user.displayName || authDisplayName || "";
        const initialAge = profile?.age !== null && profile?.age !== undefined ? String(profile.age) : "";
        const initialProf = profile?.profession || "";

        const data = {
          displayName: initialName,
          age: initialAge,
          profession: initialProf,
        };
        setFormData(data);
        setInitialData(data);
      })
      .catch(() => {
        if (isMounted) {
          setServerError("Unable to load profile. Please refresh to try again.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, user?.uid, authLoading, authDisplayName]);

  const hasChanges =
    formData.displayName.trim() !== initialData.displayName.trim() ||
    formData.age.trim() !== initialData.age.trim() ||
    formData.profession.trim() !== initialData.profession.trim();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedStatus(null);
    setServerError(null);

    const validation = validateProfile({
      displayName: formData.displayName,
      age: formData.age,
      profession: formData.profession,
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      if (validation.errors.displayName) {
        nameInputRef.current?.focus();
      } else if (validation.errors.age) {
        ageInputRef.current?.focus();
      } else if (validation.errors.profession) {
        professionInputRef.current?.focus();
      }
      return;
    }

    setErrors({});
    if (!user) return;

    setIsSaving(true);
    try {
      await saveProfile(user.uid, {
        displayName: formData.displayName,
        age: formData.age,
        profession: formData.profession,
      });

      const updated = {
        displayName: formData.displayName.trim(),
        age: formData.age.trim(),
        profession: formData.profession.trim(),
      };
      setInitialData(updated);
      setSavedStatus("Saved");
    } catch {
      setServerError("Could not save profile changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#18263e] border-t-transparent animate-spin" />
        <p className="text-[16px] text-[#6c7c94]">Loading your profile...</p>
      </div>
    );
  }

  // Signed out prompt
  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto py-8 sm:py-12">
        <div className="bg-[#faf8f5] border border-[#dbd4c7] rounded-2xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#18263e] flex items-center justify-center overflow-hidden shrink-0 select-none">
            <Image
              src="/brand/logo-mark.png"
              width={48}
              height={48}
              alt=""
              className="w-12 h-12 rounded-xl object-cover"
            />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#18263e]">
              Sign in to view your profile
            </h1>
            <p className="text-[16px] text-[#4e5e77] leading-relaxed">
              Profiles let you personalize your account. Your profile details stay
              private to your account and are never sent to the AI.
            </p>
          </div>

          <button
            ref={signInButtonRef}
            type="button"
            onClick={() => setIsSignInModalOpen(true)}
            className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#18263e] text-[#faf8f5] font-semibold text-[16px] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-xs"
          >
            Log in / Sign up
          </button>

          <SignInModal
            isOpen={isSignInModalOpen}
            onClose={() => setIsSignInModalOpen(false)}
            triggerRef={signInButtonRef}
          />
        </div>
      </div>
    );
  }

  const authProviderLabel =
    signInMethod === "google"
      ? "Signed in with Google"
      : "Signed in with email";

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#dbd4c7] pb-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#18263e]">
            My profile
          </h1>
          <p className="text-[16px] text-[#4e5e77] mt-1">
            Manage your personal profile details.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/saved"
            className="text-[16px] font-medium text-[#18263e] hover:text-[#b46b19] underline focus-visible:outline-2 focus-visible:outline-[#18263e] rounded-sm"
          >
            My analyses &rarr;
          </Link>
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="p-4 bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl text-[16px] text-[#b46b19]"
        >
          {serverError}
        </div>
      )}

      {/* Profile Card Form */}
      <div className="bg-[#faf8f5] border border-[#dbd4c7] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <form onSubmit={handleSave} className="space-y-6" noValidate>
          {/* Read-only auth badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#f3ede2] text-[15px] text-[#6c7c94]">
            <span className="font-medium text-[#18263e]">{authProviderLabel}</span>
            <span>{user.email}</span>
          </div>

          {/* Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name"
              className="block text-[16px] font-semibold text-[#18263e]"
            >
              Name <span className="text-[#b46b19]">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="profile-name"
              type="text"
              autoComplete="name"
              value={formData.displayName}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, displayName: e.target.value }));
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: undefined }));
                }
                setSavedStatus(null);
              }}
              aria-describedby={errors.displayName ? "profile-name-error" : undefined}
              aria-invalid={Boolean(errors.displayName)}
              disabled={isSaving}
              className="w-full min-h-[46px] px-3.5 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
            />
            {errors.displayName && (
              <p
                id="profile-name-error"
                className="text-[15px] text-[#b46b19] font-medium"
              >
                {errors.displayName}
              </p>
            )}
          </div>

          {/* Age Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-age"
              className="block text-[16px] font-semibold text-[#18263e]"
            >
              Age
            </label>
            <input
              ref={ageInputRef}
              id="profile-age"
              type="text"
              inputMode="numeric"
              value={formData.age}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, age: e.target.value }));
                if (errors.age) {
                  setErrors((prev) => ({ ...prev, age: undefined }));
                }
                setSavedStatus(null);
              }}
              placeholder="e.g. 28"
              aria-describedby={errors.age ? "profile-age-error" : "profile-age-hint"}
              aria-invalid={Boolean(errors.age)}
              disabled={isSaving}
              className="w-full sm:w-48 min-h-[46px] px-3.5 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
            />
            <p id="profile-age-hint" className="text-[15px] text-[#6c7c94]">
              Optional. Between 13 and 120.
            </p>
            {errors.age && (
              <p
                id="profile-age-error"
                className="text-[15px] text-[#b46b19] font-medium"
              >
                {errors.age}
              </p>
            )}
          </div>

          {/* Profession Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="profile-profession"
              className="block text-[16px] font-semibold text-[#18263e]"
            >
              Profession
            </label>
            <input
              ref={professionInputRef}
              id="profile-profession"
              type="text"
              value={formData.profession}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, profession: e.target.value }));
                if (errors.profession) {
                  setErrors((prev) => ({ ...prev, profession: undefined }));
                }
                setSavedStatus(null);
              }}
              placeholder="e.g. Software Engineer, Student, Designer"
              aria-describedby={
                errors.profession ? "profile-prof-error" : "profile-privacy-helper"
              }
              aria-invalid={Boolean(errors.profession)}
              disabled={isSaving}
              className="w-full min-h-[46px] px-3.5 py-2 text-[18px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#18263e] disabled:opacity-50"
            />
            {errors.profession && (
              <p
                id="profile-prof-error"
                className="text-[15px] text-[#b46b19] font-medium"
              >
                {errors.profession}
              </p>
            )}
          </div>

          {/* Privacy Helper */}
          <div
            id="profile-privacy-helper"
            className="p-3.5 bg-[#f3ede2]/70 border border-[#dbd4c7] rounded-xl text-[16px] text-[#4e5e77]"
          >
            Optional. This stays in your account and is never sent to the AI.
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-[#18263e] text-[#faf8f5] font-semibold text-[16px] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>

            {/* Saved announcement region */}
            <div
              role="status"
              aria-live="polite"
              className="text-[16px] font-semibold text-[#18263e] min-h-[24px]"
            >
              {savedStatus}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
