"use client";

import React from "react";

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  helperText: string;
  maxLength?: number;
  rows?: number;
  error?: string;
  placeholder?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function FormField({
  id,
  label,
  value,
  onChange,
  required = false,
  helperText,
  maxLength = 600,
  rows = 3,
  error,
  placeholder,
  textareaRef,
}: FormFieldProps) {
  const remaining = maxLength - value.length;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;

  const describedBy = error
    ? `${errorId} ${helperId} ${counterId}`
    : `${helperId} ${counterId}`;

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-[#18263e] flex items-center gap-1.5"
        >
          <span>{label}</span>
          {required ? (
            <span className="text-xs font-medium text-[#b46b19]">
              (Required)
            </span>
          ) : (
            <span className="text-xs font-normal text-[#6c7c94]">
              (Optional)
            </span>
          )}
        </label>
      </div>

      <p id={helperId} className="text-xs text-[#4e5e77] leading-relaxed">
        {helperText}
      </p>

      <textarea
        ref={textareaRef}
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        aria-required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full px-3.5 py-2.5 rounded-md border text-sm text-[#18263e] bg-[#ffffff] placeholder-[#6c7c94] transition-colors resize-y min-h-[90px] focus-visible:outline-2 focus-visible:outline-offset-2 ${
          error
            ? "border-2 border-[#18263e] bg-[#fdf7ee] focus-visible:outline-[#18263e]"
            : "border-[#dbd4c7] hover:border-[#b46b19]/60 focus-visible:outline-[#18263e]"
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pt-0.5">
        <div className="min-h-[20px]">
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="text-xs font-medium text-[#18263e] bg-[#fdf7ee] border-l-2 border-[#b46b19] px-2 py-0.5"
            >
              {error}
            </p>
          ) : null}
        </div>
        <div
          id={counterId}
          aria-live="polite"
          className="text-xs text-[#6c7c94] tabular-nums self-end sm:self-auto"
        >
          {remaining} {remaining === 1 ? "character" : "characters"} left
        </div>
      </div>
    </div>
  );
}
