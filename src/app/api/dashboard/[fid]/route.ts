import { NextRequest, NextResponse } from "next/server";
import { getOrCreatePlayer, calculateColonyState } from "@/lib/game-engine";
import prisma from "@/lib/database";

/**
 * GET /api/dashboard/[fid]
 * Returns the full colony state + optional production history for the web dashboard.
 *
 * Query params:
 *   - include=production  — also returns last 30 days of production logs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fid: string }> },
) {
  try {
    const { fid: fidStr } = await params;
    const fid = parseInt(fidStr, 10);
    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const player = await getOrCreatePlayer(fid);
    const colony = calculateColonyState(player);

    // Crew
    const crew = await prisma.crewMember.findMany({
      where: { playerId: player.id, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        role: true,
        level: true,
        specialty: true,
        efficiencyBonus: true,
        outputBonus: true,
        assignedModuleId: true,
        isActive: true,
      },
    });

    // Resources
    const resources = await prisma.playerResource.findMany({
      where: { playerId: player.id },
      select: { type: true, amount: true, totalMined: true },
    });

    // Rank (from leaderboard snapshot)
    const rankEntry = await prisma.leaderboardSnapshot.findUnique({
      where: { fid_period: { fid, period: "ALLTIME" } },
      select: { rank: true },
    });

    // Optional: production history
    const { searchParams } = new URL(req.url);
    let productionHistory: unknown[] = [];
    if (searchParams.get("include") === "production") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      productionHistory = await prisma.productionLog.findMany({
        where: {
          playerId: player.id,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          resource: true,
          totalProduced: true,
          totalCollected: true,
          activeModules: true,
          avgEfficiency: true,
        },
      });
    }

    return NextResponse.json(
      {
        playerId: colony.playerId,
        playerName: colony.playerName,
        level: colony.level,
        lunarBalance: colony.lunarBalance,
        modules: colony.modules,
        crew: crew.map((c) => ({
          ...c,
          efficiencyBonus: Number(c.efficiencyBonus),
          outputBonus: Number(c.outputBonus),
        })),
        resources: resources.map((r) => ({
          type: r.type,
          amount: Number(r.amount),
          totalMined: Number(r.totalMined),
        })),
        productionRate: colony.productionRate,
        pendingEarnings: colony.pendingEarnings,
        lastCollectedAt: colony.lastCollectedAt.toISOString(),
        dailyStreak: player.dailyStreak,
        efficiency: Number(player.efficiency),
        rank: rankEntry?.rank ?? null,
        productionHistory,
      },
      {
        headers: {
          "Cache-Control": "private, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
