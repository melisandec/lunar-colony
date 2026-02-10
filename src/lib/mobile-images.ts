/**
 * Mobile-optimized image utilities for Frame rendering.
 *
 * Strategies for staying under the 1 MB Frame image limit on mobile:
 * 1. Serve smaller dimensions for known mobile user-agents
 * 2. Optimize color palettes and gradients
 * 3. Cache aggressively with content-aware keys
 * 4. Use vector-like rendering (flat colors, gradients)
 */

import { FRAME_IMAGE } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Mobile-optimized dimensions (same aspect ratio, fewer pixels) */
export const MOBILE_FRAME = {
  WIDTH: 764, // ~80% of standard 955
  HEIGHT: 400, // maintains 1.91:1
} as const;

/** Aggressive cache headers for mobile-optimized images */
export const MOBILE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, s-maxage=300",
  Vary: "Accept, User-Agent",
} as const;

// ---------------------------------------------------------------------------
// User-Agent detection for frame requests
// ---------------------------------------------------------------------------

const MOBILE_UA_PATTERNS = [
  /iPhone|iPod/i,
  /Android.*Mobile/i,
  /Warpcast/i,
  /Farcaster/i,
  /FBAN|FBAV/i, // Facebook in-app browser
  /Instagram/i,
];

/**
 * Check if a request comes from a mobile device based on User-Agent.
 * Used server-side in frame image routes.
 */
export function isMobileRequest(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Get optimal image dimensions based on request context.
 */
export function getOptimalDimensions(userAgent: string | null): {
  width: number;
  height: number;
} {
  if (isMobileRequest(userAgent)) {
    return { width: MOBILE_FRAME.WIDTH, height: MOBILE_FRAME.HEIGHT };
  }
  return { width: FRAME_IMAGE.WIDTH, height: FRAME_IMAGE.HEIGHT };
}

// ---------------------------------------------------------------------------
// Color optimization
// ---------------------------------------------------------------------------

/**
 * Reduce gradient complexity for mobile rendering.
 * Fewer gradient stops = smaller PNG output.
 */
export function simplifyGradient(
  stops: Array<{ color: string; position: number }>,
  maxStops = 3,
): Array<{ color: string; position: number }> {
  if (stops.length <= maxStops) return stops;

  // Keep first, last, and evenly-spaced middle stops
  const result: Array<{ color: string; position: number }> = [stops[0]!];
  const step = (stops.length - 1) / (maxStops - 1);
  for (let i = 1; i < maxStops - 1; i++) {
    result.push(stops[Math.round(i * step)]!);
  }
  result.push(stops[stops.length - 1]!);
  return result;
}

// ---------------------------------------------------------------------------
// SVG-based optimizations
// ---------------------------------------------------------------------------

/**
 * Generate a minimal SVG data URI for use as a placeholder.
 * Much smaller than rasterized placeholders.
 */
export function svgPlaceholder(
  width: number,
  height: number,
  bgColor = "#0a0a1a",
  text = "Loading...",
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6366f1" font-family="sans-serif" font-size="24">${text}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Generate a blur-hash style placeholder as a data URI.
 * Uses a tiny SVG with a gradient that mimics the image.
 */
export function gradientPlaceholder(
  width: number,
  height: number,
  colors: [string, string] = ["#020617", "#0f172a"],
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colors[0]}"/>
      <stop offset="100%" stop-color="${colors[1]}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------------------
// Progressive loading strategy
// ---------------------------------------------------------------------------

export interface ProgressiveImageConfig {
  /** Tiny placeholder (SVG data URI) */
  placeholder: string;
  /** Low-quality image URL (for poor connections) */
  lowQualityUrl: string;
  /** Full-quality image URL */
  fullUrl: string;
  /** Dimensions */
  width: number;
  height: number;
}

/**
 * Build a progressive loading config for a frame image.
 * Provides: placeholder → low-quality → full-quality chain.
 */
export function buildProgressiveConfig(
  baseUrl: string,
  screen: string,
  params: Record<string, string> = {},
): ProgressiveImageConfig {
  const query = new URLSearchParams({ screen, ...params });
  const lowQuery = new URLSearchParams({ screen, ...params, quality: "low" });

  return {
    placeholder: gradientPlaceholder(FRAME_IMAGE.WIDTH, FRAME_IMAGE.HEIGHT),
    lowQualityUrl: `${baseUrl}/api/frames/image?${lowQuery}`,
    fullUrl: `${baseUrl}/api/frames/image?${query}`,
    width: FRAME_IMAGE.WIDTH,
    height: FRAME_IMAGE.HEIGHT,
  };
}

// ---------------------------------------------------------------------------
// Lazy loading intersection observer factory
// ---------------------------------------------------------------------------

/**
 * Create an IntersectionObserver that loads frame images just before
 * they enter the viewport. Returns cleanup function.
 */
export function createFrameLazyLoader(rootMargin = "200px"): {
  observe: (el: HTMLElement, loadFn: () => void) => void;
  disconnect: () => void;
} {
  if (typeof IntersectionObserver === "undefined") {
    // Fallback: load immediately
    return {
      observe: (_el, loadFn) => loadFn(),
      disconnect: () => {},
    };
  }

  const callbacks = new Map<Element, () => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const cb = callbacks.get(entry.target);
          cb?.();
          callbacks.delete(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin },
  );

  return {
    observe: (el, loadFn) => {
      callbacks.set(el, loadFn);
      observer.observe(el);
    },
    disconnect: () => {
      observer.disconnect();
      callbacks.clear();
    },
  };
}
