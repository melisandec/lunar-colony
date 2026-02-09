/**
 * GET /api/frames/image
 *
 * Dynamic OG image generation endpoint for Frame responses.
 * Query params determine which screen image to render.
 *
 * Uses the design-system image pipeline for caching and size validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateFrameImage } from "@/lib/frame-images";
import { wrapImageResponse } from "@/lib/design";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageResponse = generateFrameImage(searchParams);

    // Wrap with cache headers, size validation, and content-type
    return wrapImageResponse(imageResponse, req);
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
