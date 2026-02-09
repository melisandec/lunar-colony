import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database";
import { GAME_CONSTANTS } from "@/lib/utils";

/**
 * POST /api/cron
 * Protected endpoint for scheduled game ticks.
 *
 * Processes all active players, calculating per-module resource production
 * and crediting $LUNAR balances. Designed for Vercel Cron / external scheduler.
 *
 * Protected by CRON_SECRET in middleware.ts.
 *
 * Vercel cron config (vercel.json):
 * "crons": [{ "path": "/api/cron", "schedule": "every 5 minutes" }]
 */
export async function POST(_req: NextRequest) {
  const startTime = Date.now();

  try {
    // Players that have at least one active, non-deleted module
    const players = await prisma.player.findMany({
      where: {
        deletedAt: null,
        modules: { some: { isActive: true, deletedAt: null } },
      },
      include: {
        modules: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            baseOutput: true,
            bonusOutput: true,
            efficiency: true,
            lastCollectedAt: true,
          },
        },
      },
    });

    let processedCount = 0;
    let totalLunarProduced = 0;
    const now = new Date();

    // Process in batches for serverless optimization
    const BATCH_SIZE = 50;

    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);

      const updates = batch.map((player) => {
        // Sum earnings across all active modules since their individual lastCollectedAt
        let earnings = 0;

        for (const m of player.modules) {
          const base = Number(m.baseOutput);
          const bonus = Number(m.bonusOutput);
          const eff = Number(m.efficiency) / 100;
          const rate = (base + bonus) * eff;

          const msElapsed = now.getTime() - m.lastCollectedAt.getTime();
          const ticks = msElapsed / GAME_CONSTANTS.TICK_INTERVAL_MS;
          earnings += Math.floor(ticks * rate);
        }

        if (earnings <= 0) return null;

        totalLunarProduced += earnings;
        processedCount++;

        return prisma.$transaction([
          prisma.player.update({
            where: { id: player.id },
            data: {
              lunarBalance: { increment: earnings },
              totalEarnings: { increment: earnings },
              lastActive: now,
              version: { increment: 1 },
            },
          }),
          // Reset lastCollectedAt on processed modules
          ...player.modules.map((m) =>
            prisma.module.update({
              where: { id: m.id },
              data: { lastCollectedAt: now, ageInCycles: { increment: 1 } },
            }),
          ),
        ]);
      });

      await Promise.all(updates.filter(Boolean));
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: processedCount,
      totalPlayers: players.length,
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
