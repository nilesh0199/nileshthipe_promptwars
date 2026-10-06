import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Default mock for Next.js App Router navigation hooks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Runs cleanup after each test to unmount React trees and clear mocks
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllTimers();
});
