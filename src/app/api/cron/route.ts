import { NextRequest, NextResponse } from "next/server";
import { processProductionCycle } from "@/lib/production-engine";
import { runMarketTick } from "@/lib/market-engine";
import {
  processScheduledEvents,
  checkTriggeredEvents,
} from "@/lib/event-engine";
import {
  refreshAllPlayerSummaries,
  refreshLeaderboard,
} from "@/lib/database/queries";
import { GAME_CONSTANTS } from "@/lib/utils";

/**
 * POST /api/cron
 * Protected daily production + market tick endpoint.
 *
 * Runs two jobs:
 *   1. Production cycle — batch credits for all active players
 *   2. Market tick — updates resource prices, records history, creates alerts
 *
 * Both are idempotent and safe to re-run.
 *
 * Protected by CRON_SECRET in middleware.ts.
 *
 * Vercel cron config (vercel.json):
 * schedule: every 15 minutes
 */
export async function POST(_req: NextRequest) {
  const startTime = Date.now();

  try {
    // AbortController lets us stop cleanly if we approach the function timeout
    const controller = new AbortController();

    // Vercel serverless max is 60 s; stop processing at 50 s to allow cleanup
    const safetyTimeout = setTimeout(() => controller.abort(), 50_000);

    // Run production cycle + market tick + event processing in parallel
    const [productionResult, marketResult, eventResult] = await Promise.all([
      processProductionCycle({
        batchSize: 100,
        playerTimeoutMs: 5_000,
        signal: controller.signal,
      }),
      runMarketTick(),
      processScheduledEvents().then((scheduled) =>
        checkTriggeredEvents().then((triggered) => ({
          scheduled,
          triggered,
        })),
      ),
    ]);

    clearTimeout(safetyTimeout);

    // Post-production: refresh denormalized summaries + leaderboard
    // These run sequentially after main jobs to avoid contention
    const summaryResult = await refreshAllPlayerSummaries({
      batchSize: 200,
      signal: controller.signal,
    }).catch((e) => {
      console.error("Summary refresh error:", e);
      return { refreshed: 0, durationMs: 0 };
    });

    const leaderboardResult = await refreshLeaderboard("ALLTIME", 100).catch(
      (e) => {
        console.error("Leaderboard refresh error:", e);
        return { entries: 0, durationMs: 0 };
      },
    );

    return NextResponse.json({
      success: true,
      production: productionResult,
      market: marketResult,
      events: eventResult,
      summaries: summaryResult,
      leaderboard: leaderboardResult,
      aborted: controller.signal.aborted,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron
 * Health check for the cron endpoint.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "cron",
    tickInterval: `${GAME_CONSTANTS.TICK_INTERVAL_MS / 1000}s`,
  });
}
