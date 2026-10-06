"use client";

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import type { AnalysisSuccessResponse, DecisionType } from "@/lib/schema";
import { ResultsHeader } from "./ResultsHeader";
import { FindingsTab, TriageChoice } from "./FindingsTab";
import { InYourWordsTab } from "./InYourWordsTab";
import { PremortemTab } from "./PremortemTab";
import { NextStepsTab } from "./NextStepsTab";
import { useAuth } from "@/components/auth/AuthProvider";
import { SignInModal } from "@/components/auth/SignInModal";
import { decideSaveAction, type BuildAnalysisDocParams } from "@/lib/savedDoc";
import { saveAnalysis, updateAnalysis } from "@/lib/saved";
import {
  registerPendingWriteTimer,
  setPendingSave,
  getPendingSave,
  clearPendingSave,
} from "@/lib/clientState";

export interface ResultsViewProps {
  data: AnalysisSuccessResponse;
  originalInput: {
    decisionType?: DecisionType;
    decision: string;
    reasons: string;
    context: string;
    certaintyBefore: number | null;
  };
  initialTriage?: Record<string, TriageChoice>;
  initialNotes?: string;
  initialCertaintyAfter?: number | null;
  savedId?: string;
  onBackToAnswers?: () => void;
  onStartOver?: () => void;
  isMobileView?: boolean;
}

type TabId = "findings" | "words" | "premortem" | "next";

interface TabConfig {
  id: TabId;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "findings", label: "Findings" },
  { id: "words", label: "Your words" },
  { id: "premortem", label: "Premortem" },
  { id: "next", label: "Next steps" },
];

export function ResultsView({
  data,
  originalInput,
  initialTriage,
  initialNotes,
  initialCertaintyAfter,
  savedId,
  onBackToAnswers,
  onStartOver,
  isMobileView,
}: ResultsViewProps) {
  const { analysis, receipt } = data;
  const { user } = useAuth();

  const [windowIsMobile, setWindowIsMobile] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    if (typeof isMobileView === "boolean") return;
    const handleResize = () => {
      setWindowIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileView]);

  const isMobile = typeof isMobileView === "boolean" ? isMobileView : windowIsMobile;

  const [activeTab, setActiveTab] = useState<TabId>("findings");
  const [triageMap, setTriageMap] = useState<Record<string, TriageChoice>>(initialTriage || {});
  const [certaintyAfter] = useState<number | null>(
    initialCertaintyAfter !== undefined ? initialCertaintyAfter : null
  );
  const [personalNotes, setPersonalNotes] = useState<string>(initialNotes || "");
  const [savedDocId, setSavedDocId] = useState<string | null>(savedId || null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    savedId ? "saved" : "idle"
  );
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null);

  // Per-finding expansion map
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  // Selected filter
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  // Screen reader tab announcements
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("Findings tab");

  const desktopTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mobileTabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isInitialMount = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSaveInitiatedRef = useRef<boolean>(false);
  const isConsumingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSetTriage = (findingId: string, choice: TriageChoice) => {
    setTriageMap((prev) => ({
      ...prev,
      [findingId]: choice,
    }));
  };

  const handleToggleExpand = (findingId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    for (const f of analysis.findings) {
      next[f.id] = true;
    }
    setExpandedMap(next);
  };

  const handleCollapseAll = () => {
    setExpandedMap({});
  };

  const allTriaged =
    analysis.findings.length > 0 &&
    analysis.findings.every((f) => !!triageMap[f.id]);

  const handleNextUntriaged = () => {
    const untriaged = analysis.findings.find((f) => !triageMap[f.id]);
    if (!untriaged) return;

    if (selectedFilter !== "all" && selectedFilter !== untriaged.type) {
      setSelectedFilter("all");
    }

    setExpandedMap((prev) => ({ ...prev, [untriaged.id]: true }));

    setTimeout(() => {
      const card = document.getElementById(`finding-card-${untriaged.id}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const title = document.getElementById(`finding-title-${untriaged.id}`);
      if (title) {
        title.focus();
      }
    }, 50);
  };

  const handleSwitchTab = (tabId: TabId) => {
    setActiveTab(tabId);
    const cfg = TABS.find((t) => t.id === tabId);
    setLiveAnnouncement(`${cfg?.label || tabId} tab`);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Move focus to panel heading
    setTimeout(() => {
      const heading = document.getElementById(`panel-heading-${tabId}`);
      if (heading) {
        heading.focus();
      }
    }, 50);
  };

  const handleNavigateToWords = (findingId: string) => {
    setHighlightedFindingId(findingId);
    handleSwitchTab("words");
  };

  const handleNavigateToFinding = (findingId: string) => {
    setActiveTab("findings");
    setLiveAnnouncement("Findings tab");

    // Clear filter if it would hide this finding
    const targetFinding = analysis.findings.find((f) => f.id === findingId);
    if (targetFinding && selectedFilter !== "all" && selectedFilter !== targetFinding.type) {
      setSelectedFilter("all");
    }

    // Expand the card
    setExpandedMap((prev) => ({ ...prev, [findingId]: true }));

    // Apply 1.5s ring highlight
    setHighlightedFindingId(findingId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedFindingId(null);
    }, 1500);

    // Scroll card into view and move focus to title
    setTimeout(() => {
      const card = document.getElementById(`finding-card-${findingId}`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const title = document.getElementById(`finding-title-${findingId}`);
      if (title) {
        title.focus();
      }
    }, 100);
  };

  const handleTabKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
    isMobile: boolean
  ) => {
    let targetIndex = index;
    if (e.key === "ArrowRight") {
      targetIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      targetIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = TABS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const targetTab = TABS[targetIndex];
    handleSwitchTab(targetTab.id);
    const refs = isMobile ? mobileTabRefs : desktopTabRefs;
    refs.current[targetIndex]?.focus();
  };

  // Build payload for saving
  const getSavePayload = useCallback((): BuildAnalysisDocParams => {
    return {
      input: {
        decisionType: originalInput.decisionType || "other",
        decision: originalInput.decision,
        reasons: originalInput.reasons,
        context: originalInput.context,
      },
      analysis,
      receipt,
      triage: triageMap,
      notes: personalNotes,
      certaintyBefore: originalInput.certaintyBefore,
      certaintyAfter,
    };
  }, [originalInput, analysis, receipt, triageMap, personalNotes, certaintyAfter]);

  // Initiate saving
  const handleSave = useCallback(async () => {
    const action = decideSaveAction(user);

    if (action === "save" && user) {
      setSaveStatus("saving");
      try {
        const payload = getSavePayload();
        const newId = await saveAnalysis(user.uid, payload);
        clearPendingSave();
        setSavedDocId(newId);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    } else if (action === "prompt-sign-in") {
      isSaveInitiatedRef.current = true;
      setPendingSave(getSavePayload());
      setIsSignInModalOpen(true);
    }
  }, [user, getSavePayload]);

  // Consume pending save on sign-in
  useEffect(() => {
    if (user && isSaveInitiatedRef.current && !isConsumingRef.current) {
      const pending = getPendingSave();
      if (pending && pending.initiatedBySave) {
        isConsumingRef.current = true;
        isSaveInitiatedRef.current = false;
        queueMicrotask(() => {
          setSaveStatus("saving");
        });

        saveAnalysis(user.uid, pending.data)
          .then((newId) => {
            clearPendingSave();
            setSavedDocId(newId);
            setSaveStatus("saved");
          })
          .catch(() => {
            setSaveStatus("error");
          })
          .finally(() => {
            isConsumingRef.current = false;
          });
      }
    }
  }, [user]);

  // Auto-save debounced updates (1000ms) for authenticated saved documents
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!user || !savedDocId) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await updateAnalysis(savedDocId, {
          triage: triageMap,
          notes: personalNotes,
          certaintyAfter,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 1000);

    debounceTimerRef.current = timer;
    registerPendingWriteTimer(timer);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [triageMap, personalNotes, certaintyAfter, user, savedDocId]);

  const investigateCount = Object.values(triageMap).filter((v) => v === "investigate").length;

  return (
    <div className="space-y-6 pb-28 lg:pb-8">
      {/* Visually hidden screen-reader announcement region */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Results Header (Opaque solid background) */}
      <ResultsHeader
        analysis={analysis}
        receipt={receipt}
        onBackToAnswers={onBackToAnswers || (() => {})}
        onStartOver={onStartOver || (() => {})}
      />

      {/* Sticky Desktop Tab Bar (1024px and wider) */}
      {!isMobile && (
        <div className="sticky top-16 z-20 bg-[#faf8f5] py-2 border-b border-[#dbd4c7]">
          <nav
            role="tablist"
            aria-label="Analysis sections"
            className="flex space-x-2 bg-[#f3ede2] p-1.5 rounded-xl border border-[#dbd4c7]"
          >
            {TABS.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    desktopTabRefs.current[idx] = el;
                  }}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleSwitchTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx, false)}
                  className={`min-h-[44px] px-5 py-2 rounded-lg text-[15px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? "bg-[#18263e] text-[#faf8f5] shadow-2xs"
                      : "text-[#4e5e77] hover:text-[#18263e] hover:bg-[#faf8f5]/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === "findings" && (
                    <span className="text-[12px] opacity-80 font-mono">
                      ({analysis.findings.length})
                    </span>
                  )}
                  {tab.id === "next" && investigateCount > 0 && (
                    <span className="text-[12px] bg-[#b46b19] text-[#faf8f5] px-1.5 py-0.5 rounded-full font-bold">
                      {investigateCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Tab Panels */}
      <main id="results-panels">
        {/* FINDINGS PANEL */}
        <div
          role="tabpanel"
          id="panel-findings"
          aria-labelledby="tab-findings"
          tabIndex={0}
          hidden={activeTab !== "findings"}
          className="outline-none"
        >
          <h2 id="panel-heading-findings" tabIndex={-1} className="sr-only">
            Findings
          </h2>
          {activeTab === "findings" && (
            <>
              <FindingsTab
                findings={analysis.findings}
                triageMap={triageMap}
                onSetTriage={handleSetTriage}
                onNavigateToWords={handleNavigateToWords}
                highlightedFindingId={highlightedFindingId}
                expandedMap={expandedMap}
                onToggleExpand={handleToggleExpand}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                onNextUntriaged={handleNextUntriaged}
                allTriaged={allTriaged}
              />
              <div className="pt-8 pb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSwitchTab("words")}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl font-semibold text-[15px] sm:text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <span>Next: Your words</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* IN YOUR WORDS PANEL */}
        <div
          role="tabpanel"
          id="panel-words"
          aria-labelledby="tab-words"
          tabIndex={0}
          hidden={activeTab !== "words"}
          className="outline-none"
        >
          <h2 id="panel-heading-words" tabIndex={-1} className="sr-only">
            Your words
          </h2>
          {activeTab === "words" && (
            <>
              <InYourWordsTab
                decision={originalInput.decision}
                reasons={originalInput.reasons}
                context={originalInput.context}
                findings={analysis.findings}
                onNavigateToFinding={handleNavigateToFinding}
                selectedFindingId={highlightedFindingId}
              />
              <div className="pt-8 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbd4c7]">
                <button
                  type="button"
                  onClick={() => handleSwitchTab("findings")}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-1.5"
                >
                  <span aria-hidden="true">&larr;</span>
                  <span>Previous: Findings</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab("premortem")}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl font-semibold text-[15px] sm:text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <span>Next: Premortem</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* PREMORTEM PANEL */}
        <div
          role="tabpanel"
          id="panel-premortem"
          aria-labelledby="tab-premortem"
          tabIndex={0}
          hidden={activeTab !== "premortem"}
          className="outline-none"
        >
          <h2 id="panel-heading-premortem" tabIndex={-1} className="sr-only">
            Premortem
          </h2>
          {activeTab === "premortem" && (
            <>
              <PremortemTab
                premortemQuestions={analysis.premortem_questions}
                reasoningMap={analysis.reasoning_map}
              />
              <div className="pt-8 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbd4c7]">
                <button
                  type="button"
                  onClick={() => handleSwitchTab("words")}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-1.5"
                >
                  <span aria-hidden="true">&larr;</span>
                  <span>Previous: Your words</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab("next")}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl font-semibold text-[15px] sm:text-[16px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer shadow-2xs flex items-center gap-2"
                >
                  <span>Next: Next steps</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* NEXT STEPS PANEL */}
        <div
          role="tabpanel"
          id="panel-next"
          aria-labelledby="tab-next"
          tabIndex={0}
          hidden={activeTab !== "next"}
          className="outline-none"
        >
          <h2 id="panel-heading-next" tabIndex={-1} className="sr-only">
            Next steps
          </h2>
          {activeTab === "next" && (
            <>
              <NextStepsTab
                decisionSummary={analysis.decision_summary}
                closingNote={analysis.closing_note}
                findings={analysis.findings}
                triageMap={triageMap}
                onSwitchToFindings={() => handleSwitchTab("findings")}
                personalNotes={personalNotes}
                onChangePersonalNotes={setPersonalNotes}
                savedDocId={savedDocId}
                saveStatus={saveStatus}
                onSave={handleSave}
              />
              <div className="pt-8 pb-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#dbd4c7]">
                <button
                  type="button"
                  onClick={() => handleSwitchTab("premortem")}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl text-[15px] font-medium text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-1.5"
                >
                  <span aria-hidden="true">&larr;</span>
                  <span>Previous: Premortem</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab("findings")}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl text-[15px] font-medium text-[#18263e] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-1.5"
                >
                  <span>Back to Findings</span>
                  <span aria-hidden="true">&uarr;</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (< 1024px) */}
      {isMobile && (
        <nav
          aria-label="Results sections"
          className="fixed bottom-0 inset-x-0 bg-white border-t border-[#dbd4c7] shadow-lg z-30 pb-[env(safe-area-inset-bottom)]"
        >
          <div role="tablist" aria-label="Results sections" className="grid grid-cols-4 h-16">
            {TABS.map((tab, idx) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    mobileTabRefs.current[idx] = el;
                  }}
                  role="tab"
                  id={`mobile-tab-${tab.id}`}
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleSwitchTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx, true)}
                  className={`relative flex flex-col items-center justify-center min-h-[44px] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer ${
                    isSelected
                      ? "border-t-[3px] border-[#18263e] text-[#18263e] font-bold"
                      : "border-t-[3px] border-transparent text-[#6c7c94] font-medium hover:text-[#18263e]"
                  }`}
                >
                  {/* 24px Inline SVG Icons */}
                  {tab.id === "findings" && (
                    <svg
                      className="w-6 h-6 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  )}
                  {tab.id === "words" && (
                    <svg
                      className="w-6 h-6 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1 6 1 8z" />
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2 0 4 1 6 1 8z" />
                    </svg>
                  )}
                  {tab.id === "premortem" && (
                    <svg
                      className="w-6 h-6 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" />
                    </svg>
                  )}
                  {tab.id === "next" && (
                    <svg
                      className="w-6 h-6 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                    </svg>
                  )}

                  {/* Text Label: >= 15px */}
                  <span className="text-[15px] leading-tight mt-0.5 truncate max-w-[80px]">
                    {tab.label}
                  </span>

                  {/* Count Badges */}
                  {tab.id === "findings" && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-2 sm:right-5 bg-[#f3ede2] text-[#18263e] text-[11px] font-bold px-1.5 py-0.2 rounded-full border border-[#dbd4c7]"
                    >
                      {analysis.findings.length}
                    </span>
                  )}
                  {tab.id === "next" && investigateCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-2 sm:right-5 bg-[#18263e] text-[#faf8f5] text-[11px] font-bold px-1.5 py-0.2 rounded-full"
                    >
                      {investigateCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        initialMode="signup"
        initiatedBySave={true}
      />
    </div>
  );
}
