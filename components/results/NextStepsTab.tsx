"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Finding } from "@/lib/schema";
import type { TriageChoice } from "./FindingsTab";

interface NextStepsTabProps {
  decisionSummary: string;
  closingNote?: string;
  findings: Finding[];
  triageMap: Record<string, TriageChoice>;
  onSwitchToFindings: () => void;
  personalNotes: string;
  onChangePersonalNotes: (notes: string) => void;
  savedDocId: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
}

export function NextStepsTab({
  decisionSummary,
  closingNote,
  findings,
  triageMap,
  onSwitchToFindings,
  personalNotes,
  onChangePersonalNotes,
  savedDocId,
  saveStatus,
  onSave,
}: NextStepsTabProps) {
  // Filter findings marked "Worth investigating"
  const investigatingFindings = findings.filter(
    (f) => triageMap[f.id] === "investigate" && f.investigation_item
  );

  // Local checklist checked state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  // Copy confirmation state
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  const toggleCheck = (findingId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  const handleCopyNotes = async () => {
    const lines: string[] = [];
    lines.push(`PERSPECTRA REFLECTION SUMMARY`);
    lines.push(`Decision: ${decisionSummary}\n`);

    if (investigatingFindings.length > 0) {
      lines.push(`ITEMS TO INVESTIGATE:`);
      investigatingFindings.forEach((f) => {
        const isChecked = checkedItems[f.id] ? "[x]" : "[ ]";
        lines.push(`${isChecked} ${f.investigation_item} (${f.title})`);
      });
      lines.push("");
    }

    if (personalNotes.trim()) {
      lines.push(`WHERE MY THINKING IS NOW:`);
      lines.push(personalNotes.trim());
      lines.push("");
    }

    if (closingNote) {
      lines.push(`NOTE:\n${closingNote}\n`);
    }

    lines.push(
      `---\nPerspectra is a thinking tool. It surfaces assumptions and questions, but never decides for you.`
    );

    const fullText = lines.join("\n");

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = fullText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 3000);
    } catch {
      setCopiedStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Inquiry Checklist */}
      <section
        aria-labelledby="checklist-heading"
        className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
          <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider">
            Inquiry Action Items
          </span>
          <h2
            id="checklist-heading"
            className="font-serif font-bold text-[#18263e] text-[20px]"
          >
            Investigation Checklist ({investigatingFindings.length})
          </h2>
          <p className="text-[14px] text-[#6c7c94]">
            Specific questions and facts to verify before deciding.
          </p>
        </div>

        {investigatingFindings.length > 0 ? (
          <ul className="space-y-3 pt-1">
            {investigatingFindings.map((finding) => {
              const isChecked = Boolean(checkedItems[finding.id]);
              return (
                <li
                  key={finding.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                    isChecked
                      ? "bg-[#faf8f5] border-[#dbd4c7]"
                      : "bg-[#ffffff] border-[#dbd4c7] hover:border-[#18263e]"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`check-${finding.id}`}
                    checked={isChecked}
                    onChange={() => toggleCheck(finding.id)}
                    className="w-5 h-5 mt-0.5 rounded border-[#dbd4c7] text-[#18263e] focus:ring-[#18263e] cursor-pointer"
                  />
                  <label
                    htmlFor={`check-${finding.id}`}
                    className="flex-1 text-[15px] sm:text-[16px] text-[#18263e] cursor-pointer select-none space-y-0.5"
                  >
                    <span className={isChecked ? "line-through text-[#6c7c94]" : "text-[#18263e]"}>
                      {finding.investigation_item}
                    </span>
                    <span className="block text-[13px] text-[#6c7c94]">
                      From: {finding.title}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-8 px-4 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#dbd4c7] space-y-3">
            <p className="text-[16px] font-medium text-[#18263e]">
              No findings marked to investigate yet
            </p>
            <p className="text-[14px] text-[#6c7c94] max-w-md mx-auto">
              Visit the Findings tab and select &ldquo;Worth investigating&rdquo; on any items you want to explore further. They will appear here in your personal checklist.
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

      {/* User Reflection Note: "Where my thinking is now" */}
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
          value={personalNotes}
          onChange={(e) => onChangePersonalNotes(e.target.value)}
          placeholder="Capture your immediate takeaways, resolved uncertainties, or next discussions you want to have..."
          className="w-full px-4 py-3 rounded-xl border border-[#dbd4c7] text-[16px] text-[#18263e] bg-[#ffffff] placeholder-[#6c7c94] focus-visible:outline-2 focus-visible:outline-[#18263e] resize-y"
          aria-labelledby="thinking-now-heading"
        />
      </section>

      {/* Closing Note Banner */}
      {closingNote && (
        <aside
          role="note"
          aria-label="Closing reminder"
          className="bg-[#fdf7ee] border border-[#ebd1a4] rounded-2xl p-5 space-y-1"
        >
          <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider">
            Closing Thought
          </span>
          <p className="font-serif text-[16px] sm:text-[17px] text-[#18263e] leading-relaxed italic">
            &ldquo;{closingNote}&rdquo;
          </p>
        </aside>
      )}

      {/* Action Row: Copy Notes & Real Save Flow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
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
            <span>{copiedStatus ? "Copied to clipboard!" : "Copy my notes"}</span>
          </button>

          {copiedStatus && (
            <span role="status" className="text-[14px] font-semibold text-[#b46b19]">
              ✓ Notes copied
            </span>
          )}
        </div>

        {/* Real Save Flow with Privacy Notice */}
        <div className="flex flex-col sm:items-end gap-1.5">
          {savedDocId ? (
            <div
              aria-live="polite"
              className="flex items-center gap-3 min-h-[44px]"
            >
              <span className="text-[15px] font-semibold text-[#18263e] flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#18263e]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
    </div>
  );
}
