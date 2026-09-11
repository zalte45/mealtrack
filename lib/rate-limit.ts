/**
 * Simple in-memory rate limiter for the login endpoint.
 *
 * Strategy: sliding window counter per IP address.
 * No external dependencies (no Redis) — appropriate for MVP scale.
 *
 * Limits:
 * - 5 attempts per 15 minutes per IP (login protection)
 * - Configurable per endpoint
 *
 * NOTE: This is a process-level store. In a multi-instance deployment,
 * a shared store (Redis) would be needed. For the single-instance MVP
 * on Vercel (serverless), this resets on cold start but is sufficient
 * with Vercel's built-in DDoS protection. A TODO is noted for Phase 12.
 *
 * Architecture §8: "Rate limiting and login protection."
 */

interface RateLimitRecord {
  count: number;
  resetAt: number; // Unix ms timestamp
}

// In-memory store (module-level singleton)
const store = new Map<string, RateLimitRecord>();

// Cleanup old records every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

export interface RateLimitOptions {
  /** Maximum requests in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

/**
 * Check and increment the rate limit counter for a given key.
 *
 * @param key - Unique identifier, e.g. `login:${ip}`
 * @param options - limit and windowMs
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = { limit: 5, windowMs: 15 * 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt,
      retryAfterMs: 0,
    };
  }

  // Existing window
  existing.count += 1;
  const remaining = Math.max(0, options.limit - existing.count);
  const allowed = existing.count <= options.limit;

  return {
    allowed,
    remaining,
    resetAt: existing.resetAt,
    retryAfterMs: allowed ? 0 : existing.resetAt - now,
  };
}

/**
 * Get the client IP from a Next.js request.
 * Falls back to a generic key if IP cannot be determined.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
