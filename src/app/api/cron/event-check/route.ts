import { NextRequest, NextResponse } from "next/server";
import {
  processScheduledEvents,
  checkTriggeredEvents,
} from "@/lib/event-engine";
import { GameMetrics } from "@/lib/metrics";

/**
 * POST /api/cron/event-check
 *
 * Runs every hour (vercel.json: "0 * * * *").
 *
 * Jobs:
 *   1. Process scheduled events  — start/end time-based events
 *   2. Check triggered events    — activate condition-based events
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
    // Run scheduled then triggered sequentially (triggered may depend on
    // events that were just activated by the scheduled pass)
    const scheduled = await processScheduledEvents();
    const triggered = await checkTriggeredEvents();

    const durationMs = Date.now() - startTime;
    GameMetrics.trackCron("event-check", durationMs, {
      scheduled,
      triggered,
    });

    return NextResponse.json({
      success: true,
      durationMs,
      events: { scheduled, triggered },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;

    GameMetrics.trackError(error, { job: "event-check" }, "critical");
    GameMetrics.trackCron("event-check", durationMs, {
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
