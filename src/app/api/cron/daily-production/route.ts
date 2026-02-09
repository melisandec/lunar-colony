import { NextRequest, NextResponse } from "next/server";
import { processProductionCycle } from "@/lib/production-engine";
import {
  refreshAllPlayerSummaries,
  refreshLeaderboard,
} from "@/lib/database/queries";
import { GameMetrics } from "@/lib/metrics";

/**
 * POST /api/cron/daily-production
 *
 * Runs once daily at midnight UTC (vercel.json: "0 0 * * *").
 *
 * Jobs:
 *   1. Production cycle — batch-credit all active players
 *   2. Refresh denormalized player summaries
 *   3. Refresh leaderboard
 *
 * Protected by CRON_SECRET header validation.
 */
export async function POST(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const safetyTimeout = setTimeout(() => controller.abort(), 50_000);

  try {
    // 1. Production cycle
    const productionResult = await processProductionCycle({
      batchSize: 100,
      playerTimeoutMs: 5_000,
      signal: controller.signal,
    });

    // 2. Refresh summaries (sequential to avoid DB contention)
    const summaryResult = await refreshAllPlayerSummaries({
      batchSize: 200,
      signal: controller.signal,
    }).catch((e) => {
      GameMetrics.trackError(e, { job: "daily-production", step: "summaries" });
      return { refreshed: 0, durationMs: 0 };
    });

    // 3. Refresh leaderboard
    const leaderboardResult = await refreshLeaderboard("ALLTIME", 100).catch(
      (e) => {
        GameMetrics.trackError(e, {
          job: "daily-production",
          step: "leaderboard",
        });
        return { entries: 0, durationMs: 0 };
      },
    );

    clearTimeout(safetyTimeout);

    const durationMs = Date.now() - startTime;
    GameMetrics.trackCron("daily-production", durationMs, {
      production: productionResult,
      summaries: summaryResult,
      leaderboard: leaderboardResult,
      aborted: controller.signal.aborted,
    });

    return NextResponse.json({
      success: true,
      durationMs,
      production: productionResult,
      summaries: summaryResult,
      leaderboard: leaderboardResult,
      aborted: controller.signal.aborted,
    });
  } catch (error) {
    clearTimeout(safetyTimeout);
    const durationMs = Date.now() - startTime;

    GameMetrics.trackError(error, { job: "daily-production" }, "critical");
    GameMetrics.trackCron("daily-production", durationMs, {
      error: error instanceof Error ? error.message : "Unknown",
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
      { status: 500 },
    );
  }
}
