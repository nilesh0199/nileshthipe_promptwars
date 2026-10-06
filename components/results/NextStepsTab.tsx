"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Finding } from "@/lib/schema";
import type { TriageChoice } from "./FindingsTab";
import { formatNotes } from "@/lib/notes";

interface NextStepsTabProps {
  decisionSummary: string;
  closingNote?: string;
  findings: Finding[];
  triageMap: Record<string, TriageChoice>;
  onSwitchToFindings: () => void;
  certaintyBefore?: number | null;
  certaintyAfter?: number | null;
  onSetCertaintyAfter?: (val: number) => void;
  personalNotes: string;
  onChangePersonalNotes: (notes: string) => void;
  savedDocId: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
}

export function NextStepsTab({
  decisionSummary,
  closingNote = "",
  findings,
  triageMap,
  onSwitchToFindings,
  personalNotes,
  onChangePersonalNotes,
  savedDocId,
  saveStatus,
  onSave,
}: NextStepsTabProps) {
  // Ordered findings marked "Worth investigating"
  const investigatingFindings = findings.filter(
    (f) => triageMap[f.id] === "investigate" && f.investigation_item
  );

  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "fallback">("idle");
  const [formattedFallbackText, setFormattedFallbackText] = useState<string>("");
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (copyStatus === "fallback" && fallbackTextareaRef.current) {
      fallbackTextareaRef.current.focus();
      fallbackTextareaRef.current.select();
    }
  }, [copyStatus]);

  const handleCopyNotes = async () => {
    const items = investigatingFindings.map((f) => ({
      title: f.title,
      investigationItem: f.investigation_item,
    }));

    const textToCopy = formatNotes({
      decisionSummary,
      items,
      notes: personalNotes,
      closingNote,
    });

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopyStatus("copied");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopyStatus("idle");
      }, 2000);
    } catch {
      setFormattedFallbackText(textToCopy);
      setCopyStatus("fallback");
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. What you chose to investigate (Ordered list) */}
      <section
        aria-labelledby="chosen-investigate-heading"
        className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
          <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider">
            Your Checklist
          </span>
          <h2
            id="chosen-investigate-heading"
            className="font-serif font-bold text-[#18263e] text-[20px]"
          >
            What you chose to investigate
          </h2>
          <p className="text-[14px] text-[#6c7c94]">
            Numbered action points based on findings you marked as worth exploring.
          </p>
        </div>

        {investigatingFindings.length > 0 ? (
          <ol className="list-decimal list-outside pl-5 space-y-3 pt-1">
            {investigatingFindings.map((finding) => (
              <li
                key={finding.id}
                className="text-[15px] sm:text-[16px] text-[#18263e] leading-relaxed pl-1"
              >
                <span className="font-medium text-[#18263e]">{finding.investigation_item}</span>{" "}
                <span className="text-[#64748b] text-[14px]">({finding.title})</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="py-8 px-4 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#dbd4c7] space-y-3">
            <p className="text-[15px] sm:text-[16px] text-[#4e5e77] max-w-md mx-auto">
              Nothing selected yet. Mark findings as &apos;Worth investigating&apos; and they will appear here.
            </p>
            <button
              type="button"
              onClick={onSwitchToFindings}
              className="min-h-[44px] px-5 py-2 rounded-xl text-[14px] font-semibold bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Go to Findings tab &rarr;
            </button>
          </div>
        )}
      </section>

      {/* 2. Where my thinking is now */}
      <section
        aria-labelledby="thinking-now-heading"
        className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-3 shadow-2xs"
      >
        <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
          <h2
            id="thinking-now-heading"
            className="font-serif font-bold text-[#18263e] text-[20px]"
          >
            Where my thinking is now
          </h2>
          <p className="text-[14px] text-[#6c7c94]">
            Your own space to synthesize your thoughts after seeing what was missing.
          </p>
        </div>

        <textarea
          rows={4}
          maxLength={2000}
          value={personalNotes}
          onChange={(e) => onChangePersonalNotes(e.target.value)}
          placeholder="Capture your immediate takeaways, resolved uncertainties, or next discussions you want to have..."
          className="w-full px-4 py-3 rounded-xl border border-[#dbd4c7] text-[16px] text-[#18263e] bg-[#ffffff] placeholder-[#6c7c94] focus-visible:outline-2 focus-visible:outline-[#18263e] resize-y"
          aria-labelledby="thinking-now-heading"
        />
      </section>

      {/* 4. Closing thought */}
      {closingNote && (
        <aside
          role="note"
          aria-label="Closing reminder"
          className="bg-[#fdf7ee] border border-[#ebd1a4] rounded-2xl p-5 space-y-1"
        >
          <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider block">
            Closing Thought
          </span>
          <p className="font-serif text-[16px] sm:text-[17px] text-[#18263e] leading-relaxed italic">
            &ldquo;{closingNote}&rdquo;
          </p>
        </aside>
      )}

      {/* 5. Actions row: Copy my notes & Save status */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyNotes}
              className="min-h-[46px] px-6 py-2.5 rounded-xl font-semibold text-[15px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 2H9a3 3 0 01-3-2z" />
              </svg>
              <span>Copy my notes</span>
            </button>

            {/* Screen-reader announcement & visual indicator */}
            <div aria-live="polite" className="text-[14px] font-semibold text-[#b46b19]">
              {copyStatus === "copied" && <span>Copied</span>}
            </div>
          </div>

          {/* Real Save Flow */}
          <div className="flex flex-col sm:items-end gap-1.5">
            {savedDocId ? (
              <div aria-live="polite" className="flex items-center gap-3 min-h-[44px]">
                <span className="text-[15px] font-semibold text-[#18263e] flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#18263e]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {saveStatus === "saving" ? "Saving..." : "Saved"}
                </span>
                <Link
                  href={`/saved/${savedDocId}`}
                  className="text-[15px] font-medium text-[#b46b19] hover:underline focus-visible:outline-2 focus-visible:outline-[#18263e]"
                >
                  View in saved &rarr;
                </Link>
              </div>
            ) : saveStatus === "error" ? (
              <div className="flex items-center gap-3 min-h-[44px]">
                <span role="alert" className="text-[14px] font-medium text-[#b46b19]">
                  Couldn&apos;t save analysis.
                </span>
                <button
                  type="button"
                  onClick={onSave}
                  className="min-h-[44px] px-4 py-2 rounded-xl font-semibold text-[15px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
                >
                  Try again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSave}
                disabled={saveStatus === "saving"}
                className="min-h-[46px] px-5 py-2.5 rounded-xl font-medium text-[15px] text-[#18263e] bg-[#ffffff] border border-[#dbd4c7] hover:bg-[#f3ede2] hover:border-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs disabled:opacity-60"
              >
                {saveStatus === "saving" ? "Saving..." : "Save this analysis"}
              </button>
            )}

            <p className="text-[13px] text-[#6c7c94] text-left sm:text-right">
              Saved analyses are private to your account. You can delete them anytime.
            </p>
          </div>
        </div>

        {/* Fallback copy area if clipboard API failed */}
        {copyStatus === "fallback" && (
          <div role="region" aria-label="Manual copy area" className="p-4 rounded-xl border border-[#ebd1a4] bg-[#fdf7ee] space-y-2">
            <p className="text-[15px] font-medium text-[#18263e]">
              Couldn&apos;t copy automatically. Select the text below and copy it.
            </p>
            <textarea
              ref={fallbackTextareaRef}
              readOnly
              rows={6}
              value={formattedFallbackText}
              className="w-full p-3 font-mono text-[14px] bg-[#ffffff] border border-[#dbd4c7] rounded-lg text-[#18263e] select-all focus-visible:outline-2 focus-visible:outline-[#18263e]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
