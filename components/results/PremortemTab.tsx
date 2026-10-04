"use client";

import React from "react";
import type { ReasoningEntry } from "@/lib/schema";

interface PremortemTabProps {
  premortemQuestions: string[];
  reasoningMap: ReasoningEntry[];
}

export function PremortemTab({
  premortemQuestions,
  reasoningMap,
}: PremortemTabProps) {
  return (
    <div className="space-y-6 text-left">
      {/* Editorial Overview */}
      <div className="bg-[#ffffff] border border-[#dbd4c7] p-4 rounded-xl text-[15px] text-[#4e5e77] space-y-1">
        <p className="font-semibold text-[#18263e]">Looking backward from the future</p>
        <p>
          A premortem assumes a future where the decision did not turn out as intended, prompting you to identify vulnerabilities before committing.
        </p>
      </div>

      {/* Premortem Questions Section */}
      <section
        aria-labelledby="premortem-heading"
        className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
          <span className="text-[12px] font-bold text-[#b46b19] uppercase tracking-wider">
            Prospective Hindsight
          </span>
          <h2
            id="premortem-heading"
            className="font-serif font-bold text-[#18263e] text-[20px]"
          >
            Premortem Reflection Questions
          </h2>
          <p className="text-[14px] text-[#6c7c94]">
            Consider each scenario as an open question to test the resilience of your plan.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {premortemQuestions && premortemQuestions.length > 0 ? (
            premortemQuestions.map((question, idx) => (
              <div
                key={idx}
                className="bg-[#fdf7ee] border border-[#ebd1a4] rounded-xl p-4 flex gap-3 items-start"
              >
                <span className="w-6 h-6 rounded-full bg-[#18263e] text-[#faf8f5] flex items-center justify-center font-bold text-[13px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="font-serif text-[16px] sm:text-[17px] text-[#18263e] leading-relaxed italic">
                  &ldquo;{question}&rdquo;
                </p>
              </div>
            ))
          ) : (
            <p className="text-[15px] text-[#6c7c94] italic">
              No specific premortem questions generated.
            </p>
          )}
        </div>
      </section>

      {/* Reasoning Map Section */}
      <section
        aria-labelledby="reasoning-map-heading"
        className="bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-6 space-y-4 shadow-2xs"
      >
        <div className="border-b border-[#f3ede2] pb-2 space-y-0.5">
          <span className="text-[12px] font-bold text-[#18263e] uppercase tracking-wider">
            Structural Audit
          </span>
          <h2
            id="reasoning-map-heading"
            className="font-serif font-bold text-[#18263e] text-[20px]"
          >
            Reasoning Map
          </h2>
          <p className="text-[14px] text-[#6c7c94]">
            An audit of the reasons you gave and the unstated premises they quietly rely upon.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-1">
          {reasoningMap && reasoningMap.length > 0 ? (
            reasoningMap.map((entry) => (
              <article
                key={entry.id}
                className="bg-[#faf8f5] rounded-xl border border-[#dbd4c7] p-4 sm:p-5 space-y-3"
              >
                {/* Stated Reason */}
                <div className="space-y-1">
                  <span className="text-[12px] font-mono font-bold text-[#6c7c94] uppercase tracking-wider">
                    {entry.id} • Your stated reason
                  </span>
                  <p className="font-serif font-bold text-[17px] text-[#18263e]">
                    &ldquo;{entry.stated_reason}&rdquo;
                  </p>
                </div>

                {/* Evidence Given */}
                <div className="text-[14px] text-[#4e5e77] bg-[#ffffff] p-3 rounded-lg border border-[#dbd4c7]">
                  <strong className="text-[#18263e] font-semibold">Evidence cited in your words: </strong>
                  {entry.evidence_given ? (
                    <span className="italic">&ldquo;{entry.evidence_given}&rdquo;</span>
                  ) : (
                    <span className="italic text-[#6c7c94]">None explicitly stated</span>
                  )}
                </div>

                {/* What it rests on */}
                <div className="text-[14px] text-[#4e5e77] bg-[#fdf7ee] p-3 rounded-lg border border-[#ebd1a4]">
                  <strong className="text-[#b46b19] font-bold">Unstated premise: </strong>
                  <span>{entry.rests_on}</span>
                </div>
              </article>
            ))
          ) : (
            <p className="text-[15px] text-[#6c7c94] italic">
              No reasoning map entries extracted.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
