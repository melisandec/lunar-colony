/**
 * Core game engine for Lunar Colony Tycoon.
 *
 * Handles all game logic: colony management, resource production,
 * module building, and $LUNAR token economy.
 *
 * Schema notes:
 *   - Player directly owns Module[] (no Colony intermediary)
 *   - lunarBalance is Decimal(20,4) — use .toNumber() for arithmetic
 *   - ModuleType is a Prisma enum (SOLAR_PANEL, MINING_RIG, …)
 *   - Module.baseOutput is Decimal(10,4), Module.lastCollectedAt tracks ticks
 */

import prisma from "@/lib/database";
import { GAME_CONSTANTS, type ModuleType } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import { upsertPlayerSummary } from "@/lib/database/queries";
import { GameMetrics } from "@/lib/metrics";

// --- Types ---

export interface ColonyState {
  playerId: string;
  playerName: string;
  level: number;
  lunarBalance: number;
  modules: ModuleState[];
  productionRate: number;
  lastCollectedAt: Date;
  pendingEarnings: number;
}

export interface ModuleState {
  id: string;
  type: ModuleType;
  tier: string;
  level: number;
  coordinates: { x: number; y: number };
  baseOutput: number;
  bonusOutput: number;
  efficiency: number;
  isActive: boolean;
}

// Helper to convert Prisma Decimal to number safely
function d(val: Prisma.Decimal | number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === "number" ? val : Number(val);
}

// --- Starter module generation ---

/** Module types eligible for random starter selection. */
const STARTER_MODULE_POOL: ModuleType[] = [
  "SOLAR_PANEL",
  "MINING_RIG",
  "HABITAT",
  "WATER_EXTRACTOR",
  "OXYGEN_GENERATOR",
  "STORAGE_DEPOT",
];

const STARTER_BASE_OUTPUT: Record<ModuleType, number> = {
  SOLAR_PANEL: 10,
  MINING_RIG: 25,
  HABITAT: 5,
  RESEARCH_LAB: 15,
  WATER_EXTRACTOR: 20,
  OXYGEN_GENERATOR: 18,
  STORAGE_DEPOT: 8,
  LAUNCH_PAD: 50,
};

/**
 * Pick N distinct random modules from the starter pool.
 * Always includes at least one SOLAR_PANEL for guaranteed energy.
 */
function pickStarterModules(count: number): ModuleType[] {
  const result: ModuleType[] = ["SOLAR_PANEL"]; // Guaranteed first
  const pool = STARTER_MODULE_POOL.filter((t) => t !== "SOLAR_PANEL");

  while (result.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const picked = pool.splice(idx, 1)[0];
    if (picked) result.push(picked);
  }
  return result;
}

// --- Player Management ---

/**
 * Get or create a player by their Farcaster FID.
 * New players start with 4 random starter modules and starting $LUNAR.
 */
export async function getOrCreatePlayer(fid: number, username?: string) {
  let player = await prisma.player.findUnique({
    where: { fid, deletedAt: null },
    include: {
      modules: { where: { deletedAt: null } },
    },
  });

  if (!player) {
    const starters = pickStarterModules(4);

    player = await prisma.player.create({
      data: {
        fid,
        username: username || `player_${fid}`,
        lunarBalance: GAME_CONSTANTS.STARTING_LUNAR,
        moduleCount: starters.length,
        // 4 random starter modules
        modules: {
          create: starters.map((type, i) => ({
            type,
            tier: "COMMON" as const,
            level: 1,
            coordinates: { x: i % 5, y: Math.floor(i / 5) },
            baseOutput: STARTER_BASE_OUTPUT[type],
            efficiency: 100,
          })),
        },
        // Initialize LUNAR resource balance
        resources: {
          create: {
            type: "LUNAR",
            amount: GAME_CONSTANTS.STARTING_LUNAR,
            totalMined: GAME_CONSTANTS.STARTING_LUNAR,
          },
        },
      },
      include: {
        modules: { where: { deletedAt: null } },
      },
    });
  }

  return player;
}

// --- Colony State ---

/**
 * Calculate the full colony state including pending earnings since last collection.
 */
export function calculateColonyState(
  player: Awaited<ReturnType<typeof getOrCreatePlayer>>,
): ColonyState {
  const modules: ModuleState[] = player.modules.map((m) => ({
    id: m.id,
    type: m.type as ModuleType,
    tier: m.tier,
    level: m.level,
    coordinates: m.coordinates as { x: number; y: number },
    baseOutput: d(m.baseOutput),
    bonusOutput: d(m.bonusOutput),
    efficiency: d(m.efficiency),
    isActive: m.isActive,
  }));

  const totalProductionRate = modules
    .filter((m) => m.isActive)
    .reduce((sum, m) => {
      const effective = (m.baseOutput + m.bonusOutput) * (m.efficiency / 100);
      return sum + effective;
    }, 0);

  // Find the earliest lastCollectedAt across active modules
  const activeModules = player.modules.filter((m) => m.isActive);
  const oldestCollection =
    activeModules.length > 0
      ? new Date(
          Math.min(...activeModules.map((m) => m.lastCollectedAt.getTime())),
        )
      : new Date();

  // Calculate earnings since last collection
  const now = new Date();
  const msElapsed = now.getTime() - oldestCollection.getTime();
  const ticksElapsed = msElapsed / GAME_CONSTANTS.TICK_INTERVAL_MS;
  const pendingEarnings = Math.floor(ticksElapsed * totalProductionRate);

  return {
    playerId: player.id,
    playerName: player.username || `Colony #${player.fid}`,
    level: player.level,
    lunarBalance: d(player.lunarBalance),
    modules,
    productionRate: Math.floor(totalProductionRate),
    lastCollectedAt: oldestCollection,
    pendingEarnings,
  };
}

// --- Module Management ---

/**
 * Calculate cost for building a new module based on blueprint & player's count.
 */
export function calculateModuleCost(
  moduleType: ModuleType,
  existingModuleCount: number,
): number {
  const baseCosts: Record<ModuleType, number> = {
    SOLAR_PANEL: 100,
    MINING_RIG: 250,
    HABITAT: 200,
    RESEARCH_LAB: 500,
    WATER_EXTRACTOR: 300,
    OXYGEN_GENERATOR: 350,
    STORAGE_DEPOT: 150,
    LAUNCH_PAD: 1000,
  };

  const baseCost = baseCosts[moduleType];
  return Math.floor(
    baseCost *
      Math.pow(GAME_CONSTANTS.MODULE_COST_MULTIPLIER, existingModuleCount),
  );
}

/**
 * Build a new module in the player's colony.
 */
export async function buildModule(
  playerId: string,
  moduleType: ModuleType,
): Promise<{ success: boolean; error?: string; module?: ModuleState }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { modules: { where: { deletedAt: null } } },
  });

  if (!player) {
    return { success: false, error: "Player not found" };
  }

  const moduleCount = player.modules.length;

  if (moduleCount >= GAME_CONSTANTS.MAX_MODULES) {
    return { success: false, error: "Colony is full! Max modules reached." };
  }

  const cost = calculateModuleCost(moduleType, moduleCount);
  const balance = d(player.lunarBalance);

  if (balance < cost) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${cost}, have ${Math.floor(balance)}.`,
    };
  }

  // Production rate based on COMMON tier blueprint
  const baseOutput = STARTER_BASE_OUTPUT[moduleType];

  // Find next open grid position (simple sequential)
  const usedPositions = new Set(
    player.modules.map((m) => JSON.stringify(m.coordinates)),
  );
  let coords = { x: 0, y: 0 };
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (!usedPositions.has(JSON.stringify({ x, y }))) {
        coords = { x, y };
        break;
      }
    }
    if (!usedPositions.has(JSON.stringify(coords))) break;
  }

  // Transactional: deduct cost, create module, update counters, log transaction
  const newBalance = balance - cost;

  const [, newModule] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: player.version }, // Optimistic lock
      data: {
        lunarBalance: { decrement: cost },
        moduleCount: { increment: 1 },
        version: { increment: 1 },
      },
    }),
    prisma.module.create({
      data: {
        playerId,
        type: moduleType,
        tier: "COMMON",
        level: 1,
        coordinates: coords,
        baseOutput: baseOutput,
        efficiency: 100,
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "BUILD",
        resource: "LUNAR",
        amount: -cost,
        balanceAfter: newBalance,
        description: `Built ${moduleType} (COMMON)`,
        metadata: { moduleType, cost, coordinates: coords },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "build",
        data: { moduleType, tier: "COMMON", cost, coordinates: coords },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "build", {
    moduleType,
    tier: "COMMON",
    cost,
    moduleCount: moduleCount + 1,
  });

  return {
    success: true,
    module: {
      id: newModule.id,
      type: newModule.type as ModuleType,
      tier: newModule.tier,
      level: newModule.level,
      coordinates: newModule.coordinates as { x: number; y: number },
      baseOutput: d(newModule.baseOutput),
      bonusOutput: d(newModule.bonusOutput),
      efficiency: d(newModule.efficiency),
      isActive: newModule.isActive,
    },
  };
}

// --- Resource Collection ---

/**
 * Collect pending earnings and update the player's balance.
 * Called when a player interacts with the frame.
 * After crediting, syncs the PlayerSummary for fast future reads.
 */
export async function collectEarnings(playerId: string): Promise<{
  collected: number;
  newBalance: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { modules: { where: { deletedAt: null, isActive: true } } },
  });

  if (!player) {
    return { collected: 0, newBalance: 0 };
  }

  const state = calculateColonyState(player);

  if (state.pendingEarnings <= 0) {
    return { collected: 0, newBalance: d(player.lunarBalance) };
  }

  const newBalance = d(player.lunarBalance) + state.pendingEarnings;
  const now = new Date();

  const [updatedPlayer] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: player.version },
      data: {
        lunarBalance: { increment: state.pendingEarnings },
        totalEarnings: { increment: state.pendingEarnings },
        lastActive: now,
        version: { increment: 1 },
      },
    }),
    // Reset lastCollectedAt on all active modules
    ...player.modules.map((m) =>
      prisma.module.update({
        where: { id: m.id },
        data: { lastCollectedAt: now, ageInCycles: { increment: 1 } },
      }),
    ),
    prisma.transaction.create({
      data: {
        playerId,
        type: "PRODUCTION",
        resource: "LUNAR",
        amount: state.pendingEarnings,
        balanceAfter: newBalance,
        description: "Collected production earnings",
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "collect", {
    amount: state.pendingEarnings,
    newBalance: d(updatedPlayer.lunarBalance),
    moduleCount: player.modules.length,
  });

  return {
    collected: state.pendingEarnings,
    newBalance: d(updatedPlayer.lunarBalance),
  };
}

/**
 * Sync the PlayerSummary cache after a state-changing action.
 * Fire-and-forget — never blocks the Frame response.
 */
export function syncPlayerSummary(playerId: string): void {
  upsertPlayerSummary(playerId).catch((e) =>
    console.error("Summary sync failed:", e),
  );
}

// --- Module Upgrade ---

/** Cost to upgrade a module from its current level. */
export function calculateUpgradeCost(
  moduleType: ModuleType,
  currentLevel: number,
): number {
  const baseCosts: Record<ModuleType, number> = {
    SOLAR_PANEL: 50,
    MINING_RIG: 125,
    HABITAT: 100,
    RESEARCH_LAB: 250,
    WATER_EXTRACTOR: 150,
    OXYGEN_GENERATOR: 175,
    STORAGE_DEPOT: 75,
    LAUNCH_PAD: 500,
  };
  return Math.floor(baseCosts[moduleType] * Math.pow(1.5, currentLevel - 1));
}

const MAX_MODULE_LEVEL = 10;

/**
 * Upgrade a module by one level.
 * Increases baseOutput by 15 % per level.
 */
export async function upgradeModule(
  playerId: string,
  moduleId: string,
): Promise<{
  success: boolean;
  error?: string;
  module?: ModuleState;
  cost?: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { modules: { where: { deletedAt: null } } },
  });

  if (!player) return { success: false, error: "Player not found" };

  const mod = player.modules.find((m) => m.id === moduleId);
  if (!mod) return { success: false, error: "Module not found" };

  if (mod.level >= MAX_MODULE_LEVEL) {
    return {
      success: false,
      error: `Already at max level (${MAX_MODULE_LEVEL})`,
    };
  }

  const cost = calculateUpgradeCost(mod.type as ModuleType, mod.level);
  const balance = d(player.lunarBalance);

  if (balance < cost) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${cost}, have ${Math.floor(balance)}.`,
    };
  }

  const newLevel = mod.level + 1;
  const currentBase = d(mod.baseOutput);
  const newBase = Math.round(currentBase * 1.15 * 100) / 100; // +15 % per level
  const newBalance = balance - cost;

  const [, updatedModule] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: player.version },
      data: {
        lunarBalance: { decrement: cost },
        version: { increment: 1 },
      },
    }),
    prisma.module.update({
      where: { id: moduleId, version: mod.version },
      data: {
        level: newLevel,
        baseOutput: newBase,
        version: { increment: 1 },
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "UPGRADE",
        resource: "LUNAR",
        amount: -cost,
        balanceAfter: newBalance,
        description: `Upgraded ${mod.type} to level ${newLevel}`,
        metadata: { moduleId, moduleType: mod.type, newLevel, cost },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "upgrade",
        data: { moduleId, moduleType: mod.type, newLevel, cost },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "upgrade", {
    moduleType: mod.type,
    newLevel,
    cost,
  });

  return {
    success: true,
    cost,
    module: {
      id: updatedModule.id,
      type: updatedModule.type as ModuleType,
      tier: updatedModule.tier,
      level: updatedModule.level,
      coordinates: updatedModule.coordinates as { x: number; y: number },
      baseOutput: d(updatedModule.baseOutput),
      bonusOutput: d(updatedModule.bonusOutput),
      efficiency: d(updatedModule.efficiency),
      isActive: updatedModule.isActive,
    },
  };
}

// --- Crew Assignment ---

/**
 * Assign (or unassign) a crew member to a module.
 * Specialty match gives 1.5× output bonus.
 */
export async function assignCrew(
  playerId: string,
  crewId: string,
  moduleId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const crew = await prisma.crewMember.findFirst({
    where: { id: crewId, playerId, isActive: true, deletedAt: null },
  });

  if (!crew) return { success: false, error: "Crew member not found" };

  if (moduleId) {
    const mod = await prisma.module.findFirst({
      where: { id: moduleId, playerId, deletedAt: null },
    });
    if (!mod) return { success: false, error: "Module not found" };

    const existing = await prisma.crewMember.findFirst({
      where: {
        assignedModuleId: moduleId,
        playerId,
        isActive: true,
        deletedAt: null,
        id: { not: crewId },
      },
    });
    if (existing) {
      return {
        success: false,
        error: `${existing.name} is already assigned to this module`,
      };
    }

    const specialtyMatch = crew.specialty === mod.type;
    const bonusMultiplier = specialtyMatch
      ? d(crew.outputBonus) * 1.5
      : d(crew.outputBonus);
    const bonusOutput = (d(mod.baseOutput) * bonusMultiplier) / 100;

    await prisma.$transaction([
      prisma.crewMember.update({
        where: { id: crewId },
        data: { assignedModuleId: moduleId },
      }),
      prisma.module.update({
        where: { id: moduleId },
        data: { bonusOutput },
      }),
    ]);
  } else {
    if (crew.assignedModuleId) {
      await prisma.$transaction([
        prisma.crewMember.update({
          where: { id: crewId },
          data: { assignedModuleId: null },
        }),
        prisma.module.update({
          where: { id: crew.assignedModuleId },
          data: { bonusOutput: 0 },
        }),
      ]);
    } else {
      await prisma.crewMember.update({
        where: { id: crewId },
        data: { assignedModuleId: null },
      });
    }
  }

  return { success: true };
}

export const gameEngine = {
  getOrCreatePlayer,
  calculateColonyState,
  calculateModuleCost,
  buildModule,
  upgradeModule,
  assignCrew,
  collectEarnings,
  syncPlayerSummary,
};

export default gameEngine;
