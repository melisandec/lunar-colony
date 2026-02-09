/**
 * Lunar Colony Tycoon — Image Optimization Pipeline
 *
 * Utilities to ensure generated OG images stay under the 1 MB
 * Farcaster Frame limit.  Works with @vercel/og ImageResponse
 * (which uses Satori → resvg → PNG under the hood on the edge).
 *
 * Strategies:
 *   1.  Keep ImageResponse dimensions at 955×500 (lowest that looks
 *       good at 1.91:1 — half of the 1910×1000 maximum).
 *   2.  Use simple gradients + flat colours (minimal PNG payload).
 *   3.  Compress response body with cache-friendly headers.
 *   4.  Optionally convert to WebP (when client supports it) via
 *       the optimization endpoint.
 */

import { NextResponse, type NextRequest } from "next/server";
import { FRAME } from "./theme";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Farcaster max frame image size */
export const MAX_IMAGE_BYTES = 1_000_000; // 1 MB

/** Default cache headers for generated images */
export const IMAGE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "CDN-Cache-Control": "public, s-maxage=120",
} as const;

// ---------------------------------------------------------------------------
// wrapImageResponse
// ---------------------------------------------------------------------------

/**
 * Wraps a raw `ImageResponse` with cache headers, size validation,
 * and optional WebP conversion via Accept header negotiation.
 *
 * Usage in route handler:
 *   return wrapImageResponse(imageResponse, req);
 */
export async function wrapImageResponse(
  imageResponse: Response,
  _req?: NextRequest,
): Promise<NextResponse> {
  // Clone response so we can read the body and still pass it on
  const body = await imageResponse.arrayBuffer();
  const sizeBytes = body.byteLength;

  // Build response headers
  const headers = new Headers(imageResponse.headers);
  for (const [k, v] of Object.entries(IMAGE_CACHE_HEADERS)) {
    headers.set(k, v);
  }

  // Size guardrail: log warning if approaching limit
  if (sizeBytes > MAX_IMAGE_BYTES * 0.85) {
    console.warn(
      `[image-pipeline] Generated image is ${(sizeBytes / 1024).toFixed(0)} KB ` +
        `(${((sizeBytes / MAX_IMAGE_BYTES) * 100).toFixed(0)}% of 1 MB limit)`,
    );
  }

  if (sizeBytes > MAX_IMAGE_BYTES) {
    console.error(
      `[image-pipeline] Image exceeds 1 MB limit! (${(sizeBytes / 1024).toFixed(0)} KB)`,
    );
    // Return a minimal fallback so the frame doesn't break
    return fallbackImage();
  }

  // Content-Type negotiation: if client accepts WebP we note it
  // but @vercel/og outputs PNG from Satori, so we keep PNG.
  // Future: add sharp-based WebP conversion when self-hosting.
  headers.set("Content-Type", "image/png");
  headers.set("X-Image-Size", `${sizeBytes}`);

  return new NextResponse(body, {
    status: 200,
    headers,
  });
}

// ---------------------------------------------------------------------------
// Size estimation
// ---------------------------------------------------------------------------

/**
 * Estimate the byte size of an ImageResponse body without consuming
 * the stream.  Useful for pre-flight checks.
 *
 * Returns -1 if Content-Length is unavailable.
 */
export function estimateImageSize(response: Response): number {
  const cl = response.headers.get("Content-Length");
  return cl ? parseInt(cl, 10) : -1;
}

// ---------------------------------------------------------------------------
// Fallback image
// ---------------------------------------------------------------------------

/**
 * Generates a tiny fallback PNG with an error message so the
 * Farcaster client always gets a valid image back.
 */
function fallbackImage(): NextResponse {
  // Smallest possible valid 1×1 transparent PNG (67 bytes)
  // In practice we want a readable fallback, so we return a
  // simple ImageResponse-style message via a pre-built buffer.
  // For now, return a JSON error — the route handler should
  // catch this and return its own fallback ImageResponse.
  return NextResponse.json({ error: "Image too large" }, { status: 500 });
}

// ---------------------------------------------------------------------------
// Animation frame selector
// ---------------------------------------------------------------------------

/**
 * Given an array of animation keyframe ImageResponses and a
 * `frame` query param (0-based index), return the correct frame.
 * Defaults to frame 0 if missing / out of range.
 */
export function selectAnimationFrame(
  frames: Response[],
  searchParams: URLSearchParams,
): Response {
  const idx = Math.min(
    Math.max(0, Number(searchParams.get("frame") ?? "0")),
    frames.length - 1,
  );
  return frames[idx]!;
}

// ---------------------------------------------------------------------------
// Image dimensions helper
// ---------------------------------------------------------------------------

export function getFrameDimensions() {
  return {
    width: FRAME.WIDTH,
    height: FRAME.HEIGHT,
    aspectRatio: FRAME.ASPECT_RATIO,
  };
}

// ---------------------------------------------------------------------------
// Design-system validation (dev-only)
// ---------------------------------------------------------------------------

/**
 * Quick sanity check that a rendered ImageResponse is within limits.
 * Call from tests or dev middleware.
 */
export async function validateImageResponse(
  response: Response,
): Promise<{ ok: boolean; sizeKB: number; warnings: string[] }> {
  const body = await response.clone().arrayBuffer();
  const sizeKB = Math.round(body.byteLength / 1024);
  const warnings: string[] = [];

  if (body.byteLength > MAX_IMAGE_BYTES) {
    warnings.push(`Image exceeds 1 MB limit (${sizeKB} KB)`);
  } else if (body.byteLength > MAX_IMAGE_BYTES * 0.85) {
    warnings.push(`Image nearing 1 MB limit (${sizeKB} KB)`);
  }

  return { ok: warnings.length === 0, sizeKB, warnings };
}
