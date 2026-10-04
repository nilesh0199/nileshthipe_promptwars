"use client";

import React, { useState } from "react";
import type { Finding } from "@/lib/schema";
import type { TriageChoice } from "./FindingsTab";

interface NextStepsTabProps {
  decisionSummary: string;
  closingNote: string;
  findings: Finding[];
  triageMap: Record<string, TriageChoice>;
  onSwitchToFindings: () => void;
}

export function NextStepsTab({
  decisionSummary,
  closingNote,
  findings,
  triageMap,
  onSwitchToFindings,
}: NextStepsTabProps) {
  // Filter findings marked "Worth investigating"
  const investigatingFindings = findings.filter(
    (f) => triageMap[f.id] === "investigate" && f.investigation_item
  );

  // Local checklist checked state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  // User personal reflection notes
  const [personalNotes, setPersonalNotes] = useState<string>("");
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
    lines.push(`SECOND LOOK REFLECTION SUMMARY`);
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
      lines.push(`NOTE:`);
      lines.push(closingNote);
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 3000);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Editorial Overview */}
      <div className="bg-[#ffffff] border border-[#dbd4c7] p-4 rounded-xl text-[15px] text-[#4e5e77] space-y-1">
        <p className="font-semibold text-[#18263e]">Your Personal Next Steps</p>
        <p>
          This checklist compiles the concrete inquiry items from findings you selected as worth investigating. The decision remains yours to steer.
        </p>
      </div>

      {/* Investigation Checklist Section */}
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
          onChange={(e) => setPersonalNotes(e.target.value)}
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

      {/* Action Row: Copy Notes & Save Stub */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
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

        {/* Save Stub (Clearly marked coming next) */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Account saving will be added in a future phase"
          className="min-h-[46px] px-5 py-2.5 rounded-xl text-[14px] font-medium text-[#6c7c94] bg-[#f3ede2]/70 border border-[#dbd4c7] cursor-not-allowed opacity-80"
        >
          Save this analysis — sign-in coming next
        </button>
      </div>
    </div>
  );
}
