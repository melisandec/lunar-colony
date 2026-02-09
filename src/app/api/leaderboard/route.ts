import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getPlayerRank } from "@/lib/database/queries";

/**
 * GET /api/leaderboard
 * Returns cached leaderboard data (sub-10ms reads).
 *
 * Query params:
 *   - period: "DAILY" | "WEEKLY" | "ALLTIME" (default: ALLTIME)
 *   - limit: number (default: 50, max: 100)
 *   - fid: number (optional — include player's rank)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const period = (searchParams.get("period") ?? "ALLTIME") as
      | "DAILY"
      | "WEEKLY"
      | "ALLTIME";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const fid = searchParams.get("fid")
      ? Number(searchParams.get("fid"))
      : null;

    const [entries, playerRank] = await Promise.all([
      getLeaderboard(period, limit),
      fid ? getPlayerRank(fid, period) : Promise.resolve(null),
    ]);

    return NextResponse.json(
      {
        period,
        entries,
        playerRank,
        count: entries.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
