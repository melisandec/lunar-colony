import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "@vercel/og";
import { neynar } from "@/lib/api-clients/neynar";
import gameEngine from "@/lib/game-engine";
import {
  absoluteUrl,
  frameHtmlResponse,
  FRAME_IMAGE,
  formatLunar,
} from "@/lib/utils";

/**
 * GET /api/frames
 * Returns the initial Frame HTML with the landing image.
 */
export async function GET() {
  const html = frameHtmlResponse({
    imageUrl: absoluteUrl("/api/frames?img=landing"),
    postUrl: absoluteUrl("/api/frames"),
    buttons: [
      { label: "🚀 Play Now", action: "post" },
      { label: "📊 Leaderboard", action: "post" },
    ],
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * POST /api/frames
 * Handles all Frame button interactions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trustedData, untrustedData } = body;

    // Validate the Frame message via Neynar
    let fid: number;
    let buttonIndex: number;

    if (process.env.NODE_ENV === "production" && trustedData?.messageBytes) {
      const validation = await neynar.validateFrameMessage(
        trustedData.messageBytes,
      );

      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid Frame message" },
          { status: 401 },
        );
      }

      fid = validation.action.fid;
      buttonIndex = validation.action.buttonIndex;
    } else {
      // Development: use untrusted data
      fid = untrustedData?.fid || 1;
      buttonIndex = untrustedData?.buttonIndex || 1;
    }

    // Get or create the player
    const player = await gameEngine.getOrCreatePlayer(fid);
    const state = gameEngine.calculateColonyState(player);

    // Route based on button pressed
    switch (buttonIndex) {
      case 1: {
        // "Play Now" or "Collect" - show colony view
        const earnings = await gameEngine.collectEarnings(state.playerId);

        const html = frameHtmlResponse({
          imageUrl: absoluteUrl(
            `/api/frames?img=colony&fid=${fid}&collected=${earnings.collected}`,
          ),
          postUrl: absoluteUrl("/api/frames"),
          buttons: [
            { label: "💰 Collect", action: "post" },
            { label: "🔨 Build", action: "post" },
            { label: "📊 Stats", action: "post" },
          ],
        });

        return new NextResponse(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      case 2: {
        // "Build" or "Leaderboard"
        const html = frameHtmlResponse({
          imageUrl: absoluteUrl(`/api/frames?img=build&fid=${fid}`),
          postUrl: absoluteUrl("/api/game/build"),
          buttons: [
            { label: "⚡ Solar Panel", action: "post" },
            { label: "⛏️ Mining Rig", action: "post" },
            { label: "🏠 Habitat", action: "post" },
            { label: "🔙 Back", action: "post" },
          ],
        });

        return new NextResponse(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      case 3: {
        // "Stats" view
        const html = frameHtmlResponse({
          imageUrl: absoluteUrl(`/api/frames?img=stats&fid=${fid}`),
          postUrl: absoluteUrl("/api/frames"),
          buttons: [{ label: "🔙 Back to Colony", action: "post" }],
        });

        return new NextResponse(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      default: {
        // Fallback to landing
        return GET();
      }
    }
  } catch (error) {
    console.error("Frame POST error:", error);
    return GET(); // Fallback to landing on error
  }
}

// --- Dynamic Frame Image Generation ---

/**
 * Frame image generation endpoint.
 * Query params: ?img=landing|colony|build|stats&fid=XXX
 */
export async function generateImage(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageType = searchParams.get("img") || "landing";
  const fid = searchParams.get("fid");
  void fid; // used in colony/stats image generation (upcoming)

  // Landing screen image
  if (imageType === "landing") {
    return new ImageResponse(
      <div
        style={{
          width: FRAME_IMAGE.WIDTH,
          height: FRAME_IMAGE.HEIGHT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: "bold", display: "flex" }}>
          🌙 Lunar Colony Tycoon
        </div>
        <div
          style={{
            fontSize: 28,
            marginTop: 16,
            opacity: 0.8,
            display: "flex",
          }}
        >
          Build your lunar empire. Earn $LUNAR.
        </div>
        <div
          style={{
            fontSize: 20,
            marginTop: 32,
            padding: "12px 24px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: 12,
            display: "flex",
          }}
        >
          Press 🚀 Play Now to begin
        </div>
      </div>,
      { width: FRAME_IMAGE.WIDTH, height: FRAME_IMAGE.HEIGHT },
    );
  }

  // Colony view (placeholder)
  const collected = searchParams.get("collected") || "0";

  return new ImageResponse(
    <div
      style={{
        width: FRAME_IMAGE.WIDTH,
        height: FRAME_IMAGE.HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 36, fontWeight: "bold", display: "flex" }}>
        🏗️ Your Lunar Colony
      </div>
      {collected !== "0" && (
        <div
          style={{
            fontSize: 24,
            color: "#4ade80",
            marginTop: 8,
            display: "flex",
          }}
        >
          +{formatLunar(Number(collected))} collected!
        </div>
      )}
      <div
        style={{
          fontSize: 20,
          marginTop: 24,
          opacity: 0.7,
          display: "flex",
        }}
      >
        Colony view coming soon...
      </div>
    </div>,
    { width: FRAME_IMAGE.WIDTH, height: FRAME_IMAGE.HEIGHT },
  );
}
