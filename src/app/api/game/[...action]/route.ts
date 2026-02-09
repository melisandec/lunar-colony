import { NextRequest, NextResponse } from "next/server";
import { neynar } from "@/lib/api-clients/neynar";
import gameEngine from "@/lib/game-engine";
import { absoluteUrl, frameHtmlResponse, type ModuleType } from "@/lib/utils";

/**
 * POST /api/game/[...action]
 * Handles game action endpoints (build, upgrade, etc.)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const { action } = await params;
    const actionPath = action.join("/");
    const body = await req.json();
    const { trustedData, untrustedData } = body;

    // Validate
    let fid: number;
    let buttonIndex: number;

    if (process.env.NODE_ENV === "production" && trustedData?.messageBytes) {
      const validation = await neynar.validateFrameMessage(
        trustedData.messageBytes,
      );
      if (!validation.valid) {
        return NextResponse.json({ error: "Invalid" }, { status: 401 });
      }
      fid = validation.action.fid;
      buttonIndex = validation.action.buttonIndex;
    } else {
      fid = untrustedData?.fid || 1;
      buttonIndex = untrustedData?.buttonIndex || 1;
    }

    const player = await gameEngine.getOrCreatePlayer(fid);

    // --- Build Action ---
    if (actionPath === "build") {
      // Button 4 = Back
      if (buttonIndex === 4) {
        const html = frameHtmlResponse({
          imageUrl: absoluteUrl(
            `/api/frames?img=colony&fid=${fid}&collected=0`,
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

      // Map buttons to module types
      const moduleMap: Record<number, ModuleType> = {
        1: "SOLAR_PANEL",
        2: "MINING_RIG",
        3: "HABITAT",
      };

      const moduleType = moduleMap[buttonIndex];
      if (!moduleType) {
        return NextResponse.json(
          { error: "Invalid selection" },
          { status: 400 },
        );
      }

      const result = await gameEngine.buildModule(player.id, moduleType);

      const html = frameHtmlResponse({
        imageUrl: absoluteUrl(
          `/api/frames?img=build_result&fid=${fid}&success=${result.success}&module=${moduleType}&error=${encodeURIComponent(result.error || "")}`,
        ),
        postUrl: absoluteUrl("/api/game/build"),
        buttons: result.success
          ? [
              { label: "🔨 Build More", action: "post" },
              { label: "🔙 Colony", action: "post" },
            ]
          : [{ label: "🔙 Back", action: "post" }],
      });

      return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // --- Unknown action fallback ---
    return NextResponse.json(
      { error: `Unknown action: ${actionPath}` },
      { status: 404 },
    );
  } catch (error) {
    console.error("Game action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
