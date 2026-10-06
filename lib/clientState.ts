/**
 * Client storage management and pending-write registry.
 * Guarantees complete cleanup of user-scoped browser state on sign-out.
 */

import type { BuildAnalysisDocParams } from "./savedDoc";

export const CLIENT_STORAGE_KEYS = [
  "perspectra_workspace_v2",
  "perspectra_pending_save_v1",
] as const;

export type ClientStorageKey = (typeof CLIENT_STORAGE_KEYS)[number];

export const PENDING_SAVE_STORAGE_KEY = "perspectra_pending_save_v1";
export const PENDING_SAVE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface StoredPendingSave {
  data: BuildAnalysisDocParams;
  createdAt: number;
  initiatedBySave: true;
}

/**
 * Stores a pending analysis payload initiated by the Save flow.
 * Adds timestamp metadata and initiatedBySave flag.
 */
export function setPendingSave(
  data: BuildAnalysisDocParams,
  now: number = Date.now()
): void {
  if (typeof window === "undefined") {
    return;
  }
  const item: StoredPendingSave = {
    data,
    createdAt: now,
    initiatedBySave: true,
  };
  try {
    window.sessionStorage.setItem(
      PENDING_SAVE_STORAGE_KEY,
      JSON.stringify(item)
    );
  } catch {
    // Ignore storage exceptions
  }
}

/**
 * Retrieves the pending analysis payload if it is valid, initiated by save,
 * and within the 10-minute expiry window.
 * If expired or invalid, clears the stored payload and returns null.
 */
export function getPendingSave(now: number = Date.now()): StoredPendingSave | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(PENDING_SAVE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.data ||
      typeof parsed.createdAt !== "number" ||
      parsed.initiatedBySave !== true
    ) {
      clearPendingSave();
      return null;
    }

    if (now - parsed.createdAt > PENDING_SAVE_EXPIRY_MS || now < parsed.createdAt) {
      clearPendingSave();
      return null;
    }

    return parsed as StoredPendingSave;
  } catch {
    clearPendingSave();
    return null;
  }
}

/**
 * Immediately clears the pending analysis payload from sessionStorage.
 */
export function clearPendingSave(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(PENDING_SAVE_STORAGE_KEY);
  } catch {
    // Ignore storage exceptions
  }
}

const pendingWriteTimers = new Set<NodeJS.Timeout | number>();

/**
 * Registers an active debounced write timer so it can be aborted if the user signs out.
 * Returns an unregister function to call when the timer finishes or is cancelled locally.
 */
export function registerPendingWriteTimer(
  timer: NodeJS.Timeout | number
): () => void {
  pendingWriteTimers.add(timer);
  return () => {
    pendingWriteTimers.delete(timer);
  };
}

/**
 * Cancels all active debounced write timers immediately.
 */
export function cancelPendingWriteTimers(): void {
  for (const timer of pendingWriteTimers) {
    clearTimeout(timer);
  }
  pendingWriteTimers.clear();
}

/**
 * Returns the count of currently registered pending write timers.
 */
export function getPendingWriteTimerCount(): number {
  return pendingWriteTimers.size;
}

/**
 * Purges every user-scoped storage key used by Perspectra from sessionStorage and localStorage.
 * Only removes our own application keys; never calls storage.clear().
 */
export function clearUserScopedClientState(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of CLIENT_STORAGE_KEYS) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore sessionStorage exceptions
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore localStorage exceptions
    }
  }

  // Also remove any other key matching our application prefix
  try {
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("perspectra_")) {
        sessionKeysToRemove.push(k);
      }
    }
    for (const k of sessionKeysToRemove) {
      window.sessionStorage.removeItem(k);
    }
  } catch {
    // Ignore storage exceptions
  }

  try {
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("perspectra_")) {
        localKeysToRemove.push(k);
      }
    }
    for (const k of localKeysToRemove) {
      window.localStorage.removeItem(k);
    }
  } catch {
    // Ignore storage exceptions
  }
}
