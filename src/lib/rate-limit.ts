/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window per identifier (IP or FID).
 * Note: In serverless, each instance has separate memory — limits apply per-instance.
 * For multi-instance rate limiting, use Redis (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

/** Cleanup entries older than 2 minutes to prevent memory leaks */
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - CLEANUP_INTERVAL_MS;
  for (const [key, entry] of store.entries()) {
    if (entry.windowStart < cutoff) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInMs: number;
}

/**
 * Check rate limit for an identifier.
 *
 * @param identifier - Unique key (e.g. IP address, FID)
 * @param limit - Max requests per window
 * @param windowMs - Window size in milliseconds
 * @returns Result with success, remaining, and reset time
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60_000, // 1 minute default
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  // Sliding window: reset if we've passed the window
  const elapsed = now - entry.windowStart;
  if (elapsed >= windowMs) {
    store.set(identifier, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: limit - 1,
      resetInMs: windowMs,
    };
  }

  // Within window
  const remaining = Math.max(0, limit - entry.count - 1);
  const resetInMs = Math.ceil(windowMs - elapsed);

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetInMs };
  }

  entry.count += 1;
  return { success: true, remaining, resetInMs };
}

/** Get client IP from request headers (Vercel, etc.) */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  const ip =
    cfConnectingIp ??
    forwarded?.split(",")[0]?.trim() ??
    realIp ??
    "unknown";

  return ip;
}
