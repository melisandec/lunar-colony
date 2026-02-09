/**
 * Optimized Query Layer for Frame Interactions
 *
 * Every Frame tap must respond in <200ms. This module provides:
 *   1. getPlayerFrameState()      — minimal-select player load for image gen
 *   2. upsertPlayerSummary()      — update the denormalized PlayerSummary cache
 *   3. refreshLeaderboard()       — rebuild LeaderboardSnapshot from summaries
 *   4. getLeaderboard()           — read cached leaderboard (sub-5ms)
 *   5. getPlayerRank()            — single-player rank lookup
 *
 * Design decisions:
 *   - PlayerSummary is the "Frame read model" — always read from here
 *   - Player table is the "write model" — always write here, then sync
 *   - Leaderboard uses LeaderboardSnapshot (materialized, hourly refresh)
 *   - Read-replica used for analytics queries when available
 */

import prisma, { readPrisma } from "@/lib/database";
import type { LeaderboardPeriod } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal player state for Frame image generation (<200ms target). */
export interface FramePlayerState {
  playerId: string;
  fid: number;
  username: string;
  lunarBalance: number;
  level: number;
  moduleCount: number;
  activeModules: number;
  crewCount: number;
  totalEarnings: number;
  productionRate: number;
  pendingEarnings: number;
  dailyStreak: number;
  efficiency: number;
  lastCollectedAt: Date;
}

/** Leaderboard entry for display. */
export interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string | null;
  lunarBalance: number;
  totalEarnings: number;
  moduleCount: number;
  level: number;
  efficiency: number;
}

// ---------------------------------------------------------------------------
// 1. Frame State — ultra-fast player load from denormalized summary
// ---------------------------------------------------------------------------

/**
 * Load player state optimized for Frame image generation.
 *
 * First tries PlayerSummary (single indexed read, ~2ms on Neon).
 * Falls back to Player + computed state if summary doesn't exist yet,
 * and creates the summary for future reads.
 */
export async function getPlayerFrameState(
  fid: number,
): Promise<FramePlayerState | null> {
  // Try the fast path: denormalized summary
  const summary = await prisma.playerSummary.findUnique({
    where: { fid },
  });

  if (summary) {
    return {
      playerId: summary.playerId,
      fid: summary.fid,
      username: summary.username ?? `player_${summary.fid}`,
      lunarBalance: Number(summary.lunarBalance),
      level: summary.level,
      moduleCount: summary.moduleCount,
      activeModules: summary.activeModules,
      crewCount: summary.crewCount,
      totalEarnings: Number(summary.totalEarnings),
      productionRate: summary.productionRate,
      pendingEarnings: summary.pendingEarnings,
      dailyStreak: summary.dailyStreak,
      efficiency: Number(summary.efficiency),
      lastCollectedAt: summary.lastCollectedAt,
    };
  }

  // Slow path: build from Player table (first interaction or migration)
  const player = await prisma.player.findUnique({
    where: { fid, deletedAt: null },
    select: {
      id: true,
      fid: true,
      username: true,
      lunarBalance: true,
      level: true,
      xp: true,
      moduleCount: true,
      crewCount: true,
      totalEarnings: true,
      dailyStreak: true,
      efficiency: true,
      lastActive: true,
      modules: {
        where: { isActive: true, deletedAt: null },
        select: {
          type: true,
          efficiency: true,
          baseOutput: true,
          bonusOutput: true,
          lastCollectedAt: true,
        },
        take: 20, // MAX_MODULES cap
      },
    },
  });

  if (!player) return null;

  // Compute production rate and pending in-memory
  const activeModules = player.modules.length;
  let productionRate = 0;
  let oldestCollection = new Date();

  for (const m of player.modules) {
    const eff = Number(m.efficiency) / 100;
    productionRate += (Number(m.baseOutput) + Number(m.bonusOutput)) * eff;
    if (m.lastCollectedAt < oldestCollection) {
      oldestCollection = m.lastCollectedAt;
    }
  }

  const msElapsed = Date.now() - oldestCollection.getTime();
  const tickMs = 5 * 60 * 1000; // TICK_INTERVAL_MS
  const ticksElapsed = msElapsed / tickMs;
  const pendingEarnings = Math.floor(ticksElapsed * productionRate);

  const state: FramePlayerState = {
    playerId: player.id,
    fid: player.fid,
    username: player.username ?? `player_${player.fid}`,
    lunarBalance: Number(player.lunarBalance),
    level: player.level,
    moduleCount: player.moduleCount,
    activeModules,
    crewCount: player.crewCount,
    totalEarnings: Number(player.totalEarnings),
    productionRate: Math.floor(productionRate),
    pendingEarnings,
    dailyStreak: player.dailyStreak,
    efficiency: Number(player.efficiency),
    lastCollectedAt: oldestCollection,
  };

  // Backfill the summary for future fast reads (fire-and-forget)
  upsertPlayerSummary(player.id).catch(() => {});

  return state;
}

// ---------------------------------------------------------------------------
// 2. Player Summary Sync — called after every state-changing action
// ---------------------------------------------------------------------------

/**
 * Rebuild a player's denormalized summary from source tables.
 *
 * Called after: collectEarnings, buildModule, trade, daily reward.
 * Uses a single raw query for maximum efficiency.
 */
export async function upsertPlayerSummary(playerId: string): Promise<void> {
  // One query to fetch everything we need
  const rows = await prisma.$queryRaw<
    Array<{
      playerId: string;
      fid: number;
      username: string | null;
      lunarBalance: number;
      level: number;
      xp: number;
      totalEarnings: number;
      dailyStreak: number;
      efficiency: number;
      moduleCount: number;
      crewCount: number;
      activeModules: number;
      productionRate: number;
      oldestCollection: Date | null;
    }>
  >`
    SELECT
      p."id"              AS "playerId",
      p."fid"             AS "fid",
      p."username"        AS "username",
      p."lunarBalance"    AS "lunarBalance",
      p."level"           AS "level",
      p."xp"              AS "xp",
      p."totalEarnings"   AS "totalEarnings",
      p."dailyStreak"     AS "dailyStreak",
      p."efficiency"      AS "efficiency",
      p."moduleCount"     AS "moduleCount",
      p."crewCount"       AS "crewCount",
      COALESCE(mods."activeCount", 0)::int  AS "activeModules",
      COALESCE(mods."totalRate", 0)::int    AS "productionRate",
      mods."oldestCollection"               AS "oldestCollection"
    FROM "Player" p
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int                       AS "activeCount",
        SUM(
          ("baseOutput" + "bonusOutput") * ("efficiency" / 100.0)
        )::int                              AS "totalRate",
        MIN("lastCollectedAt")              AS "oldestCollection"
      FROM "Module"
      WHERE "playerId" = p."id"
        AND "isActive" = true
        AND "deletedAt" IS NULL
    ) mods ON true
    WHERE p."id" = ${playerId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return;

  const now = Date.now();
  const lastCollected = row.oldestCollection ?? new Date();
  const tickMs = 5 * 60 * 1000;
  const ticksElapsed = (now - lastCollected.getTime()) / tickMs;
  const pendingEarnings = Math.floor(ticksElapsed * row.productionRate);

  await prisma.playerSummary.upsert({
    where: { playerId },
    create: {
      playerId: row.playerId,
      fid: row.fid,
      username: row.username,
      lunarBalance: row.lunarBalance,
      level: row.level,
      xp: row.xp,
      moduleCount: row.moduleCount,
      activeModules: row.activeModules,
      crewCount: row.crewCount,
      totalEarnings: row.totalEarnings,
      productionRate: row.productionRate,
      pendingEarnings,
      dailyStreak: row.dailyStreak,
      efficiency: row.efficiency,
      lastCollectedAt: lastCollected,
    },
    update: {
      fid: row.fid,
      username: row.username,
      lunarBalance: row.lunarBalance,
      level: row.level,
      xp: row.xp,
      moduleCount: row.moduleCount,
      activeModules: row.activeModules,
      crewCount: row.crewCount,
      totalEarnings: row.totalEarnings,
      productionRate: row.productionRate,
      pendingEarnings,
      dailyStreak: row.dailyStreak,
      efficiency: row.efficiency,
      lastCollectedAt: lastCollected,
    },
  });
}

/**
 * Bulk-refresh all player summaries.
 * Called by cron after production cycle to keep summaries fresh.
 */
export async function refreshAllPlayerSummaries(options?: {
  batchSize?: number;
  signal?: AbortSignal;
}): Promise<{ refreshed: number; durationMs: number }> {
  const batchSize = options?.batchSize ?? 200;
  const start = Date.now();
  let refreshed = 0;
  let cursor: string | undefined;

  while (true) {
    if (options?.signal?.aborted) break;

    const players = await prisma.player.findMany({
      where: {
        deletedAt: null,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true },
      take: batchSize,
      orderBy: { id: "asc" },
    });

    if (players.length === 0) break;

    // Upsert summaries in parallel (bounded)
    await Promise.allSettled(players.map((p) => upsertPlayerSummary(p.id)));
    refreshed += players.length;

    const last = players[players.length - 1];
    if (!last || players.length < batchSize) break;
    cursor = last.id;
  }

  return { refreshed, durationMs: Date.now() - start };
}

// ---------------------------------------------------------------------------
// 3. Leaderboard — cached snapshots, rebuilt hourly
// ---------------------------------------------------------------------------

/**
 * Refresh the leaderboard from PlayerSummary data.
 *
 * Runs on the read replica if available. Replaces all existing snapshot
 * rows for the given period atomically.
 */
export async function refreshLeaderboard(
  period: LeaderboardPeriod = "ALLTIME",
  limit = 100,
): Promise<{ entries: number; durationMs: number }> {
  const start = Date.now();

  // Build from PlayerSummary for speed (already denormalized)
  const topPlayers = await readPrisma.playerSummary.findMany({
    orderBy: { totalEarnings: "desc" },
    take: limit,
    select: {
      fid: true,
      username: true,
      lunarBalance: true,
      totalEarnings: true,
      moduleCount: true,
      level: true,
      efficiency: true,
    },
  });

  // Atomic replace: delete old → insert new in a transaction
  await prisma.$transaction([
    prisma.leaderboardSnapshot.deleteMany({ where: { period } }),
    ...topPlayers.map((p, i) =>
      prisma.leaderboardSnapshot.create({
        data: {
          fid: p.fid,
          username: p.username,
          period,
          rank: i + 1,
          lunarBalance: p.lunarBalance,
          totalEarnings: p.totalEarnings,
          moduleCount: p.moduleCount,
          level: p.level,
          efficiency: p.efficiency,
        },
      }),
    ),
  ]);

  return { entries: topPlayers.length, durationMs: Date.now() - start };
}

/**
 * Read the cached leaderboard (~2ms, single indexed query).
 */
export async function getLeaderboard(
  period: LeaderboardPeriod = "ALLTIME",
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const rows = await readPrisma.leaderboardSnapshot.findMany({
    where: { period },
    orderBy: { rank: "asc" },
    take: limit,
    select: {
      rank: true,
      fid: true,
      username: true,
      lunarBalance: true,
      totalEarnings: true,
      moduleCount: true,
      level: true,
      efficiency: true,
    },
  });

  return rows.map((r) => ({
    rank: r.rank,
    fid: r.fid,
    username: r.username,
    lunarBalance: Number(r.lunarBalance),
    totalEarnings: Number(r.totalEarnings),
    moduleCount: r.moduleCount,
    level: r.level,
    efficiency: Number(r.efficiency),
  }));
}

/**
 * Get a specific player's rank from the cached leaderboard.
 */
export async function getPlayerRank(
  fid: number,
  period: LeaderboardPeriod = "ALLTIME",
): Promise<number | null> {
  const row = await readPrisma.leaderboardSnapshot.findUnique({
    where: { fid_period: { fid, period } },
    select: { rank: true },
  });
  return row?.rank ?? null;
}

// ---------------------------------------------------------------------------
// 4. Selective Includes — query builders for specific screens
// ---------------------------------------------------------------------------

/** Load only what's needed for the build screen. */
export async function getPlayerBuildState(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
    select: {
      lunarBalance: true,
      level: true,
      version: true,
      _count: {
        select: {
          modules: { where: { deletedAt: null } },
        },
      },
    },
  });
}

/** Load only what's needed for the market screen. */
export async function getPlayerMarketState(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      lunarBalance: true,
      level: true,
      resources: {
        select: { type: true, amount: true },
      },
    },
  });
}

/** Load recent transactions for a player (paginated). */
export async function getPlayerTransactions(
  playerId: string,
  limit = 20,
  cursor?: string,
) {
  return prisma.transaction.findMany({
    where: {
      playerId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      resource: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  });
}
