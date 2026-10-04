import { getEnv } from "./env";

/**
 * In-memory rate limiting.
 *
 * NOTE & HONEST DISCLOSURE:
 * This rate limiter maintains state in memory per server instance. In a serverless
 * environment (e.g. Vercel), instances are spun up dynamically and state is not shared
 * across instances. This rate limiter provides best-effort protection against bursts on a
 * single instance. Production abuse defense should additionally leverage edge firewall rules.
 */

export interface RateLimiterOptions {
  maxRequests?: number;
  windowSeconds?: number;
  globalMaxPerHour?: number;
  maxMapSize?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  isGlobal?: boolean;
  retryAfterSeconds?: number;
  reason?: "RATE_LIMITED" | "AI_UNAVAILABLE";
}

interface KeyEntry {
  timestamps: number[];
  updatedAt: number;
}

export function extractClientKey(
  headers: Headers | Record<string, string | null | undefined>
): string {
  const getHeader = (name: string): string | null => {
    if ("get" in headers && typeof headers.get === "function") {
      return headers.get(name);
    }
    const record = headers as Record<string, string | null | undefined>;
    const val = record[name.toLowerCase()] ?? record[name];
    return typeof val === "string" ? val : null;
  };

  const forwarded = getHeader("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = getHeader("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export class MemoryRateLimiter {
  private perKeyMap = new Map<string, KeyEntry>();
  private globalTimestamps: number[] = [];
  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions = {}) {
    this.options = options;
  }

  public check(key: string, now: number = Date.now()): RateLimitResult {
    let maxRequests: number;
    let windowSeconds: number;
    let globalMax: number;

    try {
      const env = getEnv();
      maxRequests = this.options.maxRequests ?? env.RATE_LIMIT_MAX;
      windowSeconds = this.options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS;
      globalMax = this.options.globalMaxPerHour ?? env.RATE_LIMIT_GLOBAL_MAX;
    } catch {
      maxRequests = this.options.maxRequests ?? 20;
      windowSeconds = this.options.windowSeconds ?? 600;
      globalMax = this.options.globalMaxPerHour ?? 300;
    }

    const windowMs = windowSeconds * 1000;
    const globalWindowMs = 3600 * 1000;
    const maxMapSize = this.options.maxMapSize ?? 10000;

    // 1. Prune and check global cap
    this.globalTimestamps = this.globalTimestamps.filter((t) => now - t < globalWindowMs);
    if (this.globalTimestamps.length >= globalMax) {
      return {
        allowed: false,
        isGlobal: true,
        retryAfterSeconds: 60,
        reason: "AI_UNAVAILABLE",
      };
    }

    // 2. Lookup & prune current key's timestamps
    let entry = this.perKeyMap.get(key);
    if (!entry) {
      entry = { timestamps: [], updatedAt: now };
    } else {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    }

    // 3. Check per-key limit
    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
      return {
        allowed: false,
        isGlobal: false,
        retryAfterSeconds,
        reason: "RATE_LIMITED",
      };
    }

    // 4. Record successful attempt
    entry.timestamps.push(now);
    entry.updatedAt = now;
    this.globalTimestamps.push(now);

    // Re-insert to keep insertion order up to date (for LRU eviction)
    this.perKeyMap.delete(key);
    this.perKeyMap.set(key, entry);

    // 5. Prune expired entries and enforce maxMapSize cap
    this.prune(now, windowMs, maxMapSize);

    return { allowed: true };
  }

  public prune(now: number = Date.now(), windowMs: number = 600000, maxMapSize: number = 10000): void {
    // Delete expired entries
    for (const [k, v] of this.perKeyMap.entries()) {
      v.timestamps = v.timestamps.filter((t) => now - t < windowMs);
      if (v.timestamps.length === 0) {
        this.perKeyMap.delete(k);
      }
    }

    // If still over capacity, drop oldest entries (first in Map order)
    while (this.perKeyMap.size > maxMapSize) {
      const oldestKey = this.perKeyMap.keys().next().value;
      if (oldestKey !== undefined) {
        this.perKeyMap.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  public size(): number {
    return this.perKeyMap.size;
  }

  public reset(): void {
    this.perKeyMap.clear();
    this.globalTimestamps = [];
  }
}

export const rateLimiter = new MemoryRateLimiter();
