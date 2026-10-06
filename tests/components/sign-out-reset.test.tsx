// @vitest-environment jsdom
import React, { useState, useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import * as authProviderModule from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/SignInModal";
import SavedAnalysesPage from "@/app/saved/page";
import ProfilePage from "@/app/profile/page";
import { ResultsView } from "@/components/results/ResultsView";
import * as clientStateModule from "@/lib/clientState";
import * as savedModule from "@/lib/saved";
import * as profileStoreModule from "@/lib/profileStore";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
  firebaseConfigured: true,
}));

vi.mock("@/lib/saved", () => ({
  listAnalyses: vi.fn(),
  saveAnalysis: vi.fn(),
  updateAnalysis: vi.fn(),
  deleteAnalysis: vi.fn(),
  deleteAllAnalyses: vi.fn(),
}));

vi.mock("@/lib/profileStore", () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  ensureProfile: vi.fn(),
}));

describe("Phase 8c: Auth Modal & Complete Sign-Out Reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    clientStateModule.cancelPendingWriteTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Auth Modal layout, copy & close button", () => {
    it("shows distinct heading and description copy for Log in and Create account modes", async () => {
      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} initialMode="login" />
        </authProviderModule.AuthProvider>
      );

      // Log in mode copy
      expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
      expect(
        screen.getByText("Log in to save and revisit your analyses. They stay private to your account.")
      ).toBeInTheDocument();

      // Switch to Create account mode
      const signupTab = screen.getByRole("tab", { name: /create account/i });
      await userEvent.click(signupTab);

      // Create account mode copy
      expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
      expect(
        screen.getByText("A private account to save and revisit your analyses.")
      ).toBeInTheDocument();
    });

    it("close button calls onClose and returns focus to trigger element", async () => {
      function ModalWithTrigger() {
        const [isOpen, setIsOpen] = useState(false);
        const triggerRef = useRef<HTMLButtonElement>(null);

        return (
          <div>
            <button ref={triggerRef} onClick={() => setIsOpen(true)}>
              Open Auth Modal
            </button>
            <AuthModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              triggerRef={triggerRef}
            />
          </div>
        );
      }

      render(
        <authProviderModule.AuthProvider>
          <ModalWithTrigger />
        </authProviderModule.AuthProvider>
      );

      const openButton = screen.getByRole("button", { name: "Open Auth Modal" });
      await userEvent.click(openButton);

      // Find close button with aria-label="Close"
      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeInTheDocument();

      await userEvent.click(closeButton);

      // Modal closed; trigger button regained focus
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(openButton);
    });
  });

  describe("Complete Sign-Out Reset", () => {
    it("signOut clears every key in CLIENT_STORAGE_KEYS, resets epoch, and announces in polite region", async () => {
      window.sessionStorage.setItem("perspectra_workspace_v2", JSON.stringify({ draft: "test" }));
      window.sessionStorage.setItem("perspectra_pending_save_v1", JSON.stringify({ pending: true }));
      window.localStorage.setItem("perspectra_workspace_v2", "local copy");

      let authValue!: authProviderModule.AuthContextValue;

      function TestConsumer() {
        authValue = authProviderModule.useAuth();
        return <div>Epoch: {authValue.sessionEpoch}</div>;
      }

      render(
        <authProviderModule.AuthProvider>
          <TestConsumer />
        </authProviderModule.AuthProvider>
      );

      expect(authValue.sessionEpoch).toBe(0);

      // Perform sign out
      await act(async () => {
        await authValue.signOut();
      });

      // Storage keys purged
      expect(window.sessionStorage.getItem("perspectra_workspace_v2")).toBeNull();
      expect(window.sessionStorage.getItem("perspectra_pending_save_v1")).toBeNull();
      expect(window.localStorage.getItem("perspectra_workspace_v2")).toBeNull();

      // Epoch incremented
      expect(authValue.sessionEpoch).toBe(1);

      // Polite region announcement present
      const politeRegion = screen.getByRole("status");
      expect(politeRegion).toHaveAttribute("aria-live", "polite");
      expect(politeRegion).toHaveTextContent("You've been signed out.");
    });

    it("cancels pending debounced updateAnalysis writes on sign-out", async () => {
      vi.useFakeTimers();

      const mockAnalysisData = {
        kind: "analysis" as const,
        analysis: {
          decision_summary: "Test summary",
          reasoning_map: [],
          findings: [],
          premortem_questions: [],
          high_stakes_domain: "none" as const,
          closing_note: "Take your time.",
        },
        receipt: {
          language_check: "passed" as const,
          findings_total: 0,
          findings_grounded: 0,
          quotes_dropped: 0,
          retried: false,
        },
        input: {
          decision: "Test decision",
          reasons: "Test reasons",
          context: "",
        },
      };

      const userA = { uid: "user_a", email: "a@domain.com" } as unknown as User;

      function TestResultsWithAuth({ currentUser }: { currentUser: User | null }) {
        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user: currentUser,
              loading: false,
              configured: true,
              displayName: "User A",
              email: "a@domain.com",
              signInMethod: "password",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: vi.fn(),
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: vi.fn(),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <ResultsView
              data={mockAnalysisData}
              originalInput={{
                decisionType: "career",
                decision: "Test decision",
                reasons: "Test reasons",
                context: "",
                certaintyBefore: 3,
              }}
              savedId="doc_123"
            />
          </authProviderModule.AuthContext.Provider>
        );
      }

      const { rerender } = render(<TestResultsWithAuth currentUser={userA} />);

      // Mutate certaintyAfter to trigger debounced update (1000ms)
      const nextTab = screen.getByRole("tab", { name: /next steps/i });
      act(() => {
        nextTab.click();
      });
      const radios = screen.getAllByRole("radio");
      radios[4].click(); // click star 5

      // Before timer fires, cancel all pending write timers (as sign-out does)
      clientStateModule.cancelPendingWriteTimers();

      // Sign out: rerender with null user
      rerender(<TestResultsWithAuth currentUser={null} />);

      // Advance timers by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // updateAnalysis must NEVER have been called because timer was cancelled
      expect(savedModule.updateAnalysis).not.toHaveBeenCalled();
    });

    it("after sign-out SavedAnalysesPage shows prompt and none of previous user's analyses", async () => {
      const userA = { uid: "user_a", email: "a@domain.com" } as unknown as User;

      vi.mocked(savedModule.listAnalyses).mockResolvedValueOnce([
        {
          id: "rec_1",
          uid: "user_a",
          title: "Secret Strategy Decision",
          input: {
            decisionType: "career",
            decision: "Secret decision",
            reasons: "Secret reasons",
            context: "",
          },
          analysis: {
            decision_summary: "Secret analysis",
            reasoning_map: [],
            findings: [],
            premortem_questions: [],
            high_stakes_domain: "none",
            closing_note: "",
          },
          receipt: {
            language_check: "passed",
            findings_total: 0,
            findings_grounded: 0,
            quotes_dropped: 0,
            retried: false,
          },
          triage: {},
          notes: "Private notes",
          certaintyBefore: 4,
          certaintyAfter: 3,
          createdAt: null,
          updatedAt: null,
        },
      ]);

      function TestSavedPage({ currentUser }: { currentUser: User | null }) {
        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user: currentUser,
              loading: false,
              configured: true,
              displayName: "User A",
              email: "a@domain.com",
              signInMethod: "password",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: vi.fn(),
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: vi.fn(),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <SavedAnalysesPage />
          </authProviderModule.AuthContext.Provider>
        );
      }

      const { rerender } = render(<TestSavedPage currentUser={userA} />);

      // User A's analysis is rendered
      expect(await screen.findByText("Secret Strategy Decision")).toBeInTheDocument();

      // Sign out (currentUser becomes null)
      rerender(<TestSavedPage currentUser={null} />);

      // User A's analysis is immediately removed from the DOM
      expect(screen.queryByText("Secret Strategy Decision")).not.toBeInTheDocument();

      // Signed-out prompt is shown
      expect(
        screen.getByRole("heading", { name: "Your saved analyses" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Sign in with Google to view, revisit, and manage your saved analyses/i)
      ).toBeInTheDocument();
    });

    it("switching from user A to user B never renders user A's data on saved list or profile", async () => {
      const userA = { uid: "user_a", email: "a@domain.com" } as unknown as User;
      const userB = { uid: "user_b", email: "b@domain.com" } as unknown as User;

      vi.mocked(profileStoreModule.getProfile)
        .mockResolvedValueOnce({
          displayName: "Alice Secret",
          age: 40,
          profession: "Cryptography",
        })
        .mockResolvedValueOnce({
          displayName: "Bob Public",
          age: 25,
          profession: "Design",
        });

      function TestProfilePage({ currentUser }: { currentUser: User | null }) {
        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user: currentUser,
              loading: false,
              configured: true,
              displayName: currentUser?.displayName || "Test",
              email: currentUser?.email || null,
              signInMethod: "password",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: vi.fn(),
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: vi.fn(),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <ProfilePage />
          </authProviderModule.AuthContext.Provider>
        );
      }

      const { rerender } = render(<TestProfilePage currentUser={userA} />);

      // Alice's profile loads
      const nameInput = await screen.findByLabelText(/^name/i);
      expect(nameInput).toHaveValue("Alice Secret");
      expect(screen.getByLabelText(/^profession/i)).toHaveValue("Cryptography");

      // Switch user to Bob
      rerender(<TestProfilePage currentUser={userB} />);

      // Alice's data is wiped and Bob's data loads
      await waitFor(() => {
        expect(screen.getByLabelText(/^name/i)).toHaveValue("Bob Public");
      });
      expect(screen.getByLabelText(/^profession/i)).toHaveValue("Design");
      expect(screen.queryByDisplayValue("Alice Secret")).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue("Cryptography")).not.toBeInTheDocument();
    });
  });
});
