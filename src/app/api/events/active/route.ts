import { NextRequest, NextResponse } from "next/server";
import eventEngine from "@/lib/event-engine";

/**
 * GET /api/events/active
 * Returns all currently active + pending events.
 *
 * Query params:
 *   - playerId?: string  — include player-specific participation data
 *   - include?: "recent" — also include recently completed events
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId") ?? undefined;
    const includeRecent = searchParams.get("include") === "recent";

    const active = await eventEngine.getActiveEvents(playerId);

    let recent: Awaited<ReturnType<typeof eventEngine.getRecentEvents>> = [];
    if (includeRecent) {
      recent = await eventEngine.getRecentEvents(5);
    }

    return NextResponse.json(
      {
        active,
        recent: includeRecent ? recent : undefined,
        count: active.length,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Events API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
