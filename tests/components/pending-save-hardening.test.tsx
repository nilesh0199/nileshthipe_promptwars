// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import * as authProviderModule from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/SignInModal";
import { Header } from "@/components/Header";
import { ViewProvider } from "@/components/navigation/ViewContext";
import { ResultsView } from "@/components/results/ResultsView";
import * as clientStateModule from "@/lib/clientState";
import * as savedModule from "@/lib/saved";

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSendEmailVerification = vi.fn();
const mockUpdateProfile = vi.fn();

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
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
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

const sampleAnalysisData = {
  kind: "analysis" as const,
  analysis: {
    decision_summary: "Accept new engineering management role",
    reasoning_map: [
      {
        id: "r1",
        stated_reason: "Career acceleration",
        rests_on: "Management aligns with long-term goals",
        evidence_given: "Faster promotion track",
      },
    ],
    findings: [
      {
        id: "f1",
        type: "unstated_assumption" as const,
        title: "Mentorship bandwidth",
        observation: "You assume there will be leadership coaching.",
        evidence: [
          {
            field: "reasons" as const,
            start: 0,
            end: 19,
            text: "Career acceleration",
          },
        ],
        evidence_paraphrase: "Noted promotion velocity.",
        basis: "stated" as const,
        category: "career" as const,
        why_it_matters: "First-time managers need support.",
        reflection_question: "Who will coach you in the new role?",
        investigation_item: "Ask the hiring manager about executive mentoring.",
      },
    ],
    premortem_questions: ["What if you miss technical hands-on coding?"],
    high_stakes_domain: "none" as const,
    closing_note: "Take your time evaluating both paths.",
  },
  receipt: {
    language_check: "passed" as const,
    findings_total: 1,
    findings_grounded: 1,
    quotes_dropped: 0,
    retried: false,
  },
  input: {
    decision: "Should I accept the engineering management offer?",
    reasons: "Career acceleration and team leadership interest.",
    context: "Currently a senior engineer.",
  },
};

const sampleInput = {
  decisionType: "career" as const,
  decision: "Should I accept the engineering management offer?",
  reasons: "Career acceleration and team leadership interest.",
  context: "Currently a senior engineer.",
  certaintyBefore: 3,
};

describe("Phase 8d: Pending-Save Hardening & Verification Removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    clientStateModule.cancelPendingWriteTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("PART A: Removal of Email Verification", () => {
    it("sign-up creates account and updates profile but never calls sendEmailVerification", async () => {
      const mockUser = {
        uid: "user_new_101",
        displayName: null,
        email: "alice@example.com",
        reload: vi.fn(),
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockUser });

      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} initialMode="signup" />
        </authProviderModule.AuthProvider>
      );

      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/^name/i), "Alice Engineer");
      await user.type(screen.getByLabelText(/^email/i), "alice@example.com");
      await user.type(screen.getByLabelText(/^password/i), "secure-password-123");

      await user.click(screen.getByRole("button", { name: /^create account$/i }));

      await waitFor(() => {
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          "alice@example.com",
          "secure-password-123"
        );
      });

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, {
          displayName: "Alice Engineer",
        });
      });

      expect(mockSendEmailVerification).not.toHaveBeenCalled();
    });

    it("no email verification banner or unverified note is rendered across Header", async () => {
      vi.spyOn(authProviderModule, "useAuth").mockReturnValue({
        user: { uid: "user_test", email: "bob@example.com" } as unknown as User,
        loading: false,
        configured: true,
        displayName: "Bob Smith",
        email: "bob@example.com",
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
      });

      render(
        <ViewProvider>
          <Header />
        </ViewProvider>
      );

      // Open user dropdown menu
      const avatarBtn = screen.getByRole("button", { name: /user menu for bob smith/i });
      await userEvent.click(avatarBtn);

      const menu = screen.getByRole("menu");
      expect(menu).toHaveTextContent("Bob Smith");
      expect(menu).not.toHaveTextContent(/email not verified/i);
      expect(menu).not.toHaveTextContent(/verify your email/i);
      expect(screen.queryByText(/please verify your email/i)).not.toBeInTheDocument();
    });
  });

  describe("PART B: Pending-Save Dismissal Clearing", () => {
    it("closing modal with 'Not now' button clears pending payload", async () => {
      // Pre-populate pending save
      clientStateModule.setPendingSave({
        input: {
          decisionType: "career",
          decision: "Test",
          reasons: "Test",
        },
        analysis: sampleAnalysisData.analysis,
        receipt: sampleAnalysisData.receipt,
        triage: {},
        notes: "",
        certaintyBefore: 3,
        certaintyAfter: null,
      });

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      let isOpen = true;
      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={isOpen} onClose={() => { isOpen = false; }} />
        </authProviderModule.AuthProvider>
      );

      const notNowBtn = screen.getByRole("button", { name: /not now/i });
      await userEvent.click(notNowBtn);

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("closing modal with the close button (X) clears pending payload", async () => {
      clientStateModule.setPendingSave({
        input: { decisionType: "career", decision: "Test", reasons: "Test" },
        analysis: sampleAnalysisData.analysis,
        receipt: sampleAnalysisData.receipt,
        triage: {},
        notes: "",
        certaintyBefore: 3,
        certaintyAfter: null,
      });

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </authProviderModule.AuthProvider>
      );

      const closeBtn = screen.getByRole("button", { name: "Close" });
      await userEvent.click(closeBtn);

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("closing modal with Escape key clears pending payload", async () => {
      clientStateModule.setPendingSave({
        input: { decisionType: "career", decision: "Test", reasons: "Test" },
        analysis: sampleAnalysisData.analysis,
        receipt: sampleAnalysisData.receipt,
        triage: {},
        notes: "",
        certaintyBefore: 3,
        certaintyAfter: null,
      });

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </authProviderModule.AuthProvider>
      );

      const user = userEvent.setup();
      await user.keyboard("{Escape}");

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });
  });

  describe("PART B: Expiry, Origin Binding & Execution Isolation", () => {
    it("a pending payload older than 10 minutes is not saved when user signs in", async () => {
      const tenMinutesOneSecAgo = Date.now() - (10 * 60 * 1000 + 1000);
      clientStateModule.setPendingSave(
        {
          input: { decisionType: "career", decision: "Expired", reasons: "Expired reasons" },
          analysis: sampleAnalysisData.analysis,
          receipt: sampleAnalysisData.receipt,
          triage: {},
          notes: "",
          certaintyBefore: 2,
          certaintyAfter: 3,
        },
        tenMinutesOneSecAgo
      );

      const authUser = { uid: "user_expired_test", email: "user@test.com" } as unknown as User;

      function TestResultsComponent({ user }: { user: User | null }) {
        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user,
              loading: false,
              configured: true,
              displayName: "Test User",
              email: "user@test.com",
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
            <ResultsView data={sampleAnalysisData} originalInput={sampleInput} />
          </authProviderModule.AuthContext.Provider>
        );
      }

      // Render as guest first
      const { rerender } = render(<TestResultsComponent user={null} />);

      // Switch to Next steps tab and click Save this analysis
      const nextStepsTab = screen.getByRole("tab", { name: "Next steps" });
      await userEvent.click(nextStepsTab);

      const saveBtn = screen.getByRole("button", { name: /save this analysis/i });
      await userEvent.click(saveBtn);

      // Now backdate the stored payload timestamp to 11 minutes ago
      const expiredPayload = clientStateModule.getPendingSave();
      expect(expiredPayload).not.toBeNull();
      clientStateModule.setPendingSave(expiredPayload!.data, tenMinutesOneSecAgo);

      // User signs in (user state updates)
      rerender(<TestResultsComponent user={authUser} />);

      await act(async () => {
        await Promise.resolve();
      });

      // Expired pending save must NOT have been saved
      expect(savedModule.saveAnalysis).not.toHaveBeenCalled();
      // Storage must have been cleared
      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
    });

    it("signing in from the header button never saves a pending payload", async () => {
      // Put a pending payload in storage
      clientStateModule.setPendingSave({
        input: { decisionType: "career", decision: "Stale data", reasons: "Stale reasons" },
        analysis: sampleAnalysisData.analysis,
        receipt: sampleAnalysisData.receipt,
        triage: {},
        notes: "",
        certaintyBefore: 3,
        certaintyAfter: null,
      });

      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      function AppWithHeaderAndResults() {
        const [user, setUser] = useState<User | null>(null);

        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user,
              loading: false,
              configured: true,
              displayName: user ? "Signed In User" : "",
              email: user ? "test@user.com" : null,
              signInMethod: "password",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: async () => {
                const u = { uid: "header_user_1", email: "test@user.com" } as unknown as User;
                setUser(u);
                return u;
              },
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: async () => setUser(null),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <ViewProvider>
              <Header />
              <ResultsView data={sampleAnalysisData} originalInput={sampleInput} />
            </ViewProvider>
          </authProviderModule.AuthContext.Provider>
        );
      }

      render(<AppWithHeaderAndResults />);

      // Click the Header "Log in / Sign up" button
      const headerLoginBtn = screen.getByRole("button", { name: /log in \/ sign up/i });
      await userEvent.click(headerLoginBtn);

      // Verify that opening from Header purged the pending save
      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();

      // Sign in via Google button in modal
      const googleBtn = screen.getByRole("button", { name: /continue with google/i });
      await userEvent.click(googleBtn);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // saveAnalysis must NEVER have been called because sign-in was from Header
      expect(savedModule.saveAnalysis).not.toHaveBeenCalled();
    });

    it("a valid pending payload is saved exactly once on a Save-initiated sign-in", async () => {
      vi.mocked(savedModule.saveAnalysis).mockResolvedValueOnce("saved_doc_777");

      function AppForSaveFlow() {
        const [user, setUser] = useState<User | null>(null);

        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user,
              loading: false,
              configured: true,
              displayName: user ? "Save User" : "",
              email: user ? "save@user.com" : null,
              signInMethod: "google",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: async () => {
                const u = { uid: "save_user_777", email: "save@user.com" } as unknown as User;
                setUser(u);
                return u;
              },
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: async () => setUser(null),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <ResultsView data={sampleAnalysisData} originalInput={sampleInput} />
          </authProviderModule.AuthContext.Provider>
        );
      }

      render(<AppForSaveFlow />);

      // Switch to "Next steps" tab where Save button resides
      const nextStepsTab = screen.getByRole("tab", { name: "Next steps" });
      await userEvent.click(nextStepsTab);

      // Click "Save this analysis"
      const saveBtn = screen.getByRole("button", { name: /save this analysis/i });
      await userEvent.click(saveBtn);

      // Modal opens
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Pending payload is stored in sessionStorage with metadata
      const rawPending = window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY);
      expect(rawPending).not.toBeNull();
      const parsed = JSON.parse(rawPending!);
      expect(parsed.initiatedBySave).toBe(true);

      // Click Continue with Google to sign in
      const googleBtn = screen.getByRole("button", { name: /continue with google/i });
      await userEvent.click(googleBtn);

      // Save occurs and doc is saved
      await waitFor(() => {
        expect(savedModule.saveAnalysis).toHaveBeenCalledTimes(1);
      });

      expect(savedModule.saveAnalysis).toHaveBeenCalledWith(
        "save_user_777",
        expect.objectContaining({
          input: expect.objectContaining({
            decision: "Should I accept the engineering management offer?",
          }),
        })
      );

      // Modal closes, pending payload is cleared, UI updates to Saved
      await waitFor(() => {
        expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
      });

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /view in saved/i })).toHaveAttribute(
        "href",
        "/saved/saved_doc_777"
      );
    });

    it("if save fails, keeps pending payload until 10-minute expiry and shows error state with 'Try again' button", async () => {
      vi.mocked(savedModule.saveAnalysis)
        .mockRejectedValueOnce(new Error("Firestore network disconnect"))
        .mockResolvedValueOnce("saved_doc_retry_888");

      function AppForFailureRetry() {
        const [user, setUser] = useState<User | null>(null);

        return (
          <authProviderModule.AuthContext.Provider
            value={{
              user,
              loading: false,
              configured: true,
              displayName: user ? "Retry User" : "",
              email: user ? "retry@user.com" : null,
              signInMethod: "google",
              sessionEpoch: 0,
              signOutNotice: null,
              signInWithGoogle: async () => {
                const u = { uid: "retry_user_888", email: "retry@user.com" } as unknown as User;
                setUser(u);
                return u;
              },
              signUpWithEmail: vi.fn(),
              signInWithEmail: vi.fn(),
              sendPasswordReset: vi.fn(),
              signOut: async () => setUser(null),
              authError: null,
              clearAuthError: vi.fn(),
            }}
          >
            <ResultsView data={sampleAnalysisData} originalInput={sampleInput} />
          </authProviderModule.AuthContext.Provider>
        );
      }

      render(<AppForFailureRetry />);

      // Go to Next steps tab and click Save
      const nextStepsTab = screen.getByRole("tab", { name: "Next steps" });
      await userEvent.click(nextStepsTab);

      const saveBtn = screen.getByRole("button", { name: /save this analysis/i });
      await userEvent.click(saveBtn);

      // Sign in with Google
      const googleBtn = screen.getByRole("button", { name: /continue with google/i });
      await userEvent.click(googleBtn);

      // First save attempt fails
      await waitFor(() => {
        expect(savedModule.saveAnalysis).toHaveBeenCalledTimes(1);
      });

      // Pending payload is KEPT in storage so user does not lose their data
      expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).not.toBeNull();

      // Error state alert and "Try again" button rendered
      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save analysis.");
      const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
      expect(tryAgainBtn).toBeInTheDocument();

      // User clicks "Try again"
      await userEvent.click(tryAgainBtn);

      // Second attempt succeeds
      await waitFor(() => {
        expect(savedModule.saveAnalysis).toHaveBeenCalledTimes(2);
      });

      // Pending payload cleared and UI updates to "Saved"
      await waitFor(() => {
        expect(window.sessionStorage.getItem(clientStateModule.PENDING_SAVE_STORAGE_KEY)).toBeNull();
      });

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /view in saved/i })).toHaveAttribute(
        "href",
        "/saved/saved_doc_retry_888"
      );
    });
  });
});
