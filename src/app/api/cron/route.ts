import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database";
import { GAME_CONSTANTS } from "@/lib/utils";

/**
 * POST /api/cron
 * Protected endpoint for scheduled game ticks.
 *
 * This processes all active colonies, calculating resource production
 * and updating balances. Designed to be called by Vercel Cron or
 * an external scheduler.
 *
 * Protected by CRON_SECRET in middleware.ts.
 *
 * Vercel cron config (vercel.json):
 * "crons": [{ "path": "/api/cron", "schedule": "every 5 minutes" }]
 */
export async function POST(_req: NextRequest) {
  const startTime = Date.now();

  try {
    // Get all active colonies with their modules
    const colonies = await prisma.colony.findMany({
      where: {
        modules: {
          some: { isActive: true },
        },
      },
      include: {
        player: { select: { id: true, fid: true } },
        modules: {
          where: { isActive: true },
          select: { productionRate: true },
        },
      },
    });

    let processedCount = 0;
    let totalLunarProduced = 0;

    // Process in batches for serverless optimization
    const BATCH_SIZE = 50;

    for (let i = 0; i < colonies.length; i += BATCH_SIZE) {
      const batch = colonies.slice(i, i + BATCH_SIZE);

      const updates = batch.map((colony) => {
        const productionRate = colony.modules.reduce(
          (sum, m) => sum + m.productionRate,
          0,
        );

        // Calculate ticks since last update
        const msElapsed = Date.now() - colony.lastTick.getTime();
        const ticks = msElapsed / GAME_CONSTANTS.TICK_INTERVAL_MS;
        const earnings = Math.floor(ticks * productionRate);

        if (earnings <= 0) return null;

        totalLunarProduced += earnings;
        processedCount++;

        return prisma.$transaction([
          prisma.player.update({
            where: { id: colony.player.id },
            data: { lunarBalance: { increment: earnings } },
          }),
          prisma.colony.update({
            where: { id: colony.id },
            data: { lastTick: new Date() },
          }),
        ]);
      });

      // Execute batch (filter nulls)
      await Promise.all(updates.filter(Boolean));
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: processedCount,
      totalColonies: colonies.length,
      totalLunarProduced,
      durationMs: duration,
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
