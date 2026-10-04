"use client";

import React, { useEffect, useRef } from "react";
import type { SupportResponse } from "@/lib/schema";

interface SupportCardProps {
  data: SupportResponse;
  onEditAnswers: () => void;
  onStartOver: () => void;
}

export function SupportCard({ data, onEditAnswers, onStartOver }: SupportCardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto py-8 sm:py-12 px-4 text-left">
      <div className="bg-[#ffffff] rounded-2xl border-2 border-[#18263e] p-6 sm:p-9 shadow-xs space-y-6">
        <div className="space-y-2">
          <span className="text-[13px] font-bold uppercase tracking-wider text-[#b46b19]">
            A Moment to Pause
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-serif font-bold text-[#18263e] text-[22px] sm:text-[25px] leading-snug focus-visible:outline-none"
          >
            Support and Resources
          </h2>
        </div>

        <p className="text-[16px] sm:text-[17px] text-[#18263e] leading-relaxed">
          {data.message}
        </p>

        {/* Helplines list */}
        <div className="space-y-3 pt-2">
          <h3 className="font-serif font-semibold text-[17px] text-[#18263e]">
            Available Support Services
          </h3>
          <div className="space-y-3">
            {data.helplines.map((helpline, idx) => (
              <div
                key={idx}
                className="bg-[#faf8f5] rounded-xl border border-[#dbd4c7] p-4 space-y-1"
              >
                <div className="font-semibold text-[#18263e] text-[16px]">
                  {helpline.name}
                </div>
                <div className="text-[17px] font-bold text-[#18263e]">
                  {helpline.contact}
                </div>
                {helpline.note && (
                  <div className="text-[14px] text-[#6c7c94]">
                    {helpline.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-3 border-t border-[#f3ede2] flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onEditAnswers}
            className="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
          >
            Edit my answers
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            Start over
          </button>
        </div>

        {/* Documented limitation note */}
        <p className="text-[13px] text-[#6c7c94] italic pt-1">
          Note: Automated keyword safeguards cannot catch every situation or nuanced context.
          If you or someone you know is in distress, please seek assistance from qualified professionals.
        </p>
      </div>
    </div>
  );
}
