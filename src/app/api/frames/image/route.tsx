/**
 * GET /api/frames/image
 *
 * Dynamic OG image generation endpoint for Frame responses.
 * Query params determine which screen image to render.
 *
 * Uses the design-system image pipeline for caching and size validation.
 * Supports mobile-optimized dimensions via UA detection.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateFrameImage } from "@/lib/frame-images";
import { wrapImageResponse } from "@/lib/design";
import { getFrameImageCache, FrameImageCache } from "@/lib/frame-cache";
import { isMobileRequest, MOBILE_CACHE_HEADERS } from "@/lib/mobile-images";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ua = req.headers.get("user-agent");
    const mobile = isMobileRequest(ua);

    // Check the in-memory cache first
    const cache = getFrameImageCache();
    const cacheKey = FrameImageCache.keyFromParams(searchParams);
    const cached = cache.get(cacheKey);

    if (cached) {
      const headers = new Headers();
      headers.set("Content-Type", cached.contentType);
      headers.set("X-Cache", "HIT");
      headers.set("X-Image-Size", String(cached.size));
      // Mobile gets longer cache TTL
      if (mobile) {
        for (const [k, v] of Object.entries(MOBILE_CACHE_HEADERS)) {
          headers.set(k, v);
        }
      } else {
        headers.set(
          "Cache-Control",
          "public, s-maxage=60, stale-while-revalidate=300",
        );
      }
      return new NextResponse(cached.buffer, { status: 200, headers });
    }

    // Generate the image
    const imageResponse = generateFrameImage(searchParams);

    // Wrap with cache headers, size validation, and content-type
    const wrapped = await wrapImageResponse(imageResponse, req);

    // Store in cache for subsequent requests
    try {
      const cloned = wrapped.clone();
      const buffer = await cloned.arrayBuffer();
      cache.set(cacheKey, buffer);
    } catch {
      // Cache storage failed — non-critical
    }

    // Add mobile-specific headers
    if (mobile) {
      for (const [k, v] of Object.entries(MOBILE_CACHE_HEADERS)) {
        wrapped.headers.set(k, v);
      }
    }
    wrapped.headers.set("X-Cache", "MISS");

    return wrapped;
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
