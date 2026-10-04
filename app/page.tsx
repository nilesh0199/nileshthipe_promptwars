"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Workspace, STORAGE_KEY } from "@/components/Workspace";
import { InfoTabs } from "@/components/landing/InfoTabs";
import { ProductPreview } from "@/components/landing/ProductPreview";

function subscribe() {
  return () => {};
}

function getStoredView(): "landing" | "workspace" {
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.view === "workspace" || parsed?.view === "form") {
          return "workspace";
        }
      }
    } catch {
      // Ignore
    }
  }
  return "landing";
}

export default function HomePage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const [view, setView] = useState<"landing" | "workspace">(() => getStoredView());
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleStartWorkspace = () => {
    setView("workspace");
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        const current = saved ? JSON.parse(saved) : {};
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...current,
            view: "workspace",
          })
        );
      } catch {
        // Ignore
      }
    }
  };

  const handleOpenHowItWorks = () => {
    setActiveTab(1); // Select "How it works" tab (index 1)
  };

  const handleExitWorkspace = () => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...parsed,
              view: "landing",
            })
          );
        }
      } catch {
        // Ignore
      }
    }
    setView("landing");
  };

  if (!isMounted) {
    return (
      <div className="w-full max-w-6xl mx-auto py-4">
        <h1 className="font-serif text-3xl font-bold text-[#18263e]">
          See your decision from where you&apos;re not standing.
        </h1>
      </div>
    );
  }

  if (view === "workspace") {
    return <Workspace onExit={handleExitWorkspace} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto my-auto py-2 sm:py-4">
      {/* Two columns on desktop: fits 1280x720 without vertical scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: Hero, Actions, and InfoTabs */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center space-y-4 sm:space-y-5 text-left">
          {/* Eyebrow label */}
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[15px] font-semibold uppercase tracking-wider bg-[#fdf7ee] text-[#b46b19] border border-[#ebd1a4]">
              A thinking tool, not a decision-maker
            </span>
          </div>

          {/* Heading with clamp(2rem, 4.6vw, 3.5rem) */}
          <h1 className="font-serif font-bold text-[#18263e] tracking-tight leading-[1.1] text-[clamp(2rem,4.6vw,3.5rem)]">
            See your decision from where you&apos;re not standing.
          </h1>

          {/* Short subtext (~20 words) */}
          <p className="text-base sm:text-[17px] text-[#4e5e77] leading-relaxed max-w-xl">
            Describe a decision and your reasoning. Second Look shows the assumptions
            and open questions in your thinking, in your own words.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleStartWorkspace}
              className="min-h-[44px] px-6 py-2.5 rounded-xl font-medium text-base sm:text-[17px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <span>Start a Second Look</span>
              <span aria-hidden="true" className="text-base font-bold">
                &rarr;
              </span>
            </button>

            <button
              type="button"
              onClick={handleOpenHowItWorks}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-base sm:text-[17px] font-medium text-[#18263e] hover:text-[#b46b19] hover:bg-[#f3ede2]/60 transition-colors focus-visible:outline-2 focus-visible:outline-[#18263e] cursor-pointer"
            >
              How it works
            </button>
          </div>

          {/* Handcrafted Accessible InfoTabs below buttons */}
          <div className="pt-2">
            <InfoTabs
              activeTab={activeTab}
              onSelectTab={(idx) => setActiveTab(idx)}
            />
          </div>
        </div>

        {/* Right Column: Abstract Decorative Product Preview (hidden below 640px) */}
        <div className="lg:col-span-5 xl:col-span-5 hidden sm:flex items-center justify-center">
          <ProductPreview />
        </div>
      </div>
    </div>
  );
}
