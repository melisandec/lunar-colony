import { NextRequest, NextResponse } from "next/server";
import { processProductionCycle } from "@/lib/production-engine";
import { GAME_CONSTANTS } from "@/lib/utils";

/**
 * POST /api/cron
 * Protected daily production cycle endpoint.
 *
 * Runs the full batch production calculator for all active players:
 *   - Cursor-based batching (100 players/batch)
 *   - Per-player 5 s timeout
 *   - Idempotent via ProductionLog @@unique([playerId, date, resource])
 *   - Structured logging via GameEvent
 *
 * Protected by CRON_SECRET in middleware.ts.
 *
 * Vercel cron config (vercel.json):
 * "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }]
 */
export async function POST(_req: NextRequest) {
  const startTime = Date.now();

  try {
    // AbortController lets us stop cleanly if we approach the function timeout
    const controller = new AbortController();

    // Vercel serverless max is 60 s; stop processing at 50 s to allow cleanup
    const safetyTimeout = setTimeout(() => controller.abort(), 50_000);

    const result = await processProductionCycle({
      batchSize: 100,
      playerTimeoutMs: 5_000,
      signal: controller.signal,
    });

    clearTimeout(safetyTimeout);

    return NextResponse.json({
      success: true,
      ...result,
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
