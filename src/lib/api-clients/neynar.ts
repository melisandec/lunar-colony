/**
 * Neynar API client for Farcaster interactions.
 *
 * Free tier: 100 requests/minute
 * Docs: https://docs.neynar.com
 */

const NEYNAR_API_BASE = "https://api.neynar.com/v2";

function getApiKey(): string {
  const key = process.env.NEYNAR_API_KEY;
  if (!key) throw new Error("NEYNAR_API_KEY is not set");
  return key;
}

/** Rate limiter: simple in-memory token bucket */
const rateLimiter = {
  tokens: 100,
  lastRefill: Date.now(),
  refillRate: 100, // tokens per minute

  consume(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 60000; // minutes
    this.tokens = Math.min(
      this.refillRate,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;

    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  },
};

async function neynarFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  if (!rateLimiter.consume()) {
    throw new Error("Neynar rate limit exceeded. Try again later.");
  }

  const res = await fetch(`${NEYNAR_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      api_key: getApiKey(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Neynar API error (${res.status}): ${error}`);
  }

  return res.json() as Promise<T>;
}

// --- Farcaster Frame Validation ---

export interface FrameValidationResult {
  valid: boolean;
  action: {
    fid: number;
    url: string;
    buttonIndex: number;
    inputText?: string;
    castId?: {
      fid: number;
      hash: string;
    };
  };
}

/**
 * Validate a Farcaster Frame message using Neynar.
 * This verifies the signature and returns the action data.
 */
export async function validateFrameMessage(
  messageBytes: string,
): Promise<FrameValidationResult> {
  return neynarFetch<FrameValidationResult>("/farcaster/frame/validate", {
    method: "POST",
    body: JSON.stringify({
      message_bytes_in_hex: messageBytes,
      cast_reaction_context: false,
      follow_context: false,
    }),
  });
}

// --- User Lookup ---

export interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  follower_count: number;
  following_count: number;
}

/**
 * Look up a Farcaster user by FID.
 * Uses caching headers for serverless optimization.
 */
export async function getUserByFid(fid: number): Promise<FarcasterUser> {
  const result = await neynarFetch<{ users: FarcasterUser[] }>(
    `/farcaster/user/bulk?fids=${fid}`,
    { next: { revalidate: 300 } } as RequestInit, // Cache for 5 min
  );

  const user = result.users[0];
  if (!user) throw new Error(`User not found: FID ${fid}`);
  return user;
}

export const neynar = {
  validateFrameMessage,
  getUserByFid,
};

export default neynar;
