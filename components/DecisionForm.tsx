"use client";

import React, { useState, useEffect, useRef } from "react";
import { DecisionInput } from "@/lib/types";
import {
  DecisionTypeId,
  getDecisionTypeConfig,
} from "@/lib/decisionTypes";
import { FormField } from "./FormField";
import { CertaintyScale } from "./CertaintyScale";

export const STORAGE_KEY = "second_look_session_state";

const INITIAL_FORM: DecisionInput = {
  decision: "",
  options: "",
  reasons: "",
  knownFacts: "",
  uncertainties: "",
  constraints: "",
  decisionType: "career",
  certaintyBefore: null,
};

interface DecisionFormProps {
  initialData?: DecisionInput;
  initialType?: DecisionTypeId;
  initialStep?: 1 | 2;
  onChangeType: () => void;
  onExit: () => void;
}

function hasUserTyped(data: DecisionInput): boolean {
  return Boolean(
    data.decision.trim() ||
      data.options.trim() ||
      data.reasons.trim() ||
      data.knownFacts.trim() ||
      data.uncertainties.trim() ||
      data.constraints.trim() ||
      data.certaintyBefore !== null
  );
}

function getStoredState(fallbackType: DecisionTypeId): {
  formData: DecisionInput;
  step: 1 | 2;
} {
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const storedType: DecisionTypeId = parsed?.formData?.decisionType || fallbackType;
        const restoredFormData: DecisionInput = parsed?.formData
          ? {
              ...INITIAL_FORM,
              ...parsed.formData,
              decisionType: storedType,
              certaintyBefore: parsed.formData.certaintyBefore ?? null,
            }
          : { ...INITIAL_FORM, decisionType: fallbackType };
        const restoredStep: 1 | 2 =
          parsed?.step === 2 || parsed?.step === 1 ? parsed.step : 1;
        return { formData: restoredFormData, step: restoredStep };
      }
    } catch {
      // Ignore sessionStorage read errors
    }
  }
  return {
    formData: { ...INITIAL_FORM, decisionType: fallbackType },
    step: 1,
  };
}

export function DecisionForm({
  initialData,
  initialType = "career",
  initialStep = 1,
  onChangeType,
  onExit,
}: DecisionFormProps) {
  const [formData, setFormData] = useState<DecisionInput>(() => {
    if (initialData) return initialData;
    return getStoredState(initialType).formData;
  });

  const [step, setStep] = useState<1 | 2>(() => {
    if (initialStep) return initialStep;
    return getStoredState(initialType).step;
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DecisionInput, string>>>({});
  const [showAnalysisPlaceholder, setShowAnalysisPlaceholder] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const decisionRef = useRef<HTMLTextAreaElement>(null);
  const reasonsRef = useRef<HTMLTextAreaElement>(null);

  const typeConfig = getDecisionTypeConfig(formData.decisionType);

  // Synchronize state changes to external sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formData,
          step,
          view: "form",
        })
      );
    } catch {
      // Ignore sessionStorage write errors
    }
  }, [formData, step]);

  const updateField = (field: keyof DecisionInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateCertainty = (val: number | null) => {
    setFormData((prev) => ({ ...prev, certaintyBefore: val }));
  };

  const handleNext = () => {
    if (!formData.decision.trim()) {
      setErrors({
        decision: "Please describe what you are deciding before proceeding.",
      });
      decisionRef.current?.focus();
      return;
    }

    setErrors({});
    setStep(2);
    setTimeout(() => {
      reasonsRef.current?.focus();
    }, 50);
  };

  const handleBack = () => {
    if (step === 2) {
      setErrors({});
      setShowAnalysisPlaceholder(false);
      setStep(1);
    } else {
      onExit();
    }
  };

  const handleAnalyze = () => {
    if (!formData.reasons.trim()) {
      setErrors({
        reasons: "Please share what makes this option appealing before analysis.",
      });
      reasonsRef.current?.focus();
      return;
    }

    setErrors({});
    setShowAnalysisPlaceholder(true);
  };

  const handleFillExampleClick = () => {
    if (hasUserTyped(formData)) {
      setShowOverwriteConfirm(true);
    } else {
      applyExample();
    }
  };

  const applyExample = () => {
    const ex = typeConfig.example;
    setFormData((prev) => ({
      ...prev,
      ...ex,
      decisionType: prev.decisionType,
      certaintyBefore: null,
    }));
    setErrors({});
    setShowOverwriteConfirm(false);
  };

  const handleStartOver = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore error
      }
    }
    setFormData({ ...INITIAL_FORM, decisionType: formData.decisionType });
    setErrors({});
    setShowAnalysisPlaceholder(false);
    setShowOverwriteConfirm(false);
    setStep(1);
    onExit();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Decision Type Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-[#4e5e77] pb-3 border-b border-[#dbd4c7]">
        <div className="flex items-center gap-2">
          <span className="text-[#6c7c94]">Category:</span>
          <span className="font-semibold text-[#18263e]">{typeConfig.label}</span>
          <button
            type="button"
            onClick={onChangeType}
            className="text-[#b46b19] hover:underline font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] min-h-[36px] px-2 rounded cursor-pointer"
          >
            Change type
          </button>
        </div>

        <button
          type="button"
          onClick={handleFillExampleClick}
          className="text-xs font-medium text-[#18263e] bg-[#f4efe6] hover:bg-[#dbd4c7] px-2.5 py-1.5 rounded border border-[#dbd4c7] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
        >
          Fill with an example
        </button>
      </div>

      {/* Overwrite Confirmation Banner if user already typed */}
      {showOverwriteConfirm && (
        <div
          role="alert"
          className="rounded-md border border-[#ebd1a4] bg-[#fdf7ee] p-4 text-left space-y-3"
        >
          <div className="space-y-1">
            <p className="font-semibold text-sm text-[#18263e]">
              Overwrite current entries?
            </p>
            <p className="text-xs text-[#4e5e77] leading-relaxed">
              You have already typed your own thoughts. Loading the &ldquo;{typeConfig.label}&rdquo; example will replace your entered text.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={applyExample}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded bg-[#18263e] text-[#fbf9f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Yes, fill example
            </button>
            <button
              type="button"
              onClick={() => setShowOverwriteConfirm(false)}
              className="min-h-[40px] px-3 py-2 text-xs font-medium text-[#4e5e77] hover:text-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Keep my text
            </button>
          </div>
        </div>
      )}

      {/* Advisory Note for Money Type */}
      {typeConfig.showAdviceNote && (
        <div
          role="note"
          className="rounded-md border border-[#dbd4c7] bg-[#fdf7ee] p-3.5 text-xs text-[#4e5e77] leading-relaxed text-left"
        >
          <span className="font-semibold text-[#18263e]">Notice: </span>
          This tool helps you examine your thinking. It isn&apos;t financial advice.
        </div>
      )}

      {/* Form Header with Progress indicator */}
      <div className="border-b border-[#dbd4c7] pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#18263e]">
              {step === 1 ? "What is the decision?" : "Your reasoning"}
            </h2>
            <p className="text-xs sm:text-sm text-[#4e5e77] mt-1">
              {step === 1
                ? "Clarify the central choice and options under consideration."
                : "Explore your motivations, context, doubts, and constraints."}
            </p>
          </div>
          <div className="text-right">
            <span
              aria-current="step"
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#fdf7ee] text-[#b46b19] border border-[#ebd1a4]"
            >
              Step {step} of 2
            </span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <FormField
              id="decision"
              label="What are you deciding?"
              value={formData.decision}
              onChange={(val) => updateField("decision", val)}
              required
              helperText="Describe the core question or choice currently on your mind."
              placeholder={typeConfig.placeholders.decision}
              maxLength={600}
              rows={3}
              error={errors.decision}
              textareaRef={decisionRef}
            />

            <FormField
              id="options"
              label="Options you're weighing"
              value={formData.options}
              onChange={(val) => updateField("options", val)}
              required={false}
              helperText="List alternatives you are considering, including doing nothing or keeping the status quo."
              placeholder={typeConfig.placeholders.options}
              maxLength={600}
              rows={3}
              error={errors.options}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <FormField
              id="reasons"
              label="Why is this appealing?"
              value={formData.reasons}
              onChange={(val) => updateField("reasons", val)}
              required
              helperText="Share what draws you to this path or what benefits stand out to you."
              placeholder={typeConfig.placeholders.reasons}
              maxLength={600}
              rows={3}
              error={errors.reasons}
              textareaRef={reasonsRef}
            />

            <FormField
              id="knownFacts"
              label="What do you already know?"
              value={formData.knownFacts}
              onChange={(val) => updateField("knownFacts", val)}
              required={false}
              helperText="Confirmed facts, figures, or conditions you are working with."
              placeholder={typeConfig.placeholders.knownFacts}
              maxLength={600}
              rows={3}
              error={errors.knownFacts}
            />

            <FormField
              id="uncertainties"
              label="What are you unsure about?"
              value={formData.uncertainties}
              onChange={(val) => updateField("uncertainties", val)}
              required={false}
              helperText="Gaps in information, unknowns, or doubts you have noticed."
              placeholder={typeConfig.placeholders.uncertainties}
              maxLength={600}
              rows={3}
              error={errors.uncertainties}
            />

            <FormField
              id="constraints"
              label="What constraints do you have? (time, money, people)"
              value={formData.constraints}
              onChange={(val) => updateField("constraints", val)}
              required={false}
              helperText="Any deadlines, financial realities, or personal commitments."
              placeholder={typeConfig.placeholders.constraints}
              maxLength={600}
              rows={3}
              error={errors.constraints}
            />

            {/* Certainty Before field */}
            <CertaintyScale
              value={formData.certaintyBefore}
              onChange={updateCertainty}
            />
          </div>
        )}

        {/* Placeholder Alert for Step 2 Analyze */}
        {showAnalysisPlaceholder && (
          <div
            role="status"
            className="rounded-md border border-[#ebd1a4] bg-[#fdf7ee] p-4 text-left space-y-1"
          >
            <p className="font-semibold text-sm text-[#18263e]">
              Analysis coming in the next phase
            </p>
            <p className="text-xs text-[#4e5e77] leading-relaxed">
              Your decision details and reasoning have been validated. In Phase 3,
              Gemini will analyze this thinking for unexamined assumptions and blind spots.
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="pt-4 border-t border-[#dbd4c7] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[44px] px-5 py-2.5 rounded-md text-sm font-medium text-[#18263e] border border-[#dbd4c7] bg-transparent hover:bg-[#f4efe6] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] w-full sm:w-auto cursor-pointer"
            >
              {step === 1 ? "Back to overview" : "Back to Step 1"}
            </button>
            <button
              type="button"
              onClick={handleStartOver}
              className="min-h-[44px] px-3 py-2 text-xs text-[#6c7c94] hover:text-[#18263e] underline-offset-4 hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Start over
            </button>
          </div>

          <div className="w-full sm:w-auto">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-md text-sm font-medium text-[#fbf9f5] bg-[#18263e] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Next: Your reasoning
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAnalyze}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-md text-sm font-medium text-[#fbf9f5] bg-[#18263e] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Analyze
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
