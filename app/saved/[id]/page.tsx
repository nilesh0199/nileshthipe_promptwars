"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { getAnalysis, type SavedAnalysisRecord } from "@/lib/saved";
import { ResultsView } from "@/components/results/ResultsView";
import type { TriageChoice } from "@/components/results/FindingsTab";

export default function SavedAnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [record, setRecord] = useState<SavedAnalysisRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Reset detail state during render when user changes or signs out
  const [prevUid, setPrevUid] = useState<string | null>(user?.uid ?? null);
  if (prevUid !== (user?.uid ?? null)) {
    setPrevUid(user?.uid ?? null);
    setRecord(null);
    if (!user) {
      setNotFound(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user || authLoading || !id || typeof id !== "string") {
      return;
    }

    let isMounted = true;

    getAnalysis(id)
      .then((data) => {
        if (!isMounted) return;
        if (!data || data.uid !== user.uid) {
          setNotFound(true);
          setRecord(null);
        } else {
          setRecord(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setNotFound(true);
          setRecord(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, user, user?.uid, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="w-full max-w-3xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#18263e] border-t-transparent animate-spin" />
        <p className="text-[16px] text-[#6c7c94]">Loading your analysis...</p>
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="w-full max-w-xl mx-auto py-12 text-left">
        <div className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-6 sm:p-8 space-y-4 shadow-xs">
          <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
            Not Found
          </span>
          <h1 className="font-serif font-bold text-[#18263e] text-[24px]">
            We couldn&apos;t find that analysis.
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#4e5e77] leading-relaxed">
            It may have been deleted, or you might be signed into a different account than the one that created it.
          </p>
          <div className="pt-2">
            <Link
              href="/saved"
              className="inline-block min-h-[44px] px-5 py-2.5 rounded-xl font-semibold text-[15px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e]"
            >
              &larr; Back to my saved analyses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResultsView
      data={{
        kind: "analysis",
        analysis: record.analysis,
        receipt: record.receipt,
        input: {
          decision: record.input.decision,
          reasons: record.input.reasons,
          context: record.input.context,
        },
      }}
      originalInput={{
        decisionType: record.input.decisionType,
        decision: record.input.decision,
        reasons: record.input.reasons,
        context: record.input.context,
        certaintyBefore: record.certaintyBefore,
      }}
      initialTriage={record.triage as Record<string, TriageChoice>}
      initialNotes={record.notes}
      initialCertaintyAfter={record.certaintyAfter}
      savedId={record.id}
      onBackToAnswers={() => router.push("/saved")}
      onStartOver={() => router.push("/")}
    />
  );
}
