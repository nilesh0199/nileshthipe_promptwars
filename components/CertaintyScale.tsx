"use client";

import React from "react";

interface CertaintyScaleProps {
  value: number | null;
  onChange: (val: number | null) => void;
}

export function CertaintyScale({ value, onChange }: CertaintyScaleProps) {
  const levels = [1, 2, 3, 4, 5];

  return (
    <fieldset className="space-y-2.5 text-left border-t border-[#f4efe6] pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <legend className="text-sm font-semibold text-[#18263e] flex items-center gap-1.5">
          <span>How sure do you feel about this decision right now?</span>
          <span className="text-xs font-normal text-[#6c7c94]">(Optional)</span>
        </legend>

        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-[#6c7c94] hover:text-[#18263e] underline-offset-4 hover:underline min-h-[32px] px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
          >
            Clear selection
          </button>
        )}
      </div>

      <p id="certainty-hint" className="text-xs text-[#4e5e77] leading-relaxed">
        This is just for you. The AI never sees it.
      </p>

      <div
        className="grid grid-cols-5 gap-2 sm:gap-3 pt-1"
        role="radiogroup"
        aria-describedby="certainty-hint"
      >
        {levels.map((level) => {
          const isSelected = value === level;
          const inputId = `certainty-level-${level}`;

          return (
            <label
              key={level}
              htmlFor={inputId}
              className={`flex flex-col items-center justify-center min-h-[48px] py-2 px-1 rounded-md border text-sm font-semibold transition-colors cursor-pointer select-none ${
                isSelected
                  ? "bg-[#18263e] text-[#fbf9f5] border-[#18263e] shadow-xs"
                  : "bg-[#ffffff] text-[#18263e] border-[#dbd4c7] hover:border-[#b46b19] hover:bg-[#fdf7ee]/50"
              }`}
            >
              <input
                type="radio"
                id={inputId}
                name="certaintyBefore"
                value={level}
                checked={isSelected}
                onChange={() => onChange(level)}
                className="sr-only"
              />
              <span className="text-base font-bold">{level}</span>
            </label>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-[#6c7c94] px-0.5 pt-0.5">
        <span>1: Not at all sure</span>
        <span>5: Very sure</span>
      </div>
    </fieldset>
  );
}
