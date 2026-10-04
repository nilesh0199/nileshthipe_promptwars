"use client";

import React from "react";
import type { Finding } from "@/lib/schema";

interface InYourWordsTabProps {
  decision: string;
  reasons: string;
  context: string;
  findings: Finding[];
  onNavigateToFinding: (findingId: string) => void;
  selectedFindingId?: string | null;
}

interface EnrichedSpan {
  findingId: string;
  findingTitle: string;
  field: "decision" | "reasons" | "context";
  start: number;
  end: number;
  text: string;
}

/**
 * Splits plain text into normal spans and highlighted evidence marks.
 * Rendered strictly with native React text nodes, never dangerouslySetInnerHTML.
 */
function renderHighlightedText(
  sourceText: string,
  field: "decision" | "reasons" | "context",
  allSpans: EnrichedSpan[],
  onNavigateToFinding: (findingId: string) => void,
  selectedFindingId?: string | null
): React.ReactNode {
  if (!sourceText) {
    return <span className="italic text-[#6c7c94] text-[15px]">None provided</span>;
  }

  // Filter spans for this field and sort by start index
  const fieldSpans = allSpans
    .filter((s) => s.field === field && s.start >= 0 && s.end <= sourceText.length && s.start < s.end)
    .sort((a, b) => a.start - b.start);

  if (fieldSpans.length === 0) {
    return <span className="text-[17px] leading-relaxed text-[#18263e]">{sourceText}</span>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (let i = 0; i < fieldSpans.length; i++) {
    const span = fieldSpans[i];

    // If span starts before current cursor, adjust or skip to prevent overlap corruption
    const spanStart = Math.max(cursor, span.start);
    const spanEnd = Math.max(spanStart, span.end);

    if (spanStart > cursor) {
      // Unhighlighted text before this span
      nodes.push(
        <span key={`text-${cursor}`}>
          {sourceText.slice(cursor, spanStart)}
        </span>
      );
    }

    if (spanEnd > spanStart) {
      const isSelected = selectedFindingId === span.findingId;
      nodes.push(
        <mark
          key={`mark-${span.findingId}-${spanStart}`}
          onClick={() => onNavigateToFinding(span.findingId)}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all duration-150 inline-block font-medium ${
            isSelected
              ? "bg-[#b46b19] text-[#faf8f5] shadow-xs"
              : "bg-[#ebd1a4]/70 text-[#18263e] hover:bg-[#ebd1a4] border-b-2 border-[#b46b19]"
          }`}
          title={`Examined in "${span.findingTitle}" (click to view finding)`}
        >
          {sourceText.slice(spanStart, spanEnd)}
          <span className="sr-only"> (cited in finding {span.findingId})</span>
        </mark>
      );
      cursor = spanEnd;
    }
  }

  // Remaining unhighlighted text after last span
  if (cursor < sourceText.length) {
    nodes.push(
      <span key={`text-end-${cursor}`}>
        {sourceText.slice(cursor)}
      </span>
    );
  }

  return <span className="text-[17px] leading-relaxed text-[#18263e]">{nodes}</span>;
}

export function InYourWordsTab({
  decision,
  reasons,
  context,
  findings,
  onNavigateToFinding,
  selectedFindingId,
}: InYourWordsTabProps) {
  // Flatten all evidence spans from findings with parent finding metadata
  const allSpans: EnrichedSpan[] = [];
  findings.forEach((f) => {
    f.evidence?.forEach((ev) => {
      allSpans.push({
        findingId: f.id,
        findingTitle: f.title,
        field: ev.field,
        start: ev.start,
        end: ev.end,
        text: ev.text,
      });
    });
  });

  return (
    <div className="space-y-6 text-left">
      {/* Editorial Guide */}
      <div className="bg-[#ffffff] border border-[#dbd4c7] p-4 rounded-xl text-[15px] text-[#4e5e77] space-y-1">
        <p className="font-semibold text-[#18263e]">Annotated reasoning</p>
        <p>
          Highlighted phrases below are verbatim quotes cited in your findings. Click any highlighted phrase to jump directly to its corresponding finding card.
        </p>
      </div>

      {/* Field 1: What you are deciding */}
      <section className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-[#f3ede2] pb-2">
          <h2 className="font-serif font-bold text-[18px] text-[#18263e]">
            What you are deciding
          </h2>
          <span className="text-[13px] font-medium text-[#6c7c94]">Decision</span>
        </div>
        <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#dbd4c7]">
          {renderHighlightedText(
            decision,
            "decision",
            allSpans,
            onNavigateToFinding,
            selectedFindingId
          )}
        </div>
      </section>

      {/* Field 2: What is drawing you toward it (Reasons) */}
      <section className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-[#f3ede2] pb-2">
          <h2 className="font-serif font-bold text-[18px] text-[#18263e]">
            What is drawing you toward it
          </h2>
          <span className="text-[13px] font-medium text-[#6c7c94]">Your Reasons</span>
        </div>
        <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#dbd4c7]">
          {renderHighlightedText(
            reasons,
            "reasons",
            allSpans,
            onNavigateToFinding,
            selectedFindingId
          )}
        </div>
      </section>

      {/* Field 3: Additional Context */}
      <section className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between border-b border-[#f3ede2] pb-2">
          <h2 className="font-serif font-bold text-[18px] text-[#18263e]">
            Additional context & considerations
          </h2>
          <span className="text-[13px] font-medium text-[#6c7c94]">Context</span>
        </div>
        <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#dbd4c7]">
          {renderHighlightedText(
            context,
            "context",
            allSpans,
            onNavigateToFinding,
            selectedFindingId
          )}
        </div>
      </section>

      {/* Cited Findings Legend */}
      {allSpans.length > 0 && (
        <section className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 space-y-3">
          <h3 className="font-serif font-semibold text-[17px] text-[#18263e]">
            Findings with direct quotes in your text ({allSpans.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {findings
              .filter((f) => f.evidence && f.evidence.length > 0)
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onNavigateToFinding(f.id)}
                  className="text-left p-3 rounded-xl border border-[#dbd4c7] bg-[#faf8f5] hover:border-[#18263e] hover:bg-[#ffffff] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer space-y-1"
                >
                  <span className="text-[12px] font-mono text-[#b46b19] font-bold">
                    {f.id} • {f.category}
                  </span>
                  <p className="text-[15px] font-medium text-[#18263e] truncate">
                    {f.title}
                  </p>
                </button>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
