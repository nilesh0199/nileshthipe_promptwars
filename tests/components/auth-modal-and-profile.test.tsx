// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "firebase/auth";
import { AuthModal } from "@/components/auth/SignInModal";
import ProfilePage from "@/app/profile/page";
import { Header } from "@/components/Header";
import { ViewProvider } from "@/components/navigation/ViewContext";
import * as authProviderModule from "@/components/auth/AuthProvider";
import * as profileStoreModule from "@/lib/profileStore";

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSendEmailVerification = vi.fn();

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
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args: unknown[]) =>
    mockSendEmailVerification(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  db: {},
  firebaseConfigured: true,
}));

vi.mock("@/lib/profileStore", () => ({
  getProfile: vi.fn(),
  saveProfile: vi.fn(),
  ensureProfile: vi.fn(),
}));

describe("AuthModal & Profile Page Component Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AuthModal tabs & validation", () => {
    it("Log in tab does not show Name field, but Create account tab does", async () => {
      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </authProviderModule.AuthProvider>
      );

      // Default mode is login
      expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^log in$/i })).toBeInTheDocument();

      // Switch to Create account tab
      const createAccountTab = screen.getByRole("tab", { name: /create account/i });
      await userEvent.click(createAccountTab);

      // Now Name field is present
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^create account$/i })).toBeInTheDocument();
    });

    it("toggles password visibility with show/hide button and aria-pressed", async () => {
      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} />
        </authProviderModule.AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", { name: /show password/i });
      expect(toggleButton).toHaveAttribute("aria-pressed", "false");

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(toggleButton).toHaveAttribute("aria-pressed", "true");

      await userEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(toggleButton).toHaveAttribute("aria-pressed", "false");
    });

    it("displays inline validation errors when submitting empty form", async () => {
      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} initialMode="signup" />
        </authProviderModule.AuthProvider>
      );

      const submitButton = screen.getByRole("button", { name: /^create account$/i });
      await userEvent.click(submitButton);

      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter your email/i)).toBeInTheDocument();
      expect(screen.getByText(/please enter a password/i)).toBeInTheDocument();
    });

    it("sign-up calls createUser then updateProfile with trimmed name", async () => {
      const mockUser = {
        uid: "new_user_789",
        displayName: null,
        email: "newuser@test.org",
        reload: vi.fn(),
      };

      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
        user: mockUser,
      });

      render(
        <authProviderModule.AuthProvider>
          <AuthModal isOpen={true} onClose={() => {}} initialMode="signup" />
        </authProviderModule.AuthProvider>
      );

      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/^name/i), "   Margaret Hamilton   ");
      await user.type(screen.getByLabelText(/^email/i), "margaret@apollo.nasa.gov");
      await user.type(screen.getByLabelText(/^password/i), "correct-horse-battery");

      await user.click(screen.getByRole("button", { name: /^create account$/i }));

      await waitFor(() => {
        expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
          expect.anything(),
          "margaret@apollo.nasa.gov",
          "correct-horse-battery"
        );
      });

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          mockUser,
          { displayName: "Margaret Hamilton" }
        );
      });
    });
  });

  describe("Profile Page (app/profile/page.tsx)", () => {
    it("renders friendly sign-in prompt when signed out", () => {
      render(
        <authProviderModule.AuthProvider>
          <ProfilePage />
        </authProviderModule.AuthProvider>
      );

      expect(
        screen.getByRole("heading", { name: /sign in to view your profile/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /log in \/ sign up/i })
      ).toBeInTheDocument();
    });

    it("loads profile data and saves valid updates", async () => {
      vi.spyOn(authProviderModule, "useAuth").mockReturnValue({
        user: { uid: "test_uid", email: "scientist@lab.edu", emailVerified: true } as unknown as User,
        loading: false,
        configured: true,
        displayName: "Dr. Marie Curie",
        email: "scientist@lab.edu",
        emailVerified: true,
        signInMethod: "password",
        signInWithGoogle: vi.fn(),
        signUpWithEmail: vi.fn(),
        signInWithEmail: vi.fn(),
        sendPasswordReset: vi.fn(),
        resendVerification: vi.fn(),
        signOut: vi.fn(),
        authError: null,
        clearAuthError: vi.fn(),
      });

      vi.mocked(profileStoreModule.getProfile).mockResolvedValueOnce({
        displayName: "Dr. Marie Curie",
        age: 38,
        profession: "Physicist",
      });

      render(<ProfilePage />);

      // Wait for profile fields to load
      const nameInput = await screen.findByLabelText(/^name/i);
      expect(nameInput).toHaveValue("Dr. Marie Curie");

      const ageInput = screen.getByLabelText(/^age/i);
      expect(ageInput).toHaveValue("38");

      const profInput = screen.getByLabelText(/^profession/i);
      expect(profInput).toHaveValue("Physicist");

      // Verify privacy notice is rendered
      expect(
        screen.getByText(/optional. this stays in your account and is never sent to the ai./i)
      ).toBeInTheDocument();

      // Modify profession
      const user = userEvent.setup();
      await user.clear(profInput);
      await user.type(profInput, "Chemist & Physicist");

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeEnabled();

      await user.click(saveButton);

      expect(profileStoreModule.saveProfile).toHaveBeenCalledWith(
        "test_uid",
        expect.objectContaining({
          displayName: "Dr. Marie Curie",
          profession: "Chemist & Physicist",
        })
      );

      expect(await screen.findByText("Saved")).toBeInTheDocument();
    });
  });

  describe("Header Menu profile details", () => {
    it("renders user displayName beneath the initial avatar circle", async () => {
      vi.spyOn(authProviderModule, "useAuth").mockReturnValue({
        user: { uid: "u1", email: "user@domain.com", emailVerified: false } as unknown as User,
        loading: false,
        configured: true,
        displayName: "Katherine Johnson",
        email: "user@domain.com",
        emailVerified: false,
        signInMethod: "password",
        signInWithGoogle: vi.fn(),
        signUpWithEmail: vi.fn(),
        signInWithEmail: vi.fn(),
        sendPasswordReset: vi.fn(),
        resendVerification: vi.fn(),
        signOut: vi.fn(),
        authError: null,
        clearAuthError: vi.fn(),
      });

      render(
        <ViewProvider>
          <Header />
        </ViewProvider>
      );

      const avatarButton = screen.getByRole("button", { name: /user menu for katherine johnson/i });
      await userEvent.click(avatarButton);

      // Verify dropdown displays name beneath avatar
      const menu = screen.getByRole("menu");
      expect(menu).toHaveTextContent("Katherine Johnson");
      expect(menu).toHaveTextContent("user@domain.com");
      expect(menu).toHaveTextContent(/email not verified/i);

      // Verify profile and analyses navigation links
      expect(screen.getByRole("menuitem", { name: /my profile/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /my analyses/i })).toBeInTheDocument();
    });
  });
});
