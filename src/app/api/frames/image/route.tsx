/**
 * GET /api/frames/image
 *
 * Dynamic OG image generation endpoint for Frame responses.
 * Query params determine which screen image to render.
 *
 * Cached at the Vercel edge via Cache-Control headers.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateFrameImage } from "@/lib/frame-images";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageResponse = generateFrameImage(searchParams);

    // Edge-cache generated images for 60s, stale-while-revalidate for 5min
    const headers = new Headers(imageResponse.headers);
    headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );

    return new NextResponse(imageResponse.body, {
      status: imageResponse.status,
      headers,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
