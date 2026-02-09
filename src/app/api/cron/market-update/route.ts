import { NextRequest, NextResponse } from "next/server";
import { runMarketTick } from "@/lib/market-engine";
import { GameMetrics } from "@/lib/metrics";

/**
 * POST /api/cron/market-update
 *
 * Runs every 15 minutes (vercel.json: "* /15 * * * *").
 *
 * Jobs:
 *   1. Market tick — update resource prices, record history, create alerts
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

  try {
    const marketResult = await runMarketTick();

    const durationMs = Date.now() - startTime;
    GameMetrics.trackCron("market-update", durationMs, {
      market: marketResult,
    });

    return NextResponse.json({
      success: true,
      durationMs,
      market: marketResult,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    GameMetrics.trackError(error, { job: "market-update" }, "critical");
    GameMetrics.trackCron("market-update", durationMs, {
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
