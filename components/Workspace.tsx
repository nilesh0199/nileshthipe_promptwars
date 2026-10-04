"use client";

import React, { useState, useEffect, useRef, KeyboardEvent } from "react";
import { DecisionInput } from "@/lib/types";
import {
  DecisionTypeId,
  DECISION_TYPES,
  getDecisionTypeConfig,
} from "@/lib/decisionTypes";
import { WORKSPACE_SCREENS, FlowScreenConfig } from "@/lib/flow";
import { LIMITS } from "@/lib/limits";
import type { AnalyzeResponse } from "@/lib/schema";
import { DeveloperPreview } from "./DeveloperPreview";

export const STORAGE_KEY = "second_look_workspace_v2";

const INITIAL_FORM: DecisionInput = {
  decisionType: "career",
  decision: "",
  reasons: "",
  context: "",
  certaintyBefore: null,
};

interface WorkspaceProps {
  onExit: () => void;
}

function truncate(str: string, maxLen = 35): string {
  const trimmed = str.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim() + "…";
}

function hasUserTyped(data: DecisionInput): boolean {
  return Boolean(
    data.decision.trim() ||
      data.reasons.trim() ||
      data.context.trim() ||
      data.certaintyBefore !== null
  );
}

function getStoredState(): {
  formData: DecisionInput;
  screenIndex: number;
} {
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed?.formData &&
          typeof parsed.formData.decision === "string" &&
          typeof parsed.formData.reasons === "string" &&
          typeof parsed.formData.context === "string" &&
          !("options" in parsed.formData)
        ) {
          const screenIndex =
            typeof parsed.screenIndex === "number" &&
            parsed.screenIndex >= 0 &&
            parsed.screenIndex < WORKSPACE_SCREENS.length
              ? parsed.screenIndex
              : 0;

          return {
            formData: {
              decisionType: parsed.formData.decisionType || "career",
              decision: parsed.formData.decision,
              reasons: parsed.formData.reasons,
              context: parsed.formData.context,
              certaintyBefore: parsed.formData.certaintyBefore ?? null,
            },
            screenIndex,
          };
        }
      }
    } catch {
      // Ignore sessionStorage read errors and start clean
    }
  }

  return {
    formData: INITIAL_FORM,
    screenIndex: 0,
  };
}

const LOADING_MESSAGES = [
  "Reading your reasons...",
  "Looking for assumptions...",
  "Checking what's missing...",
];

type AnalysisStatus = "idle" | "loading" | "error" | "success";

export function Workspace({ onExit }: WorkspaceProps) {
  const [formData, setFormData] = useState<DecisionInput>(() => getStoredState().formData);
  const [screenIndex, setScreenIndex] = useState<number>(() => getStoredState().screenIndex);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<"overwrite" | "startOver" | null>(null);

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const radioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentScreen: FlowScreenConfig = WORKSPACE_SCREENS[screenIndex];
  const typeConfig = getDecisionTypeConfig(formData.decisionType);
  const liveAnnouncement = `Question ${screenIndex + 1} of ${WORKSPACE_SCREENS.length}: ${currentScreen.heading}`;

  // Rotate loading step every 2.5 seconds
  useEffect(() => {
    if (analysisStatus !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [analysisStatus]);

  // Synchronize state with sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          formData,
          screenIndex,
          view: "workspace",
        })
      );
    } catch {
      // Ignore sessionStorage write errors
    }
  }, [formData, screenIndex]);

  // Focus input on screen change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentScreen.id === "certainty") {
        const checkedIdx = formData.certaintyBefore ? formData.certaintyBefore - 1 : 0;
        radioRefs.current[checkedIdx]?.focus();
      } else if (currentScreen.id !== "type") {
        textareaRef.current?.focus();
      }
    }, 40);

    return () => clearTimeout(timer);
  }, [screenIndex, currentScreen.id, formData.certaintyBefore]);

  const updateField = (field: keyof DecisionInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  const updateCertainty = (val: number | null) => {
    setFormData((prev) => ({ ...prev, certaintyBefore: val }));
  };

  const handleRadioKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    level: number
  ) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = level < 5 ? level + 1 : 1;
      updateCertainty(next);
      radioRefs.current[next - 1]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = level > 1 ? level - 1 : 5;
      updateCertainty(prev);
      radioRefs.current[prev - 1]?.focus();
    }
  };

  const goToScreen = (newIndex: number) => {
    if (newIndex === screenIndex) return;
    setErrorMsg(null);
    setDirection(newIndex > screenIndex ? "forward" : "backward");
    setScreenIndex(newIndex);
  };

  const handleBack = () => {
    if (screenIndex > 0) {
      goToScreen(screenIndex - 1);
    } else {
      onExit();
    }
  };

  const validateCurrent = (): boolean => {
    if (currentScreen.id === "decision") {
      if (formData.decision.trim().length < LIMITS.decision.min) {
        setErrorMsg("Add a sentence or two to continue.");
        textareaRef.current?.focus();
        return false;
      }
    } else if (currentScreen.id === "reasons") {
      if (formData.reasons.trim().length < LIMITS.reasons.min) {
        setErrorMsg("Add a sentence or two to continue.");
        textareaRef.current?.focus();
        return false;
      }
    }
    return true;
  };

  const handleStartAnalysis = async () => {
    setAnalysisStatus("loading");
    setAnalysisError(null);
    setLoadingStep(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // certaintyBefore is intentionally excluded: it is strictly for personal user reflection
    // and must never be sent to the AI to prevent nudging or anchoring biases.
    const payload = {
      decisionType: formData.decisionType,
      decision: formData.decision,
      reasons: formData.reasons,
      context: formData.context,
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        const code = data?.error?.code || "SERVER_ERROR";
        const message =
          data?.error?.message ||
          "Something went wrong on our side. Please try again.";
        setAnalysisError({ code, message });
        setAnalysisStatus("error");
        return;
      }

      setAnalysisResult(data as AnalyzeResponse);
      setAnalysisStatus("success");
    } catch {
      if (controller.signal.aborted) {
        setAnalysisStatus("idle");
        return;
      }
      setAnalysisError({
        code: "NETWORK",
        message: "We couldn't reach the server. Check your connection and try again.",
      });
      setAnalysisStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAnalysisStatus("idle");
  };

  const handleContinue = () => {
    if (!validateCurrent()) return;

    if (currentScreen.id === "certainty") {
      handleStartAnalysis();
      return;
    }

    if (screenIndex < WORKSPACE_SCREENS.length - 1) {
      goToScreen(screenIndex + 1);
    }
  };

  const handleSkip = () => {
    if (currentScreen.id === "certainty") {
      handleStartAnalysis();
      return;
    }
    if (screenIndex < WORKSPACE_SCREENS.length - 1) {
      goToScreen(screenIndex + 1);
    }
  };

  const handleSelectType = (selectedId: DecisionTypeId) => {
    setFormData((prev) => ({ ...prev, decisionType: selectedId }));
    goToScreen(1); // advance to "decision"
  };

  const handleUseExampleClick = () => {
    if (hasUserTyped(formData)) {
      setConfirmModal("overwrite");
    } else {
      applyExample();
    }
  };

  const applyExample = () => {
    const ex = typeConfig.example;
    setFormData((prev) => ({
      ...prev,
      decision: ex.decision,
      reasons: ex.reasons,
      context: ex.context,
      certaintyBefore: null,
    }));
    setConfirmModal(null);
    goToScreen(1); // go to "decision" screen so user inspects filled example
  };

  const handleStartOverClick = () => {
    if (hasUserTyped(formData)) {
      setConfirmModal("startOver");
    } else {
      resetEverything();
    }
  };

  const resetEverything = () => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    setFormData(INITIAL_FORM);
    setConfirmModal(null);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setAnalysisResult(null);
    goToScreen(0);
    onExit();
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  // Character limit calculations
  let currentMax = 600;
  let currentValue = "";
  if (currentScreen.id === "decision") {
    currentMax = LIMITS.decision.max;
    currentValue = formData.decision;
  } else if (currentScreen.id === "reasons") {
    currentMax = LIMITS.reasons.max;
    currentValue = formData.reasons;
  } else if (currentScreen.id === "context") {
    currentMax = LIMITS.context.max;
    currentValue = formData.context;
  }
  const remaining = currentMax - currentValue.length;
  const showCounter = remaining <= 100;

  const headingId = `screen-heading-${currentScreen.id}`;

  return (
    <div className="w-full max-w-3xl mx-auto py-2 sm:py-4">
      {/* Visually hidden live region for screen announcements */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Main Interview Card: Fits in 1280x720 and 1366x768 */}
      <div className="w-full bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-7 md:p-8 shadow-xs text-left space-y-4 sm:space-y-5">
        {analysisStatus === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center py-12 px-4 space-y-6 text-center"
          >
            {/* Animated pulsing indicator with warm tones */}
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute w-16 h-16 rounded-full bg-[#f3ede2] animate-ping opacity-75" />
              <div className="relative w-12 h-12 rounded-full bg-[#ebd1a4] flex items-center justify-center shadow-xs">
                <div className="w-6 h-6 rounded-full bg-[#b46b19]/80 animate-pulse" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-serif font-bold text-[22px] sm:text-[24px] text-[#18263e] transition-opacity duration-300">
                {LOADING_MESSAGES[loadingStep]}
              </p>
              <p className="text-[15px] text-[#6c7c94]">
                This usually takes a few seconds.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCancelAnalysis}
              className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-4 py-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {analysisStatus === "error" && (
          <div role="alert" className="space-y-4 py-4 text-left">
            <div className="rounded-xl border-2 border-[#18263e] bg-[#fdf7ee] p-5 space-y-2">
              <h2 className="font-serif font-bold text-[20px] text-[#18263e]">
                We couldn&apos;t complete the analysis
              </h2>
              <p className="text-[16px] text-[#4e5e77] leading-relaxed">
                {analysisError?.code === "TIMEOUT"
                  ? "The analysis took longer than expected. Please try again."
                  : analysisError?.code === "SERVICE_UNAVAILABLE" ||
                    analysisError?.code === "UPSTREAM_UNAVAILABLE"
                  ? "We're having trouble reaching the analysis service. Please try again in a moment."
                  : analysisError?.message ||
                    "Something went wrong on our side. Please try again."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                className="min-h-[44px] px-6 py-2.5 rounded-xl font-semibold text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => setAnalysisStatus("idle")}
                className="min-h-[44px] px-5 py-2.5 rounded-xl text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Back to my answers
              </button>
            </div>
          </div>
        )}

        {analysisStatus === "success" && analysisResult && (
          <DeveloperPreview
            data={analysisResult}
            onBack={() => setAnalysisStatus("idle")}
            onStartOver={resetEverything}
          />
        )}

        {analysisStatus === "idle" && (
          <>
            {/* Top Row: Navigation and Controls */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#f3ede2]">
          {/* Back button */}
          <div className="w-24">
            {screenIndex > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] flex items-center gap-1.5 min-h-[44px] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                <span>&larr;</span>
                <span>Back</span>
              </button>
            ) : null}
          </div>

          {/* Progress Indicator: Question X of 5 with 3px bar */}
          <div className="flex flex-col items-center">
            <span className="text-[15px] font-semibold text-[#6c7c94] tabular-nums">
              Question {screenIndex + 1} of {WORKSPACE_SCREENS.length}
            </span>
            <div
              aria-hidden="true"
              className="w-24 sm:w-28 h-[3px] bg-[#f3ede2] rounded-full overflow-hidden mt-1.5"
            >
              <div
                className="h-full bg-[#18263e] transition-all duration-300"
                style={{
                  width: `${((screenIndex + 1) / WORKSPACE_SCREENS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Right Utility Actions */}
          <div className="flex items-center gap-2">
            {screenIndex > 0 && (
              <button
                type="button"
                onClick={() => goToScreen(0)}
                className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Change type
              </button>
            )}

            <button
              type="button"
              onClick={handleUseExampleClick}
              className="text-[15px] font-medium text-[#6c7c94] hover:text-[#b46b19] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Use an example
            </button>

            <button
              type="button"
              onClick={handleStartOverClick}
              className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>

        {/* Money advisory notice (quiet line under progress label) */}
        {typeConfig.showAdviceNote && (
          <p className="text-[15px] text-[#4e5e77] pb-2 border-b border-[#f3ede2]">
            This tool helps you examine your thinking. It isn&apos;t financial advice.
          </p>
        )}

        {/* "So far" Strip: Chips with truncated previews */}
        {screenIndex > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="text-[15px] font-semibold text-[#6c7c94]">So far:</span>
            <button
              type="button"
              onClick={() => goToScreen(0)}
              className="text-[15px] font-medium bg-[#f3ede2] text-[#18263e] px-2.5 py-1 rounded-md border border-[#dbd4c7] hover:border-[#18263e] transition-colors cursor-pointer"
            >
              {typeConfig.label}
            </button>

            {formData.decision.trim() && screenIndex > 1 && (
              <button
                type="button"
                onClick={() => goToScreen(1)}
                className="text-[15px] font-medium bg-[#ffffff] text-[#4e5e77] px-2.5 py-1 rounded-md border border-[#dbd4c7] hover:border-[#18263e] max-w-[190px] truncate transition-colors cursor-pointer"
                title={formData.decision}
              >
                &ldquo;{truncate(formData.decision, 28)}&rdquo;
              </button>
            )}

            {formData.reasons.trim() && screenIndex > 2 && (
              <button
                type="button"
                onClick={() => goToScreen(2)}
                className="text-[15px] font-medium bg-[#ffffff] text-[#4e5e77] px-2.5 py-1 rounded-md border border-[#dbd4c7] hover:border-[#18263e] max-w-[190px] truncate transition-colors cursor-pointer"
                title={formData.reasons}
              >
                &ldquo;{truncate(formData.reasons, 28)}&rdquo;
              </button>
            )}

            {formData.context.trim() && screenIndex > 3 && (
              <button
                type="button"
                onClick={() => goToScreen(3)}
                className="text-[15px] font-medium bg-[#ffffff] text-[#4e5e77] px-2.5 py-1 rounded-md border border-[#dbd4c7] hover:border-[#18263e] max-w-[190px] truncate transition-colors cursor-pointer"
                title={formData.context}
              >
                &ldquo;{truncate(formData.context, 28)}&rdquo;
              </button>
            )}
          </div>
        )}

        {/* Confirmation Banners */}
        {confirmModal === "overwrite" && (
          <div
            role="alert"
            className="rounded-xl border-2 border-[#b46b19] bg-[#fdf7ee] p-4 space-y-2 text-left"
          >
            <p className="text-[16px] font-bold text-[#18263e]">
              Replace what you&apos;ve written with an example?
            </p>
            <p className="text-[15px] text-[#4e5e77]">
              Loading the example will replace your current entries for this decision.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={applyExample}
                className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-semibold bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Keep mine
              </button>
            </div>
          </div>
        )}

        {confirmModal === "startOver" && (
          <div
            role="alert"
            className="rounded-xl border-2 border-[#18263e] bg-[#fdf7ee] p-4 space-y-2 text-left"
          >
            <p className="text-[16px] font-bold text-[#18263e]">
              Clear everything and start over?
            </p>
            <p className="text-[15px] text-[#4e5e77]">
              This will remove all text entered so far and reset the interview.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={resetEverything}
                className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-semibold bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
              >
                Keep mine
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Question Screen Container */}
        <div
          key={screenIndex}
          className={`${
            direction === "forward" ? "slide-forward" : "slide-backward"
          } space-y-4`}
        >
          {/* Question Heading: Serif display clamp(1.75rem, 3.2vw, 2.25rem) */}
          <div className="space-y-1.5">
            <h1
              id={headingId}
              className="font-serif font-bold text-[#18263e] leading-tight text-[clamp(1.75rem,3.2vw,2.25rem)]"
            >
              {currentScreen.heading}
            </h1>
            <p className="text-[16px] sm:text-[17px] text-[#4e5e77] leading-relaxed">
              {currentScreen.whyWeAsk}
            </p>
          </div>

          {/* SCREEN 1: TYPE */}
          {currentScreen.id === "type" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {DECISION_TYPES.map((t) => {
                const isSelected = formData.decisionType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectType(t.id)}
                    className={`min-h-[64px] text-left p-3.5 rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-2 border-[#18263e] bg-[#fdf7ee]/60 shadow-2xs"
                        : "border-[#dbd4c7] bg-[#ffffff] hover:border-[#b46b19] hover:bg-[#faf8f5]"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-[16px] text-[#18263e]">
                        {t.label}
                      </span>
                      {isSelected && (
                        <span
                          className="w-5 h-5 rounded-full bg-[#18263e] text-[#faf8f5] flex items-center justify-center shrink-0"
                          aria-label="Selected"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className="text-[15px] text-[#4e5e77] leading-relaxed">
                      {t.shortDescription}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* SCREENS 2, 3, 4: TEXTAREAS */}
          {(currentScreen.id === "decision" ||
            currentScreen.id === "reasons" ||
            currentScreen.id === "context") && (
            <div className="space-y-2 pt-1">
              <textarea
                ref={textareaRef}
                rows={currentScreen.rows || 4}
                value={
                  currentScreen.id === "decision"
                    ? formData.decision
                    : currentScreen.id === "reasons"
                    ? formData.reasons
                    : formData.context
                }
                onChange={(e) =>
                  updateField(
                    currentScreen.field,
                    e.target.value.slice(0, currentMax)
                  )
                }
                onKeyDown={handleTextareaKeyDown}
                maxLength={currentMax}
                placeholder={
                  currentScreen.id === "decision"
                    ? typeConfig.placeholders.decision
                    : currentScreen.id === "reasons"
                    ? typeConfig.placeholders.reasons
                    : typeConfig.placeholders.context
                }
                aria-labelledby={headingId}
                aria-describedby={
                  errorMsg ? `${headingId}-error` : undefined
                }
                className="w-full px-4 py-3 rounded-xl border border-[#dbd4c7] text-[18px] text-[#18263e] bg-[#ffffff] placeholder-[#6c7c94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] resize-y transition-colors"
              />

              {/* Character counter & Keyboard hint */}
              <div className="flex items-center justify-between min-h-[22px] px-1">
                <div>
                  {showCounter && (
                    <span
                      aria-live="polite"
                      className="text-[15px] text-[#6c7c94] tabular-nums"
                    >
                      {remaining === 0 ? "Limit reached" : `${remaining} characters left`}
                    </span>
                  )}
                </div>
                <span className="text-[15px] text-[#6c7c94] hidden md:inline">
                  Ctrl + Enter to continue
                </span>
              </div>
            </div>
          )}

          {/* SCREEN 5: CERTAINTY */}
          {currentScreen.id === "certainty" && (
            <fieldset className="space-y-3 pt-1">
              <legend className="sr-only">How sure do you feel right now?</legend>

              <div
                className="grid grid-cols-5 gap-2.5 sm:gap-3.5"
                role="radiogroup"
              >
                {[1, 2, 3, 4, 5].map((level, idx) => {
                  const isChecked = formData.certaintyBefore === level;
                  const radioId = `certainty-val-${level}`;

                  return (
                    <label
                      key={level}
                      htmlFor={radioId}
                      className={`min-h-[56px] flex flex-col items-center justify-center rounded-xl border text-lg font-bold transition-colors cursor-pointer select-none focus-within:ring-2 focus-within:ring-[#18263e] focus-within:ring-offset-2 ${
                        isChecked
                          ? "bg-[#18263e] text-[#faf8f5] border-[#18263e] shadow-xs"
                          : "bg-[#ffffff] text-[#18263e] border-[#dbd4c7] hover:border-[#b46b19] hover:bg-[#faf8f5]"
                      }`}
                    >
                      <input
                        ref={(el) => {
                          radioRefs.current[idx] = el;
                        }}
                        type="radio"
                        id={radioId}
                        name="certaintyBefore"
                        value={level}
                        checked={isChecked}
                        onChange={() => updateCertainty(level)}
                        onKeyDown={(e) => handleRadioKeyDown(e, level)}
                        className="sr-only"
                      />
                      <span>{level}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-[15px] text-[#6c7c94] px-1">
                <span>Not at all sure</span>
                <span>Very sure</span>
              </div>
            </fieldset>
          )}

          {/* Validation Error Message */}
          {errorMsg && (
            <div
              id={`${headingId}-error`}
              role="alert"
              className="rounded-xl border-2 border-[#18263e] bg-[#fdf7ee] px-4 py-2.5 text-[16px] font-semibold text-[#18263e] text-left"
            >
              {errorMsg}
            </div>
          )}

          {/* Action Row */}
          {currentScreen.id !== "type" && (
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleContinue}
                className="min-h-[48px] px-7 py-2.5 rounded-xl font-semibold text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
              >
                {currentScreen.primaryActionLabel || "Continue"}
              </button>

              {currentScreen.canSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                >
                  Skip
                </button>
              )}
            </div>
          )}
        </div>
      </>
    )}
  </div>
</div>
  );
}
