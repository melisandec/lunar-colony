import { NextRequest, NextResponse } from "next/server";
import marketEngine from "@/lib/market-engine";
import type { ResourceType } from "@/lib/utils";

/**
 * GET /api/market
 * Returns market overview with all resource prices.
 * Optionally include playerId for personalized alerts.
 *
 * Query params:
 *   - playerId?: string  — include unread alerts for this player
 *   - resource?: string  — get details + history for one resource
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") ?? undefined;
    const resource = searchParams.get("resource") as ResourceType | null;

    // Single resource detail with history
    if (resource) {
      const [overview, history] = await Promise.all([
        marketEngine.getMarketOverview(playerId),
        marketEngine.getPriceHistory(resource, 50),
      ]);

      const entry = overview.resources.find((r) => r.type === resource);
      if (!entry) {
        return NextResponse.json(
          { error: "Resource not found" },
          { status: 404 },
        );
      }

      const depth = marketEngine.getMarketDepth(resource, entry.currentPrice);

      return NextResponse.json({
        resource: entry,
        history,
        depth,
        lastUpdated: overview.lastUpdated,
      });
    }

    // Full overview
    const overview = await marketEngine.getMarketOverview(playerId);

    return NextResponse.json(overview, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Market API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
