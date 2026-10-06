"use client";

import React from "react";
import type { Finding, FindingType } from "@/lib/schema";
import { FindingCard } from "./FindingCard";

export type TriageChoice = "investigate" | "considered" | "not_relevant";

interface FindingsTabProps {
  findings: Finding[];
  triageMap: Record<string, TriageChoice>;
  onSetTriage: (findingId: string, choice: TriageChoice) => void;
  onNavigateToWords: (findingId: string) => void;
  highlightedFindingId?: string | null;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (findingId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onNextUntriaged: () => void;
  allTriaged: boolean;
}

interface FilterOption {
  id: string;
  label: string;
  type?: FindingType;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: "all", label: "All" },
  { id: "unstated_assumption", label: "Assumptions", type: "unstated_assumption" },
  { id: "overlooked_factor", label: "Overlooked factors", type: "overlooked_factor" },
  { id: "internal_tension", label: "Tensions", type: "internal_tension" },
  { id: "missing_information", label: "What you don't know yet", type: "missing_information" },
  { id: "alternative_perspective", label: "Other perspectives", type: "alternative_perspective" },
];

export function FindingsTab({
  findings,
  triageMap,
  onSetTriage,
  onNavigateToWords,
  highlightedFindingId,
  expandedMap,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  selectedFilter,
  onSelectFilter,
  onNextUntriaged,
  allTriaged,
}: FindingsTabProps) {
  // Counts per filter option
  const filterCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: findings.length };
    for (const opt of FILTER_OPTIONS) {
      if (opt.type) {
        counts[opt.id] = findings.filter((f) => f.type === opt.type).length;
      }
    }
    return counts;
  }, [findings]);

  // Triage summary counts
  const counts = {
    investigate: Object.values(triageMap).filter((v) => v === "investigate").length,
    considered: Object.values(triageMap).filter((v) => v === "considered").length,
    not_relevant: Object.values(triageMap).filter((v) => v === "not_relevant").length,
  };

  const totalTriaged = counts.investigate + counts.considered + counts.not_relevant;

  // Filtered findings list
  const filteredFindings = React.useMemo(() => {
    if (selectedFilter === "all") return findings;
    return findings.filter((f) => f.type === selectedFilter);
  }, [findings, selectedFilter]);

  const allAreExpanded = findings.length > 0 && findings.every((f) => !!expandedMap[f.id]);

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
    <div className="space-y-4 text-left">
      {/* Consolidated Responsive Toolbar */}
      <div className="bg-[#ffffff] p-3.5 rounded-2xl border border-[#dbd4c7] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Mobile Select Filter (< 1024px) */}
          <div className="flex items-center gap-2 lg:hidden w-full sm:w-auto">
            <label htmlFor="mobile-filter-select" className="text-[15px] font-semibold text-[#18263e] shrink-0">
              Show:
            </label>
            <select
              id="mobile-filter-select"
              value={selectedFilter}
              onChange={(e) => onSelectFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[44px] px-3 py-2 rounded-xl border border-[#dbd4c7] bg-[#ffffff] text-[15px] text-[#18263e] font-medium focus-visible:outline-2 focus-visible:outline-[#18263e]"
            >
              {FILTER_OPTIONS.map((opt) => {
                const count = filterCounts[opt.id] ?? 0;
                if (opt.id !== "all" && count === 0) return null;
                return (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Desktop Filter Chips (>= 1024px) */}
          <div className="hidden lg:flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter findings by type">
            {FILTER_OPTIONS.map((opt) => {
              const count = filterCounts[opt.id] ?? 0;
              if (opt.id !== "all" && count === 0) return null;
              const isSelected = selectedFilter === opt.id;

              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectFilter(opt.id)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer border focus-visible:outline-2 focus-visible:outline-[#18263e] ${
                    isSelected
                      ? "bg-[#18263e] text-[#faf8f5] border-[#18263e] shadow-2xs"
                      : "bg-[#faf8f5] text-[#4e5e77] border-[#dbd4c7] hover:border-[#18263e] hover:text-[#18263e]"
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Action buttons (always visible) */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={allAreExpanded ? onCollapseAll : onExpandAll}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-[14px] font-semibold text-[#18263e] bg-[#f8f5ee] hover:bg-[#ebd1a4]/40 border border-[#dbd4c7] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#18263e]"
            >
              {allAreExpanded ? "Collapse all" : "Expand all"}
            </button>

            <button
              type="button"
              onClick={onNextUntriaged}
              disabled={allTriaged}
              title={allTriaged ? "All findings triaged" : "Go to next untriaged finding"}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-[14px] font-semibold border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#18263e] ${
                allTriaged
                  ? "bg-[#f3ede2] text-[#6c7c94] border-[#dbd4c7] opacity-60 cursor-not-allowed"
                  : "bg-[#18263e] text-[#faf8f5] border-[#18263e] hover:bg-[#233554] shadow-2xs"
              }`}
            >
              {allTriaged ? "All triaged" : "Next untriaged"}
            </button>
          </div>
        </div>

        {/* Live Triage Summary (Single DOM node) */}
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f3ede2] text-[13px] sm:text-[14px] text-[#4e5e77]"
        >
          <div>
            You marked <strong className="text-[#18263e]">{counts.investigate}</strong> to investigate,{" "}
            <strong className="text-[#18263e]">{counts.considered}</strong> already considered,{" "}
            <strong className="text-[#18263e]">{counts.not_relevant}</strong> not relevant.
          </div>
          <div className="text-[12px] sm:text-[13px] text-[#6c7c94] font-medium">
            {totalTriaged} of {findings.length} triaged
          </div>
        </div>
      </div>

      {/* Masonry Layout: 2 Columns on desktop (break-inside-avoid, 16-20px gap) */}
      <div className="columns-1 lg:columns-2 gap-4 [column-fill:_balance] pt-1">
        {filteredFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isExpanded={!!expandedMap[finding.id]}
            onToggleExpand={() => onToggleExpand(finding.id)}
            triageChoice={triageMap[finding.id] || null}
            onSelectTriage={(choice) => onSetTriage(finding.id, choice)}
            onViewInWords={onNavigateToWords}
            isHighlighted={highlightedFindingId === finding.id}
          />
        ))}
      </div>
    </div>
  );
}
