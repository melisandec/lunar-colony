import { NextRequest, NextResponse } from "next/server";
import eventEngine from "@/lib/event-engine";

/**
 * GET /api/events/[eventId]
 * Returns detailed information about a specific event including leaderboard.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;

    const detail = await eventEngine.getEventDetail(eventId);
    if (!detail) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(detail, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Event detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
