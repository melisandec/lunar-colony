/**
 * Frame Image Cache — Pre-generates and caches common screen states
 * for faster mobile frame viewing.
 *
 * Uses an in-memory LRU cache with TTL to serve frequently-accessed
 * frame images without re-rendering on every request.
 */

// ---------------------------------------------------------------------------
// LRU Cache
// ---------------------------------------------------------------------------

interface CacheEntry {
  buffer: ArrayBuffer;
  contentType: string;
  createdAt: number;
  size: number;
}

const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 60_000; // 1 minute

class FrameImageCache {
  private cache = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES, ttlMs = DEFAULT_TTL_MS) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /** Get a cached image by key. Returns null if not found or expired. */
  get(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  /** Store an image in the cache */
  set(key: string, buffer: ArrayBuffer, contentType = "image/png") {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    this.cache.set(key, {
      buffer,
      contentType,
      createdAt: Date.now(),
      size: buffer.byteLength,
    });
  }

  /** Generate a cache key from URL search params */
  static keyFromParams(params: URLSearchParams): string {
    // Sort params for consistent keying
    const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted.map(([k, v]) => `${k}=${v}`).join("&");
  }

  /** Check if key exists and is valid */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Total cached bytes */
  get totalBytes(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  /** Number of cached entries */
  get size(): number {
    return this.cache.size;
  }

  /** Clear the entire cache */
  clear() {
    this.cache.clear();
  }

  /** Get cache statistics */
  stats() {
    return {
      entries: this.cache.size,
      totalKB: Math.round(this.totalBytes / 1024),
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _cache: FrameImageCache | null = null;

export function getFrameImageCache(): FrameImageCache {
  if (!_cache) {
    _cache = new FrameImageCache();
  }
  return _cache;
}

// ---------------------------------------------------------------------------
// Common screen states to pre-generate
// ---------------------------------------------------------------------------

/** Screens that are most commonly viewed and worth pre-caching */
export const PREGENERATE_SCREENS = [
  "landing",
  "home",
  "colony",
  "market",
  "build",
] as const;

/**
 * Pre-generate common frame images during server startup or first request.
 * Call this from a warm-up route or cron job.
 */
export async function pregenerateCommonFrames(
  generateFn: (params: URLSearchParams) => Response,
) {
  const cache = getFrameImageCache();

  // Pre-generate landing and generic screens
  for (const screen of PREGENERATE_SCREENS) {
    const params = new URLSearchParams({ screen, fid: "0" });
    const key = FrameImageCache.keyFromParams(params);

    if (!cache.has(key)) {
      try {
        const response = generateFn(params);
        const buffer = await response.arrayBuffer();
        cache.set(key, buffer);
      } catch (e) {
        console.warn(`[frame-cache] Failed to pre-generate ${screen}:`, e);
      }
    }
  }
}

export { FrameImageCache };
