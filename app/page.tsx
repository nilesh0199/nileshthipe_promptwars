"use client";

import React, { useState, useSyncExternalStore } from "react";
import { DecisionForm, STORAGE_KEY } from "@/components/DecisionForm";
import { DecisionInput } from "@/lib/types";
import {
  DecisionTypeId,
  getDecisionTypeConfig,
} from "@/lib/decisionTypes";
import { HeroSection } from "@/components/landing/HeroSection";
import { DemoStrip } from "@/components/landing/DemoStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WillNeverStrip } from "@/components/landing/WillNeverStrip";
import { DecisionTypePicker } from "@/components/landing/DecisionTypePicker";

function subscribe() {
  return () => {};
}

function getStoredView(): "landing" | "form" {
  if (typeof window !== "undefined") {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.view === "form") {
          return "form";
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

  const [view, setView] = useState<"landing" | "form">(() => getStoredView());
  const [selectedType, setSelectedType] = useState<DecisionTypeId>("career");
  const [initialData, setInitialData] = useState<DecisionInput | undefined>(undefined);
  const [formKey, setFormKey] = useState<number>(0);

  const handleSelectType = (typeId: DecisionTypeId) => {
    setSelectedType(typeId);
    let updatedData: DecisionInput | undefined = undefined;

    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.formData) {
            updatedData = {
              ...parsed.formData,
              decisionType: typeId,
            };
            sessionStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({
                ...parsed,
                formData: updatedData,
                view: "form",
              })
            );
          }
        }
      } catch {
        // Ignore
      }
    }

    setInitialData(updatedData);
    setView("form");
    setFormKey((k) => k + 1);
  };

  const handleTryCareerExample = () => {
    const careerConfig = getDecisionTypeConfig("career");
    const examplePayload: DecisionInput = {
      ...careerConfig.example,
      decisionType: "career",
      certaintyBefore: null,
    };

    setSelectedType("career");
    setInitialData(examplePayload);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            formData: examplePayload,
            step: 1,
            view: "form",
          })
        );
      } catch {
        // Ignore
      }
    }

    setView("form");
    setFormKey((k) => k + 1);
  };

  const handleChangeTypeFromForm = () => {
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
    // Scroll to type picker on landing
    setTimeout(() => {
      document.getElementById("start-title")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleExitForm = () => {
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
    setInitialData(undefined);
  };

  if (!isMounted) {
    return (
      <div className="space-y-12 sm:space-y-16">
        <HeroSection />
        <DemoStrip />
      </div>
    );
  }

  if (view === "form") {
    return (
      <DecisionForm
        key={formKey}
        initialData={initialData}
        initialType={selectedType}
        onChangeType={handleChangeTypeFromForm}
        onExit={handleExitForm}
      />
    );
  }

  return (
    <div className="space-y-14 sm:space-y-18">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Static Demo Strip */}
      <DemoStrip />

      {/* 3. How It Works */}
      <HowItWorks />

      {/* 4. Will / Never Strip */}
      <WillNeverStrip />

      {/* 5. Start Section: What kind of decision is this? */}
      <DecisionTypePicker
        onSelectType={handleSelectType}
        onTryExample={handleTryCareerExample}
      />
    </div>
  );
}
