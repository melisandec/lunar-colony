import { NextRequest, NextResponse } from "next/server";
import { neynar } from "@/lib/api-clients/neynar";
import { GameState } from "@/lib/game-state";
import { frameResponseToHtml, type Screen } from "@/lib/frame-response";

/**
 * POST /api/game/[...action]
 * Handles game-action sub-routes (build, upgrade, trade, etc.)
 * Delegates to GameState for action dispatch and response building.
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
    let inputText: string | undefined;

    if (process.env.NODE_ENV === "production" && trustedData?.messageBytes) {
      const validation = await neynar.validateFrameMessage(
        trustedData.messageBytes,
      );
      if (!validation.valid) {
        return NextResponse.json({ error: "Invalid" }, { status: 401 });
      }
      fid = validation.action.fid;
      buttonIndex = validation.action.buttonIndex;
      inputText = validation.action.inputText;
    } else {
      fid = untrustedData?.fid || 1;
      buttonIndex = untrustedData?.buttonIndex || 1;
      inputText = untrustedData?.inputText;
    }

    // Load player state
    const gameState = await GameState.load(fid);

    // Map action paths to screens for the state machine
    const screenMap: Record<string, Screen> = {
      build: "build",
      market: "market",
      trade: "market",
      alliance: "alliance",
    };

    const currentScreen = screenMap[actionPath] ?? "home";

    // Dispatch through state machine
    const frameResponse = await gameState.handleAction({
      fid,
      buttonIndex,
      inputText,
      currentScreen,
    });

    const html = frameResponseToHtml(frameResponse);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Game action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
