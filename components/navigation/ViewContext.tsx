"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { STORAGE_KEY } from "@/components/Workspace";

interface ViewContextValue {
  view: "landing" | "workspace";
  goToWorkspace: () => void;
  returnToLanding: () => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

function getInitialView(): "landing" | "workspace" {
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
      // Ignore sessionStorage read errors
    }
  }
  return "landing";
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"landing" | "workspace">(getInitialView);

  const persistView = (newView: "landing" | "workspace") => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        const current = saved ? JSON.parse(saved) : {};
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...current,
            view: newView,
          })
        );
      } catch {
        // Ignore storage errors
      }
    }
  };

  const goToWorkspace = useCallback(() => {
    setView("workspace");
    persistView("workspace");
    if (typeof window !== "undefined") {
      window.history.pushState({ view: "workspace" }, "", "/#workspace");
    }
  }, []);

  const returnToLanding = useCallback(() => {
    if (pathname !== "/") {
      router.push("/");
    }
    setView("landing");
    persistView("landing");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const h1 = document.getElementById("landing-h1");
        h1?.focus();
      }, 50);
    }
  }, [pathname, router]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view === "workspace") {
        setView("workspace");
        persistView("workspace");
      } else {
        setView("landing");
        persistView("landing");
        setTimeout(() => {
          const h1 = document.getElementById("landing-h1");
          h1?.focus();
        }, 50);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <ViewContext.Provider value={{ view, goToWorkspace, returnToLanding }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView(): ViewContextValue {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}
