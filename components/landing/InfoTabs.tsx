"use client";

import React, { useRef, KeyboardEvent } from "react";

interface InfoTabsProps {
  activeTab: number;
  onSelectTab: (index: number) => void;
}

export function InfoTabs({ activeTab, onSelectTab }: InfoTabsProps) {
  const tabs = [
    { id: "tab-what-it-does", label: "What it does", panelId: "panel-what-it-does" },
    { id: "tab-how-it-works", label: "How it works", panelId: "panel-how-it-works" },
    { id: "tab-our-promise", label: "Our promise", panelId: "panel-our-promise" },
    { id: "tab-privacy", label: "Privacy", panelId: "panel-privacy" },
  ];

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;

    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    onSelectTab(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="w-full space-y-2 text-left">
      {/* Scrollable Tablist with >= 16px labels */}
      <div className="overflow-x-auto pb-0.5 scrollbar-none">
        <div
          role="tablist"
          aria-label="Product Information"
          className="flex items-center gap-1.5 border-b border-[#dbd4c7] min-w-max pb-0.5"
        >
          {tabs.map((tab, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                aria-controls={tab.panelId}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectTab(idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`min-h-[44px] px-3.5 py-1.5 text-[16px] font-semibold rounded-t-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] cursor-pointer ${
                  isSelected
                    ? "text-[#18263e] border-b-2 border-[#18263e] bg-[#ffffff] shadow-2xs"
                    : "text-[#4e5e77] hover:text-[#18263e] hover:bg-[#f3ede2]/60"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels with >= 16px text */}
      <div className="min-h-[170px] max-h-[210px] overflow-y-auto">
        {/* Panel 0: What it does */}
        {activeTab === 0 && (
          <div
            id="panel-what-it-does"
            role="tabpanel"
            aria-labelledby="tab-what-it-does"
            className="panel-fade grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#18263e]">Spot assumptions</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                See the beliefs your reasons quietly rest on.
              </p>
            </div>
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#18263e]">Find blind spots</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                Notice factors you may have overlooked.
              </p>
            </div>
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#18263e]">Ask better questions</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                Get open questions and things worth checking.
              </p>
            </div>
          </div>
        )}

        {/* Panel 1: How it works */}
        {activeTab === 1 && (
          <div
            id="panel-how-it-works"
            role="tabpanel"
            aria-labelledby="tab-how-it-works"
            className="panel-fade grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <span className="text-[15px] font-bold text-[#b46b19] uppercase tracking-wider block">
                Step 1
              </span>
              <h3 className="text-[16px] font-bold text-[#18263e]">1 Describe</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                Pick a decision type and write your reasoning.
              </p>
            </div>
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <span className="text-[15px] font-bold text-[#b46b19] uppercase tracking-wider block">
                Step 2
              </span>
              <h3 className="text-[16px] font-bold text-[#18263e]">2 Review</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                See findings tied to your own words.
              </p>
            </div>
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1 shadow-2xs">
              <span className="text-[15px] font-bold text-[#b46b19] uppercase tracking-wider block">
                Step 3
              </span>
              <h3 className="text-[16px] font-bold text-[#18263e]">3 Choose</h3>
              <p className="text-[16px] text-[#4e5e77] leading-snug">
                Pick what to investigate. The decision stays yours.
              </p>
            </div>
          </div>
        )}

        {/* Panel 2: Our promise */}
        {activeTab === 2 && (
          <div
            id="panel-our-promise"
            role="tabpanel"
            aria-labelledby="tab-our-promise"
            className="panel-fade grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1.5 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#18263e] pb-1 border-b border-[#f3ede2]">
                Second Look will
              </h3>
              <ul className="space-y-1 text-[16px] text-[#4e5e77]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#b46b19] font-bold select-none">&bull;</span>
                  <span>Question your assumptions</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#b46b19] font-bold select-none">&bull;</span>
                  <span>Point out what&apos;s missing</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#b46b19] font-bold select-none">&bull;</span>
                  <span>Ask before it guesses</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-2.5 sm:p-3 space-y-1.5 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#18263e] pb-1 border-b border-[#f3ede2]">
                Second Look never
              </h3>
              <ul className="space-y-1 text-[16px] text-[#4e5e77]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#18263e] font-bold select-none">&bull;</span>
                  <span>Recommend an option</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#18263e] font-bold select-none">&bull;</span>
                  <span>Rank or score your choices</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#18263e] font-bold select-none">&bull;</span>
                  <span>Tell you what to do</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Panel 3: Privacy */}
        {activeTab === 3 && (
          <div
            id="panel-privacy"
            role="tabpanel"
            aria-labelledby="tab-privacy"
            className="panel-fade rounded-xl border border-[#dbd4c7] bg-[#ffffff] p-3 space-y-1.5 shadow-2xs"
          >
            <p className="text-[16px] text-[#18263e] leading-relaxed">
              Your text is sent to the Gemini API to produce the analysis.
            </p>
            <p className="text-[16px] text-[#4e5e77] leading-relaxed">
              Nothing is saved unless you sign in and choose Save.
            </p>
            <p className="text-[15px] text-[#6c7c94] pt-1 border-t border-[#f3ede2]">
              For reflection, not professional advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
