"use client";

import React, { useState, useSyncExternalStore } from "react";
import { Workspace } from "@/components/Workspace";
import { InfoTabs } from "@/components/landing/InfoTabs";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { useView } from "@/components/navigation/ViewContext";
import { useAuth } from "@/components/auth/AuthProvider";

function subscribe() {
  return () => {};
}

export default function HomePage() {
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const { view, goToWorkspace, returnToLanding } = useView();
  const { sessionEpoch } = useAuth();
  const [activeTab, setActiveTab] = useState<number>(0);

  if (!isMounted) {
    return (
      <div className="w-full max-w-6xl mx-auto py-4">
        <h1 className="font-serif text-3xl font-bold text-[#18263e]">
          A wider view of every decision.
        </h1>
      </div>
    );
  }

  if (view === "workspace") {
    return <Workspace key={sessionEpoch} onExit={returnToLanding} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto my-auto py-2 sm:py-4">
      {/* Two columns on desktop: fits 1280x720 without vertical scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
        {/* Left Column: Hero, Actions, and InfoTabs */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-center space-y-3.5 sm:space-y-4 text-left">
          {/* Eyebrow label */}
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[15px] font-semibold uppercase tracking-wider bg-[#fdf7ee] text-[#b46b19] border border-[#ebd1a4]">
              A thinking tool, not a decision-maker
            </span>
          </div>

          {/* Heading with clamp(2rem, 4.4vw, 3.4rem) and subline */}
          <div className="space-y-1.5">
            <h1
              id="landing-h1"
              tabIndex={-1}
              className="font-serif font-bold text-[#18263e] tracking-tight leading-[1.1] text-[clamp(2rem,4.4vw,3.4rem)] outline-none"
            >
              A wider view of every decision.
            </h1>
            <p className="font-serif text-[clamp(1.15rem,2.2vw,1.45rem)] text-[#4e5e77] leading-snug">
              Because every decision deserves another perspective.
            </p>
          </div>

          {/* Short descriptive paragraph */}
          <p className="text-base sm:text-[17px] text-[#4e5e77] leading-relaxed max-w-xl">
            Describe a decision and your reasoning. Perspectra shows the assumptions and open questions in your thinking, in your own words, and never decides for you.
          </p>

          {/* Action Button */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={goToWorkspace}
              className="min-h-[52px] sm:min-h-[56px] min-w-[280px] sm:min-w-[340px] px-10 sm:px-12 py-3.5 rounded-2xl font-bold text-[18px] sm:text-[20px] bg-[#18263e] text-[#faf8f5] hover:bg-[#233554] transition-all hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18263e] shadow-xs cursor-pointer inline-flex items-center justify-center gap-3"
            >
              <span>Examine my decision</span>
              <span aria-hidden="true" className="text-lg sm:text-xl font-bold">
                &rarr;
              </span>
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
