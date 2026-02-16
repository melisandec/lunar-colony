import { NextRequest, NextResponse } from "next/server";
import { neynar } from "@/lib/api-clients/neynar";
import { GameState } from "@/lib/game-state";
import { frameResponseToHtml } from "@/lib/frame-response";
import marketEngine from "@/lib/market-engine";
import { validateTradeInput } from "@/lib/validation";
import type { ResourceType } from "@/lib/utils";
import { GameMetrics } from "@/lib/metrics";

/**
 * POST /api/market/trade
 * Execute a trade (buy or sell) for a player.
 *
 * Frame flow: validates Farcaster message, executes trade, returns result screen.
 *
 * Input text encodes: "<side> <quantity> <resource>"
 * e.g. "buy 10 REGOLITH" or "sell 5 HELIUM3"
 *
 * Button mapping:
 *   1 = Buy REGOLITH (quick trade)
 *   2 = Sell REGOLITH (quick trade)
 *   3 = Custom (uses input text)
 *   4 = Back to market
 */
export async function POST(req: NextRequest) {
  try {
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

    const gameState = await GameState.load(fid);

    // Back to market overview
    if (buttonIndex === 4) {
      const response = await gameState.handleAction({
        fid,
        buttonIndex: 3, // Market button on home
        currentScreen: "home",
      });
      return new NextResponse(frameResponseToHtml(response), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Quick trades (small fixed amount)
    const QUICK_TRADE_QTY = 10;
    let side: "buy" | "sell";
    let resource: ResourceType = "REGOLITH";
    let quantity = QUICK_TRADE_QTY;

    if (buttonIndex === 1) {
      side = "buy";
    } else if (buttonIndex === 2) {
      side = "sell";
    } else if (buttonIndex === 3 && inputText) {
      // Parse and validate custom trade from input text
      const parsed = validateTradeInput(inputText);
      if (!parsed) {
        const errorResponse = await gameState.handleAction({
          fid,
          buttonIndex: 3,
          currentScreen: "home",
        });
        return new NextResponse(frameResponseToHtml(errorResponse), {
          headers: { "Content-Type": "text/html" },
        });
      }
      side = parsed.side;
      resource = parsed.resource;
      quantity = parsed.quantity;
    } else {
      // Default: show market screen
      const response = await gameState.handleAction({
        fid,
        buttonIndex: 3,
        currentScreen: "home",
      });
      return new NextResponse(frameResponseToHtml(response), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Execute the trade
    const result = await marketEngine.executeTrade(
      gameState.getPlayerId(),
      resource,
      side,
      quantity,
    );

    // Build trade result screen via game state
    const frameResponse = gameState.buildTradeResultScreen(result);
    return new NextResponse(frameResponseToHtml(frameResponse), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    GameMetrics.trackError(error, {
      route: "/api/market/trade",
      context: "trade_execution",
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
