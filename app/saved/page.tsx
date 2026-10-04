"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInModal } from "@/components/auth/SignInModal";
import {
  listAnalyses,
  deleteAnalysis,
  deleteAllAnalyses,
  type SavedAnalysisRecord,
} from "@/lib/saved";

function formatTimestamp(ts: unknown): string {
  if (!ts) return "";
  let millis = 0;
  if (typeof ts === "object" && ts !== null && "toMillis" in ts && typeof (ts as { toMillis: () => number }).toMillis === "function") {
    millis = (ts as { toMillis: () => number }).toMillis();
  } else if (typeof ts === "object" && ts !== null && "seconds" in ts && typeof (ts as { seconds: number }).seconds === "number") {
    millis = (ts as { seconds: number }).seconds * 1000;
  } else if (ts instanceof Date) {
    millis = ts.getTime();
  } else if (typeof ts === "number") {
    millis = ts;
  }

  if (!millis) return "";
  return new Date(millis).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SavedAnalysesPage() {
  const { user, loading: authLoading } = useAuth();

  const [analyses, setAnalyses] = useState<SavedAnalysisRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;

    listAnalyses(user.uid)
      .then((records) => {
        if (isMounted) {
          setAnalyses(records);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("We couldn't load your saved analyses. Please check your connection and try again.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const handleRetry = () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    listAnalyses(user.uid)
      .then((records) => {
        setAnalyses(records);
        setLoading(false);
      })
      .catch(() => {
        setError("We couldn't load your saved analyses. Please check your connection and try again.");
        setLoading(false);
      });
  };

  const handleDeleteItem = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteAnalysis(id);
      setAnalyses((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch {
      setError("Failed to delete the analysis. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deleteAllAnalyses(user.uid);
      setAnalyses([]);
      setShowDeleteAllConfirm(false);
    } catch {
      setError("Failed to delete all analyses. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="font-serif text-[20px] text-[#18263e]">
          Checking authentication...
        </p>
      </div>
    );
  }

  // Logged-out state: friendly sign-in prompt
  if (!user) {
    return (
      <div className="w-full max-w-xl mx-auto py-8 sm:py-12 space-y-6 text-left">
        <div className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="space-y-2">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
              Account Required
            </span>
            <h1 className="font-serif font-bold text-[#18263e] text-[24px] sm:text-[28px]">
              Your saved analyses
            </h1>
            <p className="text-[16px] text-[#4e5e77] leading-relaxed">
              Sign in with Google to view, revisit, and manage your saved analyses. They stay private to your account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSignInModalOpen(true)}
              className="min-h-[46px] px-6 py-2.5 rounded-xl font-semibold text-[15px] sm:text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
            >
              Sign in with Google
            </button>
            <Link
              href="/"
              className="min-h-[46px] px-5 py-2.5 rounded-xl font-medium text-[15px] text-[#6c7c94] hover:text-[#18263e] hover:bg-[#f3ede2] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] inline-flex items-center"
            >
              &larr; Back to start
            </Link>
          </div>
        </div>

        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 space-y-6 text-left">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#dbd4c7]">
        <div className="space-y-1">
          <h1 className="font-serif font-bold text-[#18263e] text-[26px] sm:text-[30px]">
            My analyses
          </h1>
          <p className="text-[15px] text-[#6c7c94]">
            {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} saved privately to your account
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="min-h-[44px] px-4 py-2 rounded-xl text-[15px] font-semibold bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer inline-flex items-center"
          >
            + New analysis
          </Link>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div role="alert" className="p-4 rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] text-[#b46b19] text-[15px] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#18263e] border-t-transparent animate-spin" />
          <p className="text-[16px] text-[#6c7c94]">Loading your saved analyses...</p>
        </div>
      ) : analyses.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center bg-[#ffffff] rounded-2xl border border-dashed border-[#dbd4c7] space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#f3ede2] flex items-center justify-center text-[#18263e]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="font-serif font-bold text-[#18263e] text-[20px]">
              Nothing saved yet.
            </h2>
            <p className="text-[15px] text-[#6c7c94] max-w-sm mx-auto">
              Analyses you choose to save will appear here for you to revisit and update anytime.
            </p>
          </div>
          <Link
            href="/"
            className="inline-block min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-[15px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e]"
          >
            Start an analysis &rarr;
          </Link>
        </div>
      ) : (
        /* Analyses List */
        <div className="space-y-4">
          {/* Delete All Option */}
          <div className="flex justify-end">
            {showDeleteAllConfirm ? (
              <div className="p-3 bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl flex items-center gap-3 text-[14px]">
                <span className="text-[#18263e] font-medium">Delete all {analyses.length} saved analyses?</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteAll}
                  className="px-3 py-1 rounded-lg bg-[#b46b19] text-[#faf8f5] font-semibold hover:bg-[#965510] transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Yes, delete all"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="text-[#6c7c94] hover:text-[#18263e] underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(true)}
                className="text-[14px] text-[#6c7c94] hover:text-[#b46b19] transition-colors min-h-[36px] px-2 cursor-pointer"
              >
                Delete all saved analyses
              </button>
            )}
          </div>

          <ul className="space-y-3">
            {analyses.map((item) => {
              const formattedDate = formatTimestamp(item.createdAt);
              const investigatingCount = Object.values(item.triage || {}).filter(
                (v) => v === "investigate"
              ).length;
              const isConfirmingDelete = deleteConfirmId === item.id;

              return (
                <li
                  key={item.id}
                  className="bg-[#ffffff] rounded-xl border border-[#dbd4c7] p-4 sm:p-5 hover:border-[#18263e] transition-colors space-y-3 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h2 className="font-serif font-bold text-[#18263e] text-[18px] sm:text-[20px] leading-snug">
                      <Link
                        href={`/saved/${item.id}`}
                        className="hover:underline focus-visible:outline-2 focus-visible:outline-[#18263e]"
                      >
                        {item.title}
                      </Link>
                    </h2>

                    <div className="flex items-center gap-2 text-[13px] text-[#6c7c94] shrink-0">
                      {formattedDate && <span>{formattedDate}</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#f3ede2]">
                    <div className="flex items-center gap-2 text-[14px] text-[#4e5e77]">
                      <span className="font-medium text-[#18263e]">
                        {investigatingCount}
                      </span>
                      <span>
                        {investigatingCount === 1 ? "item" : "items"} marked to investigate
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="text-[#4e5e77]">Delete?</span>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-2.5 py-1 rounded-md bg-[#b46b19] text-[#faf8f5] font-semibold hover:bg-[#965510] transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "..." : "Confirm"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[#6c7c94] hover:text-[#18263e] underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/saved/${item.id}`}
                            className="min-h-[40px] px-3.5 py-1.5 rounded-lg text-[14px] font-semibold text-[#18263e] bg-[#f3ede2] hover:bg-[#ebd1a4] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] inline-flex items-center"
                          >
                            Open &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="min-h-[40px] px-2.5 py-1.5 rounded-lg text-[14px] font-medium text-[#6c7c94] hover:text-[#b46b19] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
