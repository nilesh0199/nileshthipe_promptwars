"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import type { AnalyzeResponse } from "@/lib/schema";
import { ResultsHeader } from "./ResultsHeader";
import { FindingsTab, TriageChoice } from "./FindingsTab";
import { InYourWordsTab } from "./InYourWordsTab";
import { PremortemTab } from "./PremortemTab";
import { NextStepsTab } from "./NextStepsTab";

interface ResultsViewProps {
  data: AnalyzeResponse;
  originalInput: {
    decision: string;
    reasons: string;
    context: string;
    certaintyBefore: number | null;
  };
  onBackToAnswers: () => void;
  onStartOver: () => void;
}

type TabId = "findings" | "words" | "premortem" | "next";

interface TabConfig {
  id: TabId;
  label: string;
}

const TABS: TabConfig[] = [
  { id: "findings", label: "Findings" },
  { id: "words", label: "In your words" },
  { id: "premortem", label: "Premortem" },
  { id: "next", label: "Next steps" },
];

export function ResultsView({
  data,
  originalInput,
  onBackToAnswers,
  onStartOver,
}: ResultsViewProps) {
  const { analysis, receipt } = data;

  const [activeTab, setActiveTab] = useState<TabId>("findings");
  const [triageMap, setTriageMap] = useState<Record<string, TriageChoice>>({});
  const [certaintyAfter, setCertaintyAfter] = useState<number | null>(null);
  const [highlightedFindingId, setHighlightedFindingId] = useState<string | null>(null);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSetTriage = (findingId: string, choice: TriageChoice) => {
    setTriageMap((prev) => ({
      ...prev,
      [findingId]: choice,
    }));
  };

  const handleNavigateToWords = (findingId: string) => {
    setHighlightedFindingId(findingId);
    setActiveTab("words");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNavigateToFinding = (findingId: string) => {
    setHighlightedFindingId(findingId);
    setActiveTab("findings");
    setTimeout(() => {
      const el = document.getElementById(`finding-${findingId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
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
    setActiveTab(TABS[targetIndex].id);
    tabRefs.current[targetIndex]?.focus();
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 space-y-6 text-left">
      {/* Results Header */}
      <ResultsHeader
        analysis={analysis}
        receipt={receipt}
        certaintyBefore={originalInput.certaintyBefore}
        certaintyAfter={certaintyAfter}
        onSetCertaintyAfter={setCertaintyAfter}
        onBackToAnswers={onBackToAnswers}
        onStartOver={onStartOver}
      />

      {/* Accessible Tabs Navigation */}
      <nav aria-label="Results navigation" className="border-b border-[#dbd4c7]">
        <div
          role="tablist"
          aria-label="Analysis sections"
          className="flex flex-wrap items-center gap-2 -mb-px"
        >
          {TABS.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab.id);
                  setHighlightedFindingId(null);
                }}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`min-h-[46px] px-4 sm:px-5 py-2.5 rounded-t-xl font-medium text-[15px] sm:text-[16px] transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer flex items-center gap-2 border-b-2 ${
                  isSelected
                    ? "border-[#18263e] text-[#18263e] font-semibold bg-[#ffffff]"
                    : "border-transparent text-[#6c7c94] hover:text-[#18263e] hover:border-[#dbd4c7]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.id === "findings" && analysis.findings && (
                  <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-[#f3ede2] text-[#4e5e77] font-semibold">
                    {analysis.findings.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Panels */}
      <main>
        {activeTab === "findings" && (
          <div
            role="tabpanel"
            id="panel-findings"
            aria-labelledby="tab-findings"
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            <FindingsTab
              findings={analysis.findings}
              triageMap={triageMap}
              onSetTriage={handleSetTriage}
              onNavigateToWords={handleNavigateToWords}
              highlightedFindingId={highlightedFindingId}
            />
          </div>
        )}

        {activeTab === "words" && (
          <div
            role="tabpanel"
            id="panel-words"
            aria-labelledby="tab-words"
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            <InYourWordsTab
              decision={originalInput.decision}
              reasons={originalInput.reasons}
              context={originalInput.context}
              findings={analysis.findings}
              onNavigateToFinding={handleNavigateToFinding}
              selectedFindingId={highlightedFindingId}
            />
          </div>
        )}

        {activeTab === "premortem" && (
          <div
            role="tabpanel"
            id="panel-premortem"
            aria-labelledby="tab-premortem"
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            <PremortemTab
              premortemQuestions={analysis.premortem_questions}
              reasoningMap={analysis.reasoning_map}
            />
          </div>
        )}

        {activeTab === "next" && (
          <div
            role="tabpanel"
            id="panel-next"
            aria-labelledby="tab-next"
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            <NextStepsTab
              decisionSummary={analysis.decision_summary}
              closingNote={analysis.closing_note}
              findings={analysis.findings}
              triageMap={triageMap}
              onSwitchToFindings={() => setActiveTab("findings")}
            />
          </div>
        )}
      </main>
    </div>
  );
}
