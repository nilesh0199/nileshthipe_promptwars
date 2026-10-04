"use client";

import React from "react";
import type { AnalyzeResponse } from "@/lib/schema";

interface DeveloperPreviewProps {
  data: AnalyzeResponse;
  onBack: () => void;
  onStartOver: () => void;
}

/**
 * Temporary developer preview rendering formatted analysis JSON and receipt summary.
 * Rendered strictly as plain React text, never dangerouslySetInnerHTML.
 * Will be replaced with the full results and triage UI in the next phase.
 */
export function DeveloperPreview({
  data,
  onBack,
  onStartOver,
}: DeveloperPreviewProps) {
  const { receipt } = data;
  const receiptSummary = `Receipt: language check ${receipt.language_check}, ${receipt.findings_total} findings (${receipt.findings_grounded} grounded, ${receipt.quotes_dropped} quotes dropped), retry: ${receipt.retried ? "yes" : "no"}.`;

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5 pb-2 border-b border-[#f3ede2]">
        <h1 className="font-serif font-bold text-[#18263e] text-[clamp(1.5rem,2.8vw,2rem)] leading-tight">
          Analysis (developer preview; the final design comes next)
        </h1>
        <p className="text-[15px] font-medium text-[#4e5e77]">
          {receiptSummary}
        </p>
      </div>

      {/* Raw Formatted JSON Output - Plain Text Only */}
      <pre className="w-full overflow-x-auto text-[15px] p-4 bg-[#f3ede2]/70 rounded-xl text-[#18263e] font-mono leading-relaxed border border-[#dbd4c7] max-h-[380px] overflow-y-auto select-text">
        {JSON.stringify(data, null, 2)}
      </pre>

      {/* Action Row */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-6 py-2.5 rounded-xl font-medium text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          Back to my answers
        </button>

        <button
          type="button"
          onClick={onStartOver}
          className="min-h-[44px] px-5 py-2.5 rounded-xl text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
