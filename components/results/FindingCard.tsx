"use client";

import React from "react";
import type { Finding } from "@/lib/schema";

export type TriageChoice = "investigate" | "considered" | "not_relevant" | null;

interface FindingCardProps {
  finding: Finding;
  isExpanded: boolean;
  onToggleExpand: () => void;
  triageChoice: TriageChoice;
  onSelectTriage: (choice: "investigate" | "considered" | "not_relevant") => void;
  onViewInWords: (findingId: string) => void;
  isHighlighted?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  unstated_assumption: "Assumption",
  overlooked_factor: "Overlooked factor",
  internal_tension: "Tension",
  missing_information: "What you don't know yet",
  alternative_perspective: "Other perspective",
};

export function FindingCard({
  finding,
  isExpanded,
  onToggleExpand,
  triageChoice,
  onSelectTriage,
  onViewInWords,
  isHighlighted = false,
}: FindingCardProps) {
  const typeLabel = TYPE_LABELS[finding.type] || "Finding";

  let basisLabel = "Based on your words";
  if (finding.basis === "inferred") {
    basisLabel = "Inferred from your words";
  } else if (finding.basis === "unknown") {
    basisLabel = "Not in your text, so a question";
  }

  const detailsId = `finding-details-${finding.id}`;
  const titleId = `finding-title-${finding.id}`;

  const verifiedQuotes = finding.evidence.map((ev) => ev.text).filter(Boolean);

  return (
    <article
      id={`finding-card-${finding.id}`}
      className={`break-inside-avoid mb-4 rounded-2xl border bg-[#ffffff] p-4 sm:p-5 text-left transition-shadow ${
        isHighlighted
          ? "ring-2 ring-[#14213d] ring-offset-2 border-[#14213d] shadow-md"
          : "border-[#dbd4c7] hover:border-[#b46b19]/60 shadow-2xs"
      }`}
    >
      {/* Type Label & Basis Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
          {typeLabel}
        </span>
        <span className="text-[12px] font-medium text-[#4e5e77] bg-[#f3ede2] px-2.5 py-0.5 rounded-full border border-[#dbd4c7]">
          {basisLabel}
        </span>
      </div>

      {/* Title */}
      <h2
        id={titleId}
        tabIndex={-1}
        className="font-serif font-bold text-[#14213d] text-[1.25rem] leading-snug outline-none focus-visible:ring-2 focus-visible:ring-[#14213d] rounded-sm"
      >
        {finding.title}
      </h2>

      {/* Observation */}
      <div className="pt-2 text-[15px] sm:text-[16px] text-[#2d3748] leading-relaxed">
        {isExpanded ? (
          <p>{finding.observation}</p>
        ) : (
          <p className="line-clamp-3">{finding.observation}</p>
        )}
      </div>

      {/* Triage Row */}
      <div className="pt-3.5 space-y-1.5 border-t border-[#f3ede2] mt-3">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[#6c7c94] block">
          Your take on this finding
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Triage choice">
          <button
            type="button"
            aria-pressed={triageChoice === "investigate"}
            onClick={() => onSelectTriage("investigate")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#14213d] ${
              triageChoice === "investigate"
                ? "bg-[#14213d] text-[#faf8f5] border-[#14213d] shadow-xs"
                : "bg-[#ffffff] text-[#4e5e77] border-[#dbd4c7] hover:border-[#14213d] hover:bg-[#faf8f5]"
            }`}
          >
            {triageChoice === "investigate" && <span aria-hidden="true">✓</span>}
            <span>Worth investigating</span>
          </button>

          <button
            type="button"
            aria-pressed={triageChoice === "considered"}
            onClick={() => onSelectTriage("considered")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#14213d] ${
              triageChoice === "considered"
                ? "bg-[#14213d] text-[#faf8f5] border-[#14213d] shadow-xs"
                : "bg-[#ffffff] text-[#4e5e77] border-[#dbd4c7] hover:border-[#14213d] hover:bg-[#faf8f5]"
            }`}
          >
            {triageChoice === "considered" && <span aria-hidden="true">✓</span>}
            <span>Already considered</span>
          </button>

          <button
            type="button"
            aria-pressed={triageChoice === "not_relevant"}
            onClick={() => onSelectTriage("not_relevant")}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#14213d] ${
              triageChoice === "not_relevant"
                ? "bg-[#14213d] text-[#faf8f5] border-[#14213d] shadow-xs"
                : "bg-[#ffffff] text-[#4e5e77] border-[#dbd4c7] hover:border-[#14213d] hover:bg-[#faf8f5]"
            }`}
          >
            {triageChoice === "not_relevant" && <span aria-hidden="true">✓</span>}
            <span>Not relevant to me</span>
          </button>
        </div>
      </div>

      {/* Show / Hide Details Toggle */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={detailsId}
          className="w-full min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-semibold text-[#14213d] bg-[#f8f5ee] hover:bg-[#ebd1a4]/40 border border-[#dbd4c7] flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#14213d]"
        >
          <span>{isExpanded ? "Hide details" : "Show details"}</span>
          <svg
            className={`w-4 h-4 text-[#14213d] transition-transform motion-safe:duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div
          id={detailsId}
          className="mt-4 pt-4 border-t border-[#dbd4c7] space-y-3.5 text-left motion-safe:transition-all"
        >
          {/* From your words block */}
          <div className="rounded-xl border border-[#dbd4c7] bg-[#faf8f5] p-3.5 space-y-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#6c7c94] block">
              From your words
            </span>

            {verifiedQuotes.length > 0 ? (
              <div className="space-y-2">
                {verifiedQuotes.map((quote, qIdx) => (
                  <blockquote
                    key={qIdx}
                    className="border-l-3 border-[#14213d] pl-3 italic text-[15px] text-[#2d3748]"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
                <button
                  type="button"
                  onClick={() => onViewInWords(finding.id)}
                  className="text-[14px] font-semibold text-[#14213d] underline underline-offset-4 hover:text-[#b46b19] min-h-[44px] inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#14213d]"
                >
                  <span>View highlighted in text</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            ) : (
              <p className="text-[15px] text-[#4e5e77] leading-relaxed">
                {finding.evidence_paraphrase || "Reflected from the broader context of your answers."}
              </p>
            )}
          </div>

          {/* Why it matters */}
          <div className="space-y-1">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#6c7c94] block">
              Why it matters
            </span>
            <p className="text-[15px] text-[#2d3748] leading-relaxed">
              {finding.why_it_matters}
            </p>
          </div>

          {/* A question to sit with */}
          <div className="space-y-1">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#6c7c94] block">
              A question to sit with
            </span>
            <p className="text-[15px] text-[#2d3748] italic leading-relaxed">
              &ldquo;{finding.reflection_question}&rdquo;
            </p>
          </div>

          {/* What you could check */}
          <div className="rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] p-3.5 space-y-1">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#b46b19] block">
              What you could check
            </span>
            <p className="text-[15px] text-[#14213d] font-medium leading-relaxed">
              {finding.investigation_item}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
