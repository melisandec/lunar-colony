/**
 * Daily Production Engine
 *
 * Calculates and credits production for all active players.
 * Optimised for Vercel Serverless (10–60 s execution budget):
 *
 *   1. Cursor-based batching  — never loads all players at once
 *   2. Raw SQL aggregation    — single query per player (modules + crew)
 *   3. Idempotency via ProductionLog — @@unique([playerId, date, resource])
 *   4. Per-player timeout      — one slow player can't stall the batch
 *   5. Structured logging      — every run is auditable via GameEvent
 *
 * Entry point: processProductionCycle()
 */

import prisma from "@/lib/database";
import type { ModuleType, Tier } from "@/lib/utils";
import {
  getPlayerEventModifiers,
  getModifier,
  autoParticipateInActiveEvents,
  type ModifierSet,
} from "@/lib/event-engine";
import { GameMetrics } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleProductionRow {
  moduleId: string;
  moduleType: ModuleType;
  tier: Tier;
  level: number;
  efficiency: number; // 0–100
  baseOutput: number;
  bonusOutput: number;
  ageInCycles: number;
  /** Crew fields — null when no crew is assigned */
  crewSpecialty: ModuleType | null;
  crewOutputBonus: number; // percentage, e.g. 15 = +15 %
  crewEfficiencyBonus: number;
}

export interface ModuleResult {
  moduleId: string;
  output: number;
  breakdown: {
    base: number;
    crewBonus: number;
    agingPenalty: number;
    efficiencyMult: number;
  };
}

export interface ProductionResult {
  playerId: string;
  totalLunar: number;
  moduleResults: ModuleResult[];
  activeModules: number;
  avgEfficiency: number;
}

export interface BatchResult {
  processed: number;
  skipped: number;
  failed: number;
  totalLunarProduced: number;
  durationMs: number;
  errors: Array<{ playerId: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Constants — base outputs per type × tier (match seed ModuleBlueprints)
// ---------------------------------------------------------------------------

const BASE_OUTPUTS: Record<ModuleType, Record<Tier, number>> = {
  SOLAR_PANEL: { COMMON: 10, UNCOMMON: 15, RARE: 22, EPIC: 33, LEGENDARY: 50 },
  MINING_RIG: { COMMON: 25, UNCOMMON: 37, RARE: 56, EPIC: 84, LEGENDARY: 125 },
  HABITAT: { COMMON: 5, UNCOMMON: 8, RARE: 12, EPIC: 18, LEGENDARY: 27 },
  RESEARCH_LAB: { COMMON: 15, UNCOMMON: 22, RARE: 34, EPIC: 50, LEGENDARY: 75 },
  WATER_EXTRACTOR: {
    COMMON: 20,
    UNCOMMON: 30,
    RARE: 45,
    EPIC: 67,
    LEGENDARY: 100,
  },
  OXYGEN_GENERATOR: {
    COMMON: 18,
    UNCOMMON: 27,
    RARE: 40,
    EPIC: 60,
    LEGENDARY: 90,
  },
  STORAGE_DEPOT: { COMMON: 8, UNCOMMON: 12, RARE: 18, EPIC: 27, LEGENDARY: 40 },
  LAUNCH_PAD: {
    COMMON: 50,
    UNCOMMON: 75,
    RARE: 112,
    EPIC: 168,
    LEGENDARY: 250,
  },
};

/** Cycle threshold after which diminishing returns kick in. */
const AGING_THRESHOLD_CYCLES = 30;
/** Min efficiency multiplier from aging (floor at 50 %). */
const AGING_MIN_MULTIPLIER = 0.5;
/** Efficiency lost per cycle beyond the threshold. */
const AGING_DECAY_PER_CYCLE = 0.01;

// ---------------------------------------------------------------------------
// 1. Production Calculator — pure function, no DB writes
// ---------------------------------------------------------------------------

/**
 * Calculate production for a single player.
 * Uses a single optimised query (modules + assigned crew) then
 * computes everything in-memory for speed.
 */
export async function calculatePlayerProduction(
  playerId: string,
): Promise<ProductionResult> {
  // Fetch event modifiers for this player
  const eventMods = await getPlayerEventModifiers(playerId);

  // Single query: active modules LEFT JOIN assigned crew
  const rows = await prisma.$queryRaw<ModuleProductionRow[]>`
    SELECT
      m."id"                  AS "moduleId",
      m."type"::text          AS "moduleType",
      m."tier"::text          AS "tier",
      m."level"               AS "level",
      m."efficiency"          AS "efficiency",
      m."baseOutput"          AS "baseOutput",
      m."bonusOutput"         AS "bonusOutput",
      m."ageInCycles"         AS "ageInCycles",
      c."specialty"::text     AS "crewSpecialty",
      COALESCE(c."outputBonus", 0)     AS "crewOutputBonus",
      COALESCE(c."efficiencyBonus", 0) AS "crewEfficiencyBonus"
    FROM "Module" m
    LEFT JOIN "CrewMember" c
      ON  c."assignedModuleId" = m."id"
      AND c."isActive" = true
      AND c."deletedAt" IS NULL
    WHERE m."playerId" = ${playerId}
      AND m."isActive" = true
      AND m."deletedAt" IS NULL
  `;

  let totalLunar = 0;
  let totalEfficiency = 0;
  const moduleResults: ModuleResult[] = [];

  for (const row of rows) {
    const result = calculateModuleOutput(row, eventMods);
    totalLunar += result.output;
    totalEfficiency += Number(row.efficiency);
    moduleResults.push(result);
  }

  const activeModules = rows.length;
  const avgEfficiency =
    activeModules > 0
      ? Math.round((totalEfficiency / activeModules) * 100) / 100
      : 0;

  return {
    playerId,
    totalLunar: Math.floor(totalLunar),
    moduleResults,
    activeModules,
    avgEfficiency,
  };
}

/**
 * Pure calculation for a single module's output.
 * Takes optional event modifiers to apply bonuses/penalties.
 */
function calculateModuleOutput(
  row: ModuleProductionRow,
  eventMods?: ModifierSet,
): ModuleResult {
  const tier = row.tier as Tier;
  const moduleType = row.moduleType as ModuleType;

  // Base output from blueprint (type × tier × level)
  const blueprintBase =
    BASE_OUTPUTS[moduleType]?.[tier] ?? Number(row.baseOutput);
  let base = blueprintBase * row.level;

  // Efficiency multiplier (0–100 → 0.0–1.0)
  const efficiencyMult =
    Math.max(0, Math.min(100, Number(row.efficiency))) / 100;

  // Crew bonus — specialty match gives full bonus, otherwise half
  let crewBonus = 0;
  if (row.crewOutputBonus > 0) {
    const specialtyMatch = row.crewSpecialty === moduleType;
    const bonusPct = Number(row.crewOutputBonus) / 100;
    const effBoostPct = Number(row.crewEfficiencyBonus) / 100;

    if (specialtyMatch) {
      crewBonus = base * bonusPct;
      // Specialty crew also boosts effective efficiency
      base *= 1 + effBoostPct;
    } else {
      // Non-specialty crew gives half their output bonus
      crewBonus = base * (bonusPct * 0.5);
    }
  }

  // Aging / diminishing returns
  let agingPenalty = 0;
  const age = row.ageInCycles;
  if (age > AGING_THRESHOLD_CYCLES) {
    const decayFactor = Math.max(
      AGING_MIN_MULTIPLIER,
      1 - (age - AGING_THRESHOLD_CYCLES) * AGING_DECAY_PER_CYCLE,
    );
    agingPenalty = (base + crewBonus) * (1 - decayFactor);
  }

  const output = Math.max(
    0,
    (base + crewBonus - agingPenalty) * efficiencyMult,
  );

  // Apply event modifiers: global production + module-type-specific
  let eventMultiplier = 1.0;
  if (eventMods) {
    eventMultiplier *= getModifier(eventMods, "GLOBAL_PRODUCTION");
    eventMultiplier *= getModifier(eventMods, `${moduleType}_OUTPUT`);
  }
  const finalOutput = output * eventMultiplier;

  return {
    moduleId: row.moduleId,
    output: finalOutput,
    breakdown: {
      base,
      crewBonus,
      agingPenalty,
      efficiencyMult,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Idempotent credit — writes to ProductionLog + Player balance
// ---------------------------------------------------------------------------

/**
 * Credit a player's production for a specific date.
 * Returns `true` if credited, `false` if already processed (idempotent).
 *
 * Uses ProductionLog's @@unique([playerId, date, resource]) as the
 * idempotency key — a duplicate insert is caught and safely skipped.
 */
async function creditProduction(
  playerId: string,
  date: Date,
  result: ProductionResult,
): Promise<boolean> {
  if (result.totalLunar <= 0) return false;

  try {
    await prisma.$transaction([
      // 1. Insert the idempotency record (will throw on duplicate)
      prisma.productionLog.create({
        data: {
          playerId,
          date,
          resource: "LUNAR",
          totalProduced: result.totalLunar,
          totalCollected: result.totalLunar, // Auto-collected by cron
          activeModules: result.activeModules,
          avgEfficiency: result.avgEfficiency,
        },
      }),

      // 2. Credit the player's balance
      prisma.player.update({
        where: { id: playerId },
        data: {
          lunarBalance: { increment: result.totalLunar },
          totalEarnings: { increment: result.totalLunar },
          lastActive: new Date(),
          version: { increment: 1 },
        },
      }),

      // 3. Update LUNAR resource tracker
      prisma.playerResource.upsert({
        where: { playerId_type: { playerId, type: "LUNAR" } },
        create: {
          playerId,
          type: "LUNAR",
          amount: result.totalLunar,
          totalMined: result.totalLunar,
        },
        update: {
          amount: { increment: result.totalLunar },
          totalMined: { increment: result.totalLunar },
        },
      }),

      // 4. Immutable transaction ledger entry
      prisma.transaction.create({
        data: {
          playerId,
          type: "PRODUCTION",
          resource: "LUNAR",
          amount: result.totalLunar,
          balanceAfter: 0, // Will be stale — acceptable for ledger
          description: `Daily production: ${result.activeModules} modules, avg eff ${result.avgEfficiency}%`,
          metadata: {
            date: date.toISOString(),
            moduleResults: result.moduleResults.map((mr) => ({
              id: mr.moduleId,
              output: Math.round(mr.output * 100) / 100,
            })),
          },
        },
      }),

      // 5. Age all active modules
      ...result.moduleResults.map((mr) =>
        prisma.module.update({
          where: { id: mr.moduleId },
          data: {
            lastCollectedAt: new Date(),
            ageInCycles: { increment: 1 },
          },
        }),
      ),
    ]);

    return true;
  } catch (error) {
    // Unique constraint violation = already processed for this date
    if (isPrismaUniqueViolation(error)) {
      return false;
    }
    throw error;
  }
}

function isPrismaUniqueViolation(error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 3. Batch processor — cursor-based pagination, parallel within batch
// ---------------------------------------------------------------------------

/** Default batch size — tuned for Neon free-tier connection limits. */
const BATCH_SIZE = 100;

/** Per-player timeout to prevent one slow player from stalling a batch. */
const PLAYER_TIMEOUT_MS = 5_000;

/**
 * Process all eligible players' daily production.
 *
 * Eligible = active in the last 7 days, not soft-deleted, has active modules.
 * Uses cursor-based pagination (id > lastId) for stable iteration.
 */
export async function processProductionCycle(options?: {
  batchSize?: number;
  playerTimeoutMs?: number;
  /** If provided, only process this date (for backfills). */
  forDate?: Date;
  /** Abort signal for early termination. */
  signal?: AbortSignal;
}): Promise<BatchResult> {
  const batchSize = options?.batchSize ?? BATCH_SIZE;
  const playerTimeout = options?.playerTimeoutMs ?? PLAYER_TIMEOUT_MS;
  const today = options?.forDate ?? todayDate();
  const startTime = Date.now();

  const result: BatchResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    totalLunarProduced: 0,
    durationMs: 0,
    errors: [],
  };

  let cursor: string | undefined;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Check for abort
    if (options?.signal?.aborted) break;

    // Fetch next batch via cursor pagination
    const players = await prisma.player.findMany({
      where: {
        deletedAt: null,
        lastActive: { gte: sevenDaysAgo },
        modules: { some: { isActive: true, deletedAt: null } },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true },
      take: batchSize,
      orderBy: { id: "asc" },
    });

    if (players.length === 0) break;

    // Process batch in parallel with per-player timeout
    const settled = await Promise.allSettled(
      players.map((p) =>
        withTimeout(processSinglePlayer(p.id, today), playerTimeout),
      ),
    );

    // Aggregate results
    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!;
      const playerId = players[i]?.id ?? "unknown";

      if (outcome.status === "fulfilled") {
        if (outcome.value === null) {
          // Skipped (idempotent — already processed or zero production)
          result.skipped++;
        } else {
          result.processed++;
          result.totalLunarProduced += outcome.value;
        }
      } else {
        result.failed++;
        const errMsg =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason);
        result.errors.push({ playerId, error: errMsg });
      }
    }

    // Advance cursor
    const lastPlayer = players[players.length - 1];
    if (!lastPlayer || players.length < batchSize) break;
    cursor = lastPlayer.id;
  }

  result.durationMs = Date.now() - startTime;

  // Write a system-level GameEvent for observability
  await prisma.gameEvent
    .create({
      data: {
        type: "daily_production",
        severity: result.failed > 0 ? "WARNING" : "INFO",
        data: {
          date: today.toISOString(),
          processed: result.processed,
          skipped: result.skipped,
          failed: result.failed,
          totalLunarProduced: result.totalLunarProduced,
          durationMs: result.durationMs,
          errorSample: result.errors.slice(0, 10),
        },
      },
    })
    .catch((e) => console.error("Failed to log production event:", e));

  // Emit structured metric for monitoring
  if (result.processed > 0) {
    GameMetrics.trackProduction(
      "batch",
      result.totalLunarProduced,
      result.processed,
      result.failed === 0
        ? 100
        : Math.round(
            (result.processed / (result.processed + result.failed)) * 100,
          ),
    );
  }
  if (result.failed > 0) {
    GameMetrics.trackError(
      new Error(`Production cycle: ${result.failed} player(s) failed`),
      {
        processed: result.processed,
        failed: result.failed,
        errors: result.errors.slice(0, 5),
      },
      "warning",
    );
  }

  return result;
}

/**
 * Process a single player: calculate → credit (idempotent).
 * Returns the amount credited, or null if skipped.
 */
async function processSinglePlayer(
  playerId: string,
  date: Date,
): Promise<number | null> {
  const production = await calculatePlayerProduction(playerId);

  if (production.totalLunar <= 0) return null;

  const credited = await creditProduction(playerId, date, production);
  if (!credited) return null;

  // Record participation in any active production-related events
  await autoParticipateInActiveEvents(
    playerId,
    "production",
    production.totalLunar,
  ).catch(() => {
    // Non-critical — don't fail production for event tracking
  });

  return production.totalLunar;
}

// ---------------------------------------------------------------------------
// 4. Utilities
// ---------------------------------------------------------------------------

/** Get today's date as a Date with time zeroed (for ProductionLog partitioning). */
function todayDate(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/** Wrap a promise with a timeout. Rejects with a descriptive error on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const productionEngine = {
  calculatePlayerProduction,
  processProductionCycle,
};

export default productionEngine;
