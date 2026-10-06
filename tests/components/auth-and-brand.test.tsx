// @vitest-environment jsdom
import React, { useRef, useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInModal } from "@/components/auth/SignInModal";
import { Header } from "@/components/Header";
import { ViewProvider, useView } from "@/components/navigation/ViewContext";
import * as authProviderModule from "@/components/auth/AuthProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("@/lib/saved", () => ({
  saveAnalysis: vi.fn(),
  updateAnalysis: vi.fn(),
}));

describe("SignInModal & Brand Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function ModalTestWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    return (
      <div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
        >
          Open Modal Trigger
        </button>
        <SignInModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          triggerRef={triggerRef}
        />
      </div>
    );
  }

  it("opens SignInModal with focus inside and restores focus on Escape", async () => {
    vi.useFakeTimers();
    render(
      <authProviderModule.AuthProvider>
        <ModalTestWrapper />
      </authProviderModule.AuthProvider>
    );

    const triggerBtn = screen.getByRole("button", { name: /open modal trigger/i });
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    // Open the modal
    act(() => {
      triggerBtn.click();
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Advance 50ms for initial focus transition
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Press Escape to close modal
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Focus returns to the trigger button
    expect(document.activeElement).toBe(triggerBtn);
  });

  it("brand link button calls returnToLanding without clearing sessionStorage draft state", async () => {
    // Setup initial draft state in sessionStorage
    window.sessionStorage.setItem("perspectra_workspace_v2", JSON.stringify({
      formData: {
        decisionType: "career",
        decision: "My draft decision",
        reasons: "My draft reasons",
        context: "",
        certaintyBefore: null,
      },
      screenIndex: 2,
    }));

    function BrandTestApp() {
      const { view, goToWorkspace } = useView();
      return (
        <div>
          <Header />
          <div data-testid="current-view">{view}</div>
          <button type="button" onClick={goToWorkspace}>
            Go to Workspace
          </button>
        </div>
      );
    }

    render(
      <authProviderModule.AuthProvider>
        <ViewProvider>
          <BrandTestApp />
        </ViewProvider>
      </authProviderModule.AuthProvider>
    );

    const user = userEvent.setup();

    // Switch to workspace view
    await user.click(screen.getByRole("button", { name: /go to workspace/i }));
    expect(screen.getByTestId("current-view").textContent).toBe("workspace");

    // Click brand link in Header
    const brandButton = screen.getByRole("button", { name: /perspectra, home/i });
    await user.click(brandButton);

    // Returned to landing view
    expect(screen.getByTestId("current-view").textContent).toBe("landing");

    // Draft in sessionStorage is strictly preserved (never wiped)
    const stored = window.sessionStorage.getItem("perspectra_workspace_v2");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.formData.decision).toBe("My draft decision");
  });

  it("renders the new brand logo mark image in Header and SignInModal", () => {
    render(
      <authProviderModule.AuthProvider>
        <ViewProvider>
          <Header />
          <SignInModal isOpen={true} onClose={() => {}} />
        </ViewProvider>
      </authProviderModule.AuthProvider>
    );

    const brandImages = document.querySelectorAll('img[src*="logo-mark.png"]');
    expect(brandImages.length).toBe(2);
    brandImages.forEach((img) => {
      expect(img).toHaveAttribute("alt", "");
    });
  });

  it("renders fully opaque sticky header with solid background, border, and no blur", () => {
    render(
      <authProviderModule.AuthProvider>
        <ViewProvider>
          <Header />
        </ViewProvider>
      </authProviderModule.AuthProvider>
    );

    const header = document.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain("bg-[#faf8f5]");
    expect(header?.className).toContain("sticky");
    expect(header?.className).toContain("top-0");
    expect(header?.className).toContain("h-16");
    expect(header?.className).toContain("border-b");
    expect(header?.className).not.toContain("backdrop-blur");
    expect(header?.className).not.toContain("/90");
  });
});
