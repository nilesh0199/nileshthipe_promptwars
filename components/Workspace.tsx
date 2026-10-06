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
import { ResultsView } from "./results/ResultsView";
import { SupportCard } from "./safety/SupportCard";

export const STORAGE_KEY = "perspectra_workspace_v2";

const INITIAL_FORM: DecisionInput = {
  decisionType: null,
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
          const rawType = parsed.formData.decisionType;
          const decisionType: DecisionTypeId | null =
            rawType && DECISION_TYPES.some((t) => t.id === rawType)
              ? rawType
              : null;

          // Later screens must never be reachable without a chosen type
          const screenIndex =
            decisionType &&
            typeof parsed.screenIndex === "number" &&
            parsed.screenIndex >= 0 &&
            parsed.screenIndex < WORKSPACE_SCREENS.length
              ? parsed.screenIndex
              : 0;

          return {
            formData: {
              decisionType,
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

  // Type selection confirmation animation state (900ms delay with checkmark)
  const [confirmingType, setConfirmingType] = useState<DecisionTypeId | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const radioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const startOverTriggerRef = useRef<HTMLButtonElement>(null);
  const startOverConfirmRef = useRef<HTMLButtonElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentScreen: FlowScreenConfig = WORKSPACE_SCREENS[screenIndex];
  const typeConfig = getDecisionTypeConfig(formData.decisionType || "career");
  const headingId = `step-heading-${currentScreen.id}`;

  // Persist form data to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
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
        // Ignore quota errors
      }
    }
  }, [formData, screenIndex]);

  // Clean up confirmation timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  // Escape key handler for confirmation modals
  useEffect(() => {
    if (!confirmModal) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmModal(null);
        startOverTriggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmModal]);

  // Focus management when confirmation modal opens
  useEffect(() => {
    if (confirmModal === "startOver") {
      startOverConfirmRef.current?.focus();
    }
  }, [confirmModal]);

  // Auto-focus textarea on screen transition
  useEffect(() => {
    if (
      currentScreen.id === "decision" ||
      currentScreen.id === "reasons" ||
      currentScreen.id === "context"
    ) {
      textareaRef.current?.focus();
    }
  }, [currentScreen.id]);

  // Rotate loading step every 2.5 seconds
  useEffect(() => {
    if (analysisStatus !== "loading") return;

    const timer = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    return () => clearInterval(timer);
  }, [analysisStatus]);

  const updateField = (field: keyof DecisionInput, value: string) => {
    setErrorMsg(null);
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateCertainty = (val: number) => {
    setErrorMsg(null);
    setFormData((prev) => ({
      ...prev,
      certaintyBefore: val,
    }));
  };

  const handleRadioKeyDown = (e: KeyboardEvent<HTMLInputElement>, level: number) => {
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

  const goToScreen = (newIndex: number, currentType: DecisionTypeId | null = formData.decisionType) => {
    if (newIndex === screenIndex) return;

    // Later screens must never be reachable without a chosen type
    if (newIndex > 0 && !currentType) {
      return;
    }

    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
      setConfirmingType(null);
    }

    setConfirmModal(null);
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
    if (currentScreen.id === "type") {
      if (!formData.decisionType) {
        setErrorMsg("Please select an area to continue.");
        return false;
      }
    } else if (currentScreen.id === "decision") {
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
    if (!formData.decisionType) return;
    if (isSubmittingRef.current || analysisStatus === "loading") return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    setAnalysisStatus("loading");
    setAnalysisError(null);
    setLoadingStep(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") {
        setAnalysisStatus("idle");
        return;
      }
      setAnalysisError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to the analysis service. Please check your connection and try again.",
      });
      setAnalysisStatus("error");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setAnalysisStatus("idle");
    setAnalysisError(null);
  };

  const handleContinue = () => {
    if (isSubmittingRef.current || analysisStatus === "loading") return;
    if (!validateCurrent()) return;

    if (screenIndex === WORKSPACE_SCREENS.length - 1) {
      handleStartAnalysis();
    } else {
      goToScreen(screenIndex + 1);
    }
  };

  const handleSkip = () => {
    if (isSubmittingRef.current || analysisStatus === "loading") return;
    if (screenIndex === WORKSPACE_SCREENS.length - 1) {
      handleStartAnalysis();
    } else if (screenIndex < WORKSPACE_SCREENS.length - 1) {
      goToScreen(screenIndex + 1);
    }
  };

  // Type selection with 900ms confirmation timer and checkmark pop
  const handleSelectType = (selectedId: DecisionTypeId) => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }

    const config = getDecisionTypeConfig(selectedId);
    setConfirmingType(selectedId);
    setFormData((prev) => ({ ...prev, decisionType: selectedId }));
    setLiveAnnouncement(`${config.label} selected`);

    confirmTimerRef.current = setTimeout(() => {
      setConfirmingType(null);
      goToScreen(1, selectedId);
    }, 900);
  };

  const handleUseExampleClick = () => {
    if (hasUserTyped(formData)) {
      setConfirmModal("overwrite");
    } else {
      applyExample();
    }
  };

  const applyExample = () => {
    const chosenType = formData.decisionType || "career";
    const config = getDecisionTypeConfig(chosenType);
    const ex = config.example;
    setFormData((prev) => ({
      ...prev,
      decisionType: chosenType,
      decision: ex.decision,
      reasons: ex.reasons,
      context: ex.context,
      certaintyBefore: null,
    }));
    setConfirmModal(null);
    goToScreen(1, chosenType);
  };

  const hasSomethingToLose = Boolean(formData.decisionType || hasUserTyped(formData));
  const showStartOver = screenIndex > 0 || hasSomethingToLose;

  const handleStartOverClick = () => {
    if (hasSomethingToLose) {
      setConfirmModal("startOver");
    } else {
      resetEverything();
    }
  };

  const handleCancelStartOver = () => {
    setConfirmModal(null);
    startOverTriggerRef.current?.focus();
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

  const currentMax =
    currentScreen.id === "decision"
      ? LIMITS.decision.max
      : currentScreen.id === "reasons"
      ? LIMITS.reasons.max
      : currentScreen.id === "context"
      ? LIMITS.context.max
      : 0;

  const currentLength =
    currentScreen.id === "decision"
      ? formData.decision.length
      : currentScreen.id === "reasons"
      ? formData.reasons.length
      : currentScreen.id === "context"
      ? formData.context.length
      : 0;

  const remaining = currentMax - currentLength;
  const showCounter = currentMax > 0 && remaining <= 100;

  if (analysisStatus === "success" && analysisResult) {
    if (analysisResult.kind === "support") {
      return (
        <SupportCard
          data={analysisResult}
          onEditAnswers={() => setAnalysisStatus("idle")}
          onStartOver={resetEverything}
        />
      );
    }

    return (
      <ResultsView
        data={analysisResult}
        originalInput={{
          decisionType: formData.decisionType || "other",
          decision: formData.decision,
          reasons: formData.reasons,
          context: formData.context,
          certaintyBefore: formData.certaintyBefore,
        }}
        onBackToAnswers={() => setAnalysisStatus("idle")}
        onStartOver={resetEverything}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl lg:max-w-6xl mx-auto my-auto py-2 sm:py-4">
      {/* Visually hidden live region for screen and selection announcements */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement || `Question ${screenIndex + 1} of ${WORKSPACE_SCREENS.length}: ${currentScreen.heading}`}
      </div>

      {/* Main Interview Card: 1024px+ wider container matching header width */}
      <div className="w-full bg-[#ffffff] rounded-2xl border border-[#dbd4c7] p-5 sm:p-7 md:p-8 lg:p-11 shadow-xs text-left space-y-4 sm:space-y-6">
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

            <div className="space-y-2">
              <h2 className="font-serif font-bold text-[22px] sm:text-[24px] text-[#18263e]">
                Looking from another angle...
              </h2>
              <p className="text-[17px] sm:text-[18px] text-[#2c3e55] transition-opacity duration-300">
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
                {analysisError?.code === "RATE_LIMITED"
                  ? "You've reached the limit for now. Please wait a few minutes and try again."
                  : analysisError?.code === "FORBIDDEN"
                  ? "This request couldn't be accepted. Please reload the page and try again."
                  : analysisError?.code === "TIMEOUT"
                  ? "The analysis took longer than expected. Please try again."
                  : analysisError?.code === "AI_QUOTA"
                  ? "The AI service has reached its limit for now. Please wait a minute and try again."
                  : analysisError?.code === "SERVICE_UNAVAILABLE" ||
                    analysisError?.code === "UPSTREAM_UNAVAILABLE" ||
                    analysisError?.code === "AI_UNAVAILABLE"
                  ? "The AI service is busy right now. Please try again in a minute."
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

        {analysisStatus === "idle" && (
          <>
            {/* Top Row: Spans full card width above both columns */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#f3ede2]">
              {/* Back button (Mobile only; on desktop Back is in right action row) */}
              <div className="w-24">
                {screenIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="lg:hidden text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] flex items-center gap-1.5 min-h-[44px] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                  >
                    <span>&larr;</span>
                    <span>Back</span>
                  </button>
                ) : null}
              </div>

              {/* Progress Indicator (Mobile only; on desktop it is in the left column) */}
              <div className="flex lg:hidden flex-col items-center">
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
              <div className="flex items-center gap-2 ml-auto">
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

                {showStartOver && (
                  <button
                    ref={startOverTriggerRef}
                    type="button"
                    onClick={handleStartOverClick}
                    className="text-[15px] font-medium text-[#6c7c94] hover:text-[#18263e] min-h-[44px] px-2 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                  >
                    Start over
                  </button>
                )}
              </div>
            </div>

            {/* Money advisory notice (quiet line) */}
            {typeConfig?.showAdviceNote && (
              <p className="text-[15px] text-[#4e5e77] pb-2 border-b border-[#f3ede2]">
                This tool helps you examine your thinking. It isn&apos;t financial advice.
              </p>
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
                    ref={startOverConfirmRef}
                    type="button"
                    onClick={resetEverything}
                    className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-semibold bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                  >
                    Start over
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelStartOver}
                    className="min-h-[44px] px-4 py-2 rounded-lg text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                  >
                    Keep mine
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 1: TYPE PICKER (Full width 6-column grid at 1024px+) */}
            {currentScreen.id === "type" ? (
              <div
                key={screenIndex}
                className={`${direction === "forward" ? "slide-forward" : "slide-backward"} space-y-4 sm:space-y-5`}
              >
                {/* Heading & Why we ask */}
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

                {/* 6-column grid: Row 1 has 3 tiles (span 2), Row 2 has 2 tiles (span 3) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4 pt-1">
                  {DECISION_TYPES.map((t, idx) => {
                    const isConfirming = confirmingType === t.id;
                    const isCurrentChoice = formData.decisionType === t.id;
                    const isAnotherConfirming =
                      confirmingType !== null && confirmingType !== t.id;
                    const colSpanClass = idx < 3 ? "lg:col-span-2" : "lg:col-span-3";

                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={isConfirming || (confirmingType === null && isCurrentChoice)}
                        onClick={() => handleSelectType(t.id)}
                        className={`min-h-[80px] sm:min-h-[90px] lg:min-h-[120px] text-left p-5 sm:p-5 lg:p-6 rounded-2xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer flex flex-col justify-between ${colSpanClass} ${
                          isAnotherConfirming
                            ? "opacity-60 border-[#dbd4c7] bg-[#ffffff]"
                            : isConfirming
                            ? "border-2 border-[#18263e] bg-[#fdf7ee]/70 shadow-2xs"
                            : isCurrentChoice
                            ? "border-2 border-[#18263e] bg-[#ffffff] shadow-2xs"
                            : "border-[#dbd4c7] bg-[#ffffff] hover:border-[#b46b19] hover:bg-[#faf8f5]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <span className="font-semibold text-[16px] lg:text-[1.25rem] text-[#18263e] leading-snug">
                            {t.label}
                          </span>

                          {/* Checkmark shown strictly during the 900ms confirmation */}
                          {isConfirming && (
                            <span
                              className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#18263e] text-[#faf8f5] flex items-center justify-center shrink-0 transition-all duration-150 ease-out scale-100 opacity-100 motion-reduce:transition-none motion-reduce:transform-none"
                              aria-hidden="true"
                            >
                              <svg
                                className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          )}

                          {/* Subtle visually hidden current choice label when returning later */}
                          {!isConfirming && isCurrentChoice && (
                            <span className="sr-only"> (current choice)</span>
                          )}
                        </div>

                        <span className="text-[15px] lg:text-[1.0625rem] text-[#4e5e77] leading-relaxed">
                          {t.shortDescription}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-xl border-2 border-[#18263e] bg-[#fdf7ee] px-4 py-2.5 text-[16px] font-semibold text-[#18263e] text-left"
                  >
                    {errorMsg}
                  </div>
                )}
              </div>
            ) : (
              /* SCREENS 2, 3, 4, 5: TWO-COLUMN LAYOUT AT 1024px+ */
              <div
                key={screenIndex}
                className={`${direction === "forward" ? "slide-forward" : "slide-backward"} lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start`}
              >
                {/* LEFT COLUMN: Progress, Heading, and Vertically Stacked "So far" Chips */}
                <div className="lg:col-span-5 space-y-4 sm:space-y-5 text-left">
                  {/* Desktop Progress bar */}
                  <div className="hidden lg:block space-y-2">
                    <span className="text-[15px] font-semibold text-[#6c7c94] tabular-nums">
                      Question {screenIndex + 1} of {WORKSPACE_SCREENS.length}
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-full h-[3px] bg-[#f3ede2] rounded-full overflow-hidden"
                    >
                      <div
                        className="h-full bg-[#18263e] transition-all duration-300"
                        style={{
                          width: `${((screenIndex + 1) / WORKSPACE_SCREENS.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Question Heading & Why we ask */}
                  <div className="space-y-1.5">
                    <h1
                      id={headingId}
                      className="font-serif font-bold text-[#18263e] leading-tight text-[clamp(1.75rem,2.8vw,2.25rem)]"
                    >
                      {currentScreen.heading}
                    </h1>
                    <p className="text-[16px] sm:text-[17px] text-[#4e5e77] leading-relaxed">
                      {currentScreen.whyWeAsk}
                    </p>
                  </div>

                  {/* Desktop Vertically Stacked "So far" Chips */}
                  {screenIndex > 0 && (
                    <div className="hidden lg:block pt-3 border-t border-[#f3ede2] space-y-2.5">
                      <span className="text-[13px] font-bold uppercase tracking-wider text-[#6c7c94]">
                        Your answers so far
                      </span>
                      <div className="flex flex-col gap-2">
                        {/* Type chip */}
                        <button
                          type="button"
                          onClick={() => goToScreen(0)}
                          className="w-full text-left p-2.5 rounded-xl border border-[#dbd4c7] bg-[#f3ede2]/50 hover:border-[#18263e] transition-colors cursor-pointer space-y-0.5"
                        >
                          <span className="text-[12px] text-[#6c7c94] block">Decision area</span>
                          <span className="font-semibold text-[15px] text-[#18263e] block">
                            {typeConfig.label}
                          </span>
                        </button>

                        {/* Decision chip */}
                        {formData.decision.trim() && screenIndex > 1 && (
                          <button
                            type="button"
                            onClick={() => goToScreen(1)}
                            className="w-full text-left p-2.5 rounded-xl border border-[#dbd4c7] bg-[#ffffff] hover:border-[#18263e] transition-colors cursor-pointer space-y-0.5"
                            title={formData.decision}
                          >
                            <span className="text-[12px] text-[#6c7c94] block">Your decision</span>
                            <span className="text-[15px] text-[#18263e] line-clamp-2">
                              &ldquo;{formData.decision}&rdquo;
                            </span>
                          </button>
                        )}

                        {/* Reasons chip */}
                        {formData.reasons.trim() && screenIndex > 2 && (
                          <button
                            type="button"
                            onClick={() => goToScreen(2)}
                            className="w-full text-left p-2.5 rounded-xl border border-[#dbd4c7] bg-[#ffffff] hover:border-[#18263e] transition-colors cursor-pointer space-y-0.5"
                            title={formData.reasons}
                          >
                            <span className="text-[12px] text-[#6c7c94] block">Your reasons</span>
                            <span className="text-[15px] text-[#18263e] line-clamp-2">
                              &ldquo;{formData.reasons}&rdquo;
                            </span>
                          </button>
                        )}

                        {/* Context chip */}
                        {formData.context.trim() && screenIndex > 3 && (
                          <button
                            type="button"
                            onClick={() => goToScreen(3)}
                            className="w-full text-left p-2.5 rounded-xl border border-[#dbd4c7] bg-[#ffffff] hover:border-[#18263e] transition-colors cursor-pointer space-y-0.5"
                            title={formData.context}
                          >
                            <span className="text-[12px] text-[#6c7c94] block">Additional context</span>
                            <span className="text-[15px] text-[#18263e] line-clamp-2">
                              &ldquo;{formData.context}&rdquo;
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mobile Horizontal "So far" Chips Strip */}
                  {screenIndex > 0 && (
                    <div className="flex lg:hidden flex-wrap items-center gap-2 pt-1 pb-2">
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
                </div>

                {/* RIGHT COLUMN: Inputs & Action Row */}
                <div className="lg:col-span-7 space-y-3.5 pt-3 lg:pt-0 text-left">
                  {/* TEXTAREA INPUTS (Decision, Reasons, Context) */}
                  {(currentScreen.id === "decision" ||
                    currentScreen.id === "reasons" ||
                    currentScreen.id === "context") && (
                    <div className="space-y-2">
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
                        className={`w-full px-4 py-3 rounded-xl border border-[#dbd4c7] text-[18px] text-[#18263e] bg-[#ffffff] placeholder-[#6c7c94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] resize-y transition-colors ${
                          currentScreen.id === "decision"
                            ? "min-h-[140px]"
                            : "min-h-[220px]"
                        }`}
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
                    <fieldset className="space-y-3">
                      <legend className="sr-only">How sure do you feel right now?</legend>

                      <div
                        className="grid grid-cols-5 gap-2.5 sm:gap-3.5 w-full"
                        role="radiogroup"
                      >
                        {[1, 2, 3, 4, 5].map((level, idx) => {
                          const isChecked = formData.certaintyBefore === level;
                          const radioId = `certainty-val-${level}`;

                          return (
                            <label
                              key={level}
                              htmlFor={radioId}
                              className={`min-h-[64px] flex flex-col items-center justify-center rounded-xl border text-xl font-bold transition-colors cursor-pointer select-none focus-within:ring-2 focus-within:ring-[#18263e] focus-within:ring-offset-2 ${
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

                  {/* Action Row: Directly under inputs in the right column */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {screenIndex > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="min-h-[48px] px-5 py-2.5 rounded-xl font-medium text-[16px] text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                      >
                        Back
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={isSubmitting}
                      className="min-h-[48px] px-7 py-2.5 rounded-xl font-semibold text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs"
                    >
                      {currentScreen.primaryActionLabel || "Continue"}
                    </button>

                    {currentScreen.canSkip && (
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isSubmitting}
                        className="min-h-[48px] px-5 py-2.5 rounded-xl text-[16px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
