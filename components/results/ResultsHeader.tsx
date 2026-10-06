"use client";

import React, { useState } from "react";
import type { Analysis, Receipt } from "@/lib/schema";

interface ResultsHeaderProps {
  analysis: Analysis;
  receipt: Receipt;
  onBackToAnswers: () => void;
  onStartOver: () => void;
}

export function ResultsHeader({
  analysis,
  receipt,
  onBackToAnswers,
  onStartOver,
}: ResultsHeaderProps) {
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Check if summary might exceed clamp limits (approx 100+ chars)
  const isLongSummary = analysis.decision_summary.length > 90;

  return (
    <header className="bg-[#faf8f5] space-y-3 pb-3 border-b border-[#dbd4c7]">
      {/* Top Utility Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToAnswers}
          className="text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] flex items-center gap-1.5 min-h-[44px] px-1 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to my answers</span>
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          Start over
        </button>
      </div>

      {/* Decision Summary Heading */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19] bg-[#fdf7ee] border border-[#ebd1a4] px-2.5 py-0.5 rounded-full">
            Your Decision Reflection
          </span>
          {receipt.retried && (
            <span className="text-[13px] font-medium text-[#6c7c94] bg-[#f3ede2] px-2 py-0.5 rounded-full">
              Refined after review
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h1
            className={`font-serif font-bold text-[#18263e] text-[clamp(1.25rem,2.2vw,1.75rem)] leading-snug ${
              !isSummaryExpanded ? "line-clamp-3 lg:line-clamp-2" : ""
            }`}
          >
            {analysis.decision_summary}
          </h1>

          {isLongSummary && (
            <button
              type="button"
              onClick={() => setIsSummaryExpanded((prev) => !prev)}
              aria-expanded={isSummaryExpanded}
              className="text-[15px] font-semibold text-[#18263e] underline underline-offset-4 hover:text-[#b46b19] min-h-[44px] inline-flex items-center transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              {isSummaryExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>

      {/* Slim-line Neutrality & Audit Receipt Bar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-[#4e5e77] py-0.5">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#18263e]">
          <svg
            className="w-4 h-4 text-[#18263e] shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Language check passed</span>
        </span>
        <span className="text-[#dbd4c7] hidden sm:inline" aria-hidden="true">
          •
        </span>
        <span>
          {receipt.findings_total} findings, {receipt.findings_grounded} grounded in your words
        </span>
        {receipt.quotes_dropped > 0 && (
          <>
            <span className="text-[#dbd4c7] hidden sm:inline" aria-hidden="true">
              •
            </span>
            <span>{receipt.quotes_dropped} unverified quote(s) excluded</span>
          </>
        )}
      </div>

      {/* High-Stakes Domain Banner (Compact directly under receipt) */}
      {analysis.high_stakes_domain !== "none" && (
        <aside
          role="note"
          aria-label="High stakes consideration notice"
          className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] px-3.5 py-2.5 text-left text-[15px] text-[#4e5e77] space-y-0.5"
        >
          <div className="font-semibold text-[#18263e]">
            {analysis.high_stakes_domain === "financial"
              ? "Financial reflection note"
              : analysis.high_stakes_domain === "health"
              ? "Health & wellbeing reflection note"
              : analysis.high_stakes_domain === "legal"
              ? "Legal reflection note"
              : "Academic reflection note"}
          </div>
          <p className="leading-snug">
            This reflection touches on a high-stakes area. The observations below are neutral prompts for your own examination, not professional or legal advice.
          </p>
        </aside>
      )}
    </header>
  );
}
