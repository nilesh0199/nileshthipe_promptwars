"use client";

import React from "react";
import type { Finding, FindingType } from "@/lib/schema";

export type TriageChoice = "investigate" | "considered" | "not_relevant";

interface FindingsTabProps {
  findings: Finding[];
  triageMap: Record<string, TriageChoice>;
  onSetTriage: (findingId: string, choice: TriageChoice) => void;
  onNavigateToWords: (findingId: string) => void;
  highlightedFindingId?: string | null;
}

const TYPE_CONFIG: Record<
  FindingType,
  { label: string; description: string }
> = {
  unstated_assumption: {
    label: "Unstated assumptions",
    description: "Foundational premises you may be taking for granted",
  },
  overlooked_factor: {
    label: "Overlooked factors",
    description: "External elements or second-order impacts not mentioned in your reasons",
  },
  internal_tension: {
    label: "Internal tensions",
    description: "Competing priorities or friction points within your stated thoughts",
  },
  missing_information: {
    label: "Missing information",
    description: "Unknown facts or uncertainties that would clarify your evaluation",
  },
  alternative_perspective: {
    label: "Alternative perspectives",
    description: "Other reasonable vantage points from which to view this situation",
  },
};

const ORDERED_TYPES: FindingType[] = [
  "unstated_assumption",
  "overlooked_factor",
  "internal_tension",
  "missing_information",
  "alternative_perspective",
];

export function FindingsTab({
  findings,
  triageMap,
  onSetTriage,
  onNavigateToWords,
  highlightedFindingId,
}: FindingsTabProps) {
  // Triage summary counts
  const counts = {
    investigate: Object.values(triageMap).filter((v) => v === "investigate").length,
    considered: Object.values(triageMap).filter((v) => v === "considered").length,
    not_relevant: Object.values(triageMap).filter((v) => v === "not_relevant").length,
  };

  const totalMarked = counts.investigate + counts.considered + counts.not_relevant;

  if (!findings || findings.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="font-serif text-[20px] text-[#18263e]">No findings generated</p>
        <p className="text-[15px] text-[#6c7c94]">
          Your reasoning is compact and clear. Check the Premortem tab for scenario reflection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Live Triage Summary Bar */}
      <div
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-3 bg-[#ffffff] border border-[#dbd4c7] p-3.5 rounded-xl text-[14px]"
      >
        <div className="text-[#4e5e77]">
          {totalMarked === 0 ? (
            <span>Triage each finding below to prioritize your investigation.</span>
          ) : (
            <span>
              You marked <strong className="text-[#18263e]">{counts.investigate}</strong> to investigate,{" "}
              <strong className="text-[#18263e]">{counts.considered}</strong> already considered,{" "}
              <strong className="text-[#18263e]">{counts.not_relevant}</strong> not relevant.
            </span>
          )}
        </div>
        <div className="text-[13px] text-[#6c7c94] font-medium">
          {totalMarked} of {findings.length} triaged
        </div>
      </div>

      {/* Grouped Findings */}
      {ORDERED_TYPES.map((typeKey) => {
        const groupFindings = findings.filter((f) => f.type === typeKey);
        if (groupFindings.length === 0) return null;

        const typeInfo = TYPE_CONFIG[typeKey];

        return (
          <section
            key={typeKey}
            aria-labelledby={`group-heading-${typeKey}`}
            className="space-y-4 pt-2"
          >
            {/* Group Header */}
            <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
              <h2
                id={`group-heading-${typeKey}`}
                className="font-serif font-bold text-[#18263e] text-[20px]"
              >
                {typeInfo.label}
              </h2>
              <p className="text-[14px] text-[#6c7c94]">{typeInfo.description}</p>
            </div>

            {/* Finding Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {groupFindings.map((finding) => {
                const isSelected = highlightedFindingId === finding.id;
                const triageState = triageMap[finding.id];

                return (
                  <article
                    key={finding.id}
                    id={`finding-${finding.id}`}
                    className={`bg-[#ffffff] rounded-2xl border p-5 sm:p-6 transition-all duration-200 text-left flex flex-col justify-between space-y-4 shadow-2xs ${
                      isSelected
                        ? "border-[#18263e] ring-2 ring-[#18263e]/20"
                        : "border-[#dbd4c7] hover:border-[#b46b19]/60"
                    }`}
                  >
                    {/* Card Title & Meta */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1 max-w-xl">
                        <span className="text-[12px] font-mono font-medium text-[#6c7c94] uppercase tracking-wider">
                          {finding.id} • {finding.category.replace("_", " ")}
                        </span>
                        <h3 className="font-serif font-bold text-[18px] sm:text-[19px] text-[#18263e] leading-snug">
                          {finding.title}
                        </h3>
                      </div>

                      {/* Basis Badge */}
                      {finding.basis !== "stated" && (
                        <span className="text-[12px] font-medium bg-[#f3ede2] text-[#6c7c94] px-2.5 py-1 rounded-full border border-[#dbd4c7] self-start">
                          {finding.basis === "inferred" ? "Inferred perspective" : "Unstated factor"}
                        </span>
                      )}
                    </div>

                    {/* Observation */}
                    <p className="text-[16px] text-[#18263e] leading-relaxed">
                      {finding.observation}
                    </p>

                    {/* Grounded Evidence from User's Own Words */}
                    {finding.evidence && finding.evidence.length > 0 ? (
                      <div className="bg-[#faf8f5] rounded-xl p-3.5 border border-[#dbd4c7] space-y-1.5">
                        <div className="flex items-center justify-between text-[13px] text-[#6c7c94]">
                          <span className="font-semibold text-[#4e5e77]">From your words:</span>
                          <button
                            type="button"
                            onClick={() => onNavigateToWords(finding.id)}
                            className="text-[#b46b19] hover:underline font-medium focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                          >
                            View highlighted in text &rarr;
                          </button>
                        </div>
                        <div className="space-y-1">
                          {finding.evidence.map((span, idx) => (
                            <blockquote
                              key={idx}
                              className="italic text-[15px] text-[#18263e] pl-3 border-l-2 border-[#b46b19]"
                            >
                              &ldquo;{span.text}&rdquo;
                            </blockquote>
                          ))}
                        </div>
                        {finding.evidence_paraphrase && (
                          <p className="text-[13px] text-[#6c7c94] pt-1">
                            {finding.evidence_paraphrase}
                          </p>
                        )}
                      </div>
                    ) : (
                      finding.evidence_paraphrase && (
                        <p className="text-[14px] text-[#6c7c94] italic bg-[#faf8f5] p-3 rounded-lg border border-[#dbd4c7]">
                          Context: {finding.evidence_paraphrase}
                        </p>
                      )
                    )}

                    {/* Why It Matters */}
                    <div className="text-[15px] text-[#4e5e77] leading-relaxed">
                      <strong className="text-[#18263e] font-semibold">Why examine this: </strong>
                      {finding.why_it_matters}
                    </div>

                    {/* Reflection Question Box */}
                    <div className="bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl p-3.5 text-left space-y-1">
                      <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider">
                        Question to ask yourself
                      </span>
                      <p className="font-serif text-[16px] text-[#18263e] italic leading-relaxed">
                        &ldquo;{finding.reflection_question}&rdquo;
                      </p>
                    </div>

                    {/* Investigation Item */}
                    {finding.investigation_item && (
                      <div className="text-[14px] text-[#4e5e77]">
                        <span className="font-semibold text-[#18263e]">Investigation step: </span>
                        {finding.investigation_item}
                      </div>
                    )}

                    {/* Triage Controls */}
                    <div className="pt-2 border-t border-[#f3ede2] space-y-2">
                      <span className="text-[13px] font-medium text-[#6c7c94] block">
                        Your triage for this point:
                      </span>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                        role="group"
                        aria-label={`Triage finding: ${finding.title}`}
                      >
                        <button
                          type="button"
                          onClick={() => onSetTriage(finding.id, "investigate")}
                          aria-pressed={triageState === "investigate"}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center justify-center text-center ${
                            triageState === "investigate"
                              ? "bg-[#18263e] text-[#faf8f5] border-[#18263e] shadow-2xs font-semibold"
                              : "bg-[#ffffff] text-[#18263e] border-[#dbd4c7] hover:border-[#18263e] hover:bg-[#faf8f5]"
                          }`}
                        >
                          Worth investigating
                        </button>

                        <button
                          type="button"
                          onClick={() => onSetTriage(finding.id, "considered")}
                          aria-pressed={triageState === "considered"}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center justify-center text-center ${
                            triageState === "considered"
                              ? "bg-[#4e5e77] text-[#faf8f5] border-[#4e5e77] shadow-2xs font-semibold"
                              : "bg-[#ffffff] text-[#4e5e77] border-[#dbd4c7] hover:border-[#4e5e77] hover:bg-[#faf8f5]"
                          }`}
                        >
                          Already considered
                        </button>

                        <button
                          type="button"
                          onClick={() => onSetTriage(finding.id, "not_relevant")}
                          aria-pressed={triageState === "not_relevant"}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-[14px] font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center justify-center text-center ${
                            triageState === "not_relevant"
                              ? "bg-[#f3ede2] text-[#18263e] border-[#dbd4c7] shadow-2xs font-semibold"
                              : "bg-[#ffffff] text-[#6c7c94] border-[#dbd4c7] hover:border-[#6c7c94] hover:bg-[#faf8f5]"
                          }`}
                        >
                          Not relevant to me
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
