import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Runs cleanup after each test to unmount React trees and clear mocks
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllTimers();
});
