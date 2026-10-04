"use client";

import React from "react";
import type { Analysis, Receipt } from "@/lib/schema";

interface ResultsHeaderProps {
  analysis: Analysis;
  receipt: Receipt;
  certaintyBefore: number | null;
  certaintyAfter: number | null;
  onSetCertaintyAfter: (val: number) => void;
  onBackToAnswers: () => void;
  onStartOver: () => void;
}

export function ResultsHeader({
  analysis,
  receipt,
  certaintyBefore,
  certaintyAfter,
  onSetCertaintyAfter,
  onBackToAnswers,
  onStartOver,
}: ResultsHeaderProps) {
  return (
    <header className="space-y-4 pb-4 border-b border-[#dbd4c7]">
      {/* Top Utility Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToAnswers}
            className="text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] flex items-center gap-1.5 min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            <span>&larr;</span>
            <span>Back to my answers</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStartOver}
            className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Decision Summary Heading */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19] bg-[#fdf7ee] border border-[#ebd1a4] px-2.5 py-0.5 rounded-full">
            Your Decision Reflection
          </span>
          {receipt.retried && (
            <span className="text-[13px] font-medium text-[#6c7c94] bg-[#f3ede2] px-2 py-0.5 rounded-full">
              Refined after review
            </span>
          )}
        </div>

        <h1 className="font-serif font-bold text-[#18263e] text-[clamp(1.75rem,3.2vw,2.4rem)] leading-tight">
          {analysis.decision_summary}
        </h1>
      </div>

      {/* Neutrality & Audit Receipt Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[14px] text-[#4e5e77] bg-[#faf8f5] p-3 rounded-xl border border-[#dbd4c7]">
        <div className="flex items-center gap-1.5 font-medium text-[#18263e]">
          <svg className="w-4 h-4 text-[#18263e]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Language check passed</span>
        </div>
        <span className="text-[#dbd4c7]" aria-hidden="true">•</span>
        <span>
          {receipt.findings_total} findings ({receipt.findings_grounded} grounded in your words)
        </span>
        {receipt.quotes_dropped > 0 && (
          <>
            <span className="text-[#dbd4c7]" aria-hidden="true">•</span>
            <span>{receipt.quotes_dropped} unverified quote(s) excluded</span>
          </>
        )}
      </div>

      {/* High-Stakes Domain Banner (Section 11) */}
      {analysis.high_stakes_domain !== "none" && (
        <aside
          role="note"
          aria-label="High stakes consideration notice"
          className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] p-4 text-left space-y-1"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[16px] text-[#18263e]">
              {analysis.high_stakes_domain === "financial"
                ? "Financial reflection note"
                : analysis.high_stakes_domain === "health"
                ? "Health & wellbeing reflection note"
                : analysis.high_stakes_domain === "legal"
                ? "Legal reflection note"
                : "Academic reflection note"}
            </span>
          </div>
          <p className="text-[15px] text-[#4e5e77] leading-relaxed">
            This reflection touches on a high-stakes area. The observations below are neutral prompts for your own examination, not professional or legal advice.
          </p>
        </aside>
      )}

      {/* Certainty Reflection Control (Section 10) */}
      <section aria-labelledby="certainty-reflect-heading" className="bg-[#ffffff] p-4 rounded-xl border border-[#dbd4c7] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="certainty-reflect-heading" className="text-[15px] font-semibold text-[#18263e]">
              How sure do you feel right now?
            </h2>
            <p className="text-[14px] text-[#6c7c94]">
              Take a quiet moment to reflect on your certainty after reviewing these perspectives.
            </p>
          </div>
          {certaintyBefore !== null && (
            <div className="text-[14px] font-medium text-[#4e5e77] bg-[#f3ede2] px-2.5 py-1 rounded-md">
              Before analysis: <span className="font-bold text-[#18263e]">{certaintyBefore}</span>/5
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1" role="radiogroup" aria-label="Certainty rating after analysis">
          {[1, 2, 3, 4, 5].map((level) => {
            const isSelected = certaintyAfter === level;
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSetCertaintyAfter(level)}
                className={`min-h-[44px] min-w-[44px] rounded-lg border text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? "bg-[#18263e] text-[#faf8f5] border-[#18263e]"
                    : "bg-[#ffffff] text-[#18263e] border-[#dbd4c7] hover:border-[#b46b19] hover:bg-[#faf8f5]"
                }`}
              >
                {level}
              </button>
            );
          })}
          <div className="text-[13px] text-[#6c7c94] ml-2 hidden sm:flex gap-4">
            <span>1 = Uncertain</span>
            <span>5 = Completely clear</span>
          </div>
        </div>
      </section>
    </header>
  );
}
