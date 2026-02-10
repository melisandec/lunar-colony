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
  tier: "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" = "COMMON",
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

  // Look up the blueprint for this type+tier
  const blueprint = await prisma.moduleBlueprint.findUnique({
    where: { type_tier: { type: moduleType, tier } },
  });

  // Determine cost & output from blueprint, falling back to hardcoded COMMON values
  let cost: number;
  let baseOutput: number;
  if (blueprint) {
    if (player.level < blueprint.unlockLevel) {
      return {
        success: false,
        error: `${tier} tier requires level ${blueprint.unlockLevel}. You are level ${player.level}.`,
      };
    }
    cost = Math.floor(
      Number(blueprint.baseCost) *
        Math.pow(GAME_CONSTANTS.MODULE_COST_MULTIPLIER, moduleCount),
    );
    baseOutput = Number(blueprint.baseOutput);
  } else {
    // Fallback for COMMON or missing blueprint data
    cost = calculateModuleCost(moduleType, moduleCount);
    baseOutput = STARTER_BASE_OUTPUT[moduleType];
  }

  const balance = d(player.lunarBalance);

  if (balance < cost) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${cost}, have ${Math.floor(balance)}.`,
    };
  }

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
        tier,
        level: 1,
        coordinates: coords,
        baseOutput,
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
        description: `Built ${moduleType} (${tier})`,
        metadata: { moduleType, tier, cost, coordinates: coords },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "build",
        data: { moduleType, tier, cost, coordinates: coords },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "build", {
    moduleType,
    tier,
    cost,
    moduleCount: moduleCount + 1,
  });

  // Grant XP — higher tiers grant more XP
  const tierXP: Record<string, number> = {
    COMMON: 50,
    UNCOMMON: 75,
    RARE: 100,
    EPIC: 150,
    LEGENDARY: 250,
  };
  grantXP(playerId, tierXP[tier] ?? 50, "build_module").catch(() => {});
  checkAchievements(playerId).catch(() => {});

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

  // Grant XP and check achievements (fire-and-forget)
  grantXP(playerId, 10, "collect_earnings").catch(() => {});
  checkAchievements(playerId).catch(() => {});

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

  // Grant XP and check achievements (fire-and-forget)
  grantXP(playerId, 25, "upgrade_module").catch(() => {});
  checkAchievements(playerId).catch(() => {});

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

// --- Crew Recruitment ---

const CREW_HIRE_COST = 200;
const MAX_CREW = 5;

const CREW_FIRST_NAMES = [
  "Kai",
  "Yuki",
  "Reza",
  "Anya",
  "Felix",
  "Nia",
  "Oleg",
  "Suki",
  "Leo",
  "Mira",
  "Dax",
  "Zara",
  "Jin",
  "Tess",
  "Igor",
];

const CREW_LAST_NAMES = [
  "Voss",
  "Chen",
  "Okafor",
  "Park",
  "Singh",
  "Reyes",
  "Kim",
  "Tanaka",
  "Novak",
  "Petrov",
  "Lam",
  "Anders",
  "Torres",
  "Sato",
  "Fernandez",
];

const CREW_ROLES = [
  "engineer",
  "geologist",
  "pilot",
  "scientist",
  "medic",
] as const;

function randomPick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Map crew role → natural module specialty */
const ROLE_SPECIALTY: Record<string, ModuleType[]> = {
  engineer: ["SOLAR_PANEL", "OXYGEN_GENERATOR", "STORAGE_DEPOT"],
  geologist: ["MINING_RIG", "WATER_EXTRACTOR"],
  pilot: ["LAUNCH_PAD"],
  scientist: ["RESEARCH_LAB"],
  medic: ["HABITAT", "OXYGEN_GENERATOR"],
};

export interface RecruitedCrew {
  id: string;
  name: string;
  role: string;
  specialty: ModuleType | null;
  level: number;
  efficiencyBonus: number;
  outputBonus: number;
}

/**
 * Recruit a random crew member. Costs $LUNAR, respects the max cap.
 */
export async function recruitCrew(playerId: string): Promise<{
  success: boolean;
  error?: string;
  crew?: RecruitedCrew;
  cost?: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { success: false, error: "Player not found" };

  const existingCount = await prisma.crewMember.count({
    where: { playerId, isActive: true, deletedAt: null },
  });
  if (existingCount >= MAX_CREW) {
    return { success: false, error: `Crew full (${MAX_CREW}/${MAX_CREW})` };
  }

  const balance = d(player.lunarBalance);
  if (balance < CREW_HIRE_COST) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${CREW_HIRE_COST}, have ${Math.floor(balance)}.`,
    };
  }

  // Generate random crew member
  const firstName = randomPick(CREW_FIRST_NAMES);
  const lastName = randomPick(CREW_LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const role = randomPick(CREW_ROLES);
  const specialtyCandidates = ROLE_SPECIALTY[role] ?? [];
  const specialty =
    specialtyCandidates.length > 0 ? randomPick(specialtyCandidates) : null;
  const efficiencyBonus = randomInt(3, 12);
  const outputBonus = randomInt(5, 15);

  const newBalance = balance - CREW_HIRE_COST;

  const [, newCrew] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: player.version },
      data: {
        lunarBalance: { decrement: CREW_HIRE_COST },
        crewCount: { increment: 1 },
        version: { increment: 1 },
      },
    }),
    prisma.crewMember.create({
      data: {
        playerId,
        name,
        role,
        specialty,
        efficiencyBonus,
        outputBonus,
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "BUILD",
        resource: "LUNAR",
        amount: -CREW_HIRE_COST,
        balanceAfter: newBalance,
        description: `Recruited ${name} (${role})`,
        metadata: { crewName: name, role, specialty },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "recruit",
        data: { crewName: name, role, specialty, cost: CREW_HIRE_COST },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "recruit", {
    crewName: name,
    role,
    specialty,
    cost: CREW_HIRE_COST,
    crewCount: existingCount + 1,
  });

  return {
    success: true,
    cost: CREW_HIRE_COST,
    crew: {
      id: newCrew.id,
      name: newCrew.name,
      role: newCrew.role,
      specialty: newCrew.specialty as ModuleType | null,
      level: newCrew.level,
      efficiencyBonus: d(newCrew.efficiencyBonus),
      outputBonus: d(newCrew.outputBonus),
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

// --- Module Activate / Deactivate ---

/**
 * Toggle a module's active state.
 */
export async function toggleModule(
  playerId: string,
  moduleId: string,
): Promise<{ success: boolean; error?: string; isActive?: boolean }> {
  const mod = await prisma.module.findFirst({
    where: { id: moduleId, playerId, deletedAt: null },
  });
  if (!mod) return { success: false, error: "Module not found" };

  const newActive = !mod.isActive;
  await prisma.module.update({
    where: { id: moduleId, version: mod.version },
    data: { isActive: newActive, version: { increment: 1 } },
  });

  GameMetrics.trackPlayerAction(playerId, "toggle_module", {
    moduleId,
    moduleType: mod.type,
    isActive: newActive,
  });

  return { success: true, isActive: newActive };
}

// --- Module Repair ---

const REPAIR_COST_PER_POINT = 5; // $LUNAR per efficiency % restored

/**
 * Repair a module back to full efficiency. Costs $LUNAR based on damage.
 */
export async function repairModule(
  playerId: string,
  moduleId: string,
): Promise<{
  success: boolean;
  error?: string;
  cost?: number;
  newEfficiency?: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { success: false, error: "Player not found" };

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, playerId, deletedAt: null },
  });
  if (!mod) return { success: false, error: "Module not found" };

  const currentEff = d(mod.efficiency);
  if (currentEff >= 100) {
    return { success: false, error: "Module is already at full efficiency" };
  }

  const damage = 100 - currentEff;
  const cost = Math.ceil(damage * REPAIR_COST_PER_POINT);
  const balance = d(player.lunarBalance);

  if (balance < cost) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${cost}, have ${Math.floor(balance)}.`,
    };
  }

  const newBalance = balance - cost;

  await prisma.$transaction([
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
        efficiency: 100,
        ageInCycles: 0,
        version: { increment: 1 },
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "BUILD",
        resource: "LUNAR",
        amount: -cost,
        balanceAfter: newBalance,
        description: `Repaired ${mod.type} (${Math.round(damage)}% damage)`,
        metadata: { moduleId, moduleType: mod.type, damage, cost },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "repair", {
    moduleType: mod.type,
    damage,
    cost,
  });

  return { success: true, cost, newEfficiency: 100 };
}

// --- Module Demolish ---

const DEMOLISH_REFUND_PERCENT = 25; // get back 25% of build cost

/**
 * Soft-delete a module. Refunds a fraction of build cost.
 */
export async function demolishModule(
  playerId: string,
  moduleId: string,
): Promise<{ success: boolean; error?: string; refund?: number }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { success: false, error: "Player not found" };

  const mod = await prisma.module.findFirst({
    where: { id: moduleId, playerId, deletedAt: null },
  });
  if (!mod) return { success: false, error: "Module not found" };

  // Calculate refund based on base build cost
  const baseCost = STARTER_BASE_OUTPUT[mod.type as ModuleType]
    ? calculateModuleCost(mod.type as ModuleType, 0)
    : 100;
  const refund = Math.floor(baseCost * (DEMOLISH_REFUND_PERCENT / 100));
  const newBalance = d(player.lunarBalance) + refund;

  // Unassign any crew on this module
  await prisma.crewMember.updateMany({
    where: { assignedModuleId: moduleId, playerId },
    data: { assignedModuleId: null },
  });

  await prisma.$transaction([
    prisma.module.update({
      where: { id: moduleId },
      data: { deletedAt: new Date(), isActive: false },
    }),
    prisma.player.update({
      where: { id: playerId, version: player.version },
      data: {
        lunarBalance: { increment: refund },
        moduleCount: { decrement: 1 },
        version: { increment: 1 },
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "REFUND",
        resource: "LUNAR",
        amount: refund,
        balanceAfter: newBalance,
        description: `Demolished ${mod.type} (+${refund} refund)`,
        metadata: { moduleId, moduleType: mod.type, refund },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "demolish",
        data: { moduleId, moduleType: mod.type, refund },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "demolish", {
    moduleType: mod.type,
    refund,
  });

  return { success: true, refund };
}

// --- XP & Leveling ---

/**
 * XP thresholds: XP needed = 100 * level^1.5
 */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Grant XP and automatically level up if threshold is reached.
 * Returns the new level if a level-up occurred.
 */
export async function grantXP(
  playerId: string,
  amount: number,
  reason: string,
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { newXP: 0, newLevel: 1, leveledUp: false };

  let currentXP = d(player.xp) + amount;
  let currentLevel = player.level;
  let leveledUp = false;

  // Check for multi-level ups
  while (currentXP >= xpForLevel(currentLevel)) {
    currentXP -= xpForLevel(currentLevel);
    currentLevel++;
    leveledUp = true;
  }

  await prisma.player.update({
    where: { id: playerId },
    data: {
      xp: currentXP,
      level: currentLevel,
    },
  });

  if (leveledUp) {
    await prisma.gameEvent.create({
      data: {
        playerId,
        type: "level_up",
        data: { newLevel: currentLevel, xpGranted: amount, reason },
      },
    });
    GameMetrics.trackPlayerAction(playerId, "level_up", {
      newLevel: currentLevel,
      xpGranted: amount,
    });
  }

  return { newXP: currentXP, newLevel: currentLevel, leveledUp };
}

// --- Daily Rewards ---

const DAILY_REWARD_BASE = 50;
const DAILY_STREAK_MULTIPLIER = 1.1;
const MAX_DAILY_STREAK = 30;

/**
 * Claim the daily login reward. Grows with streak.
 */
export async function claimDailyReward(playerId: string): Promise<{
  success: boolean;
  error?: string;
  reward?: number;
  streak?: number;
  xpGained?: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { success: false, error: "Player not found" };

  const now = new Date();
  const lastDaily = player.lastDailyAt;

  if (lastDaily) {
    const lastDate = new Date(lastDaily);
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const lastDailyDate = new Date(
      lastDate.getFullYear(),
      lastDate.getMonth(),
      lastDate.getDate(),
    );

    if (lastDailyDate.getTime() === todayStart.getTime()) {
      return { success: false, error: "Already claimed today's reward!" };
    }

    // Check if streak continues (claimed yesterday)
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = lastDailyDate.getTime() === yesterday.getTime();
    if (!isConsecutive) {
      // Break the streak
      await prisma.player.update({
        where: { id: playerId },
        data: { dailyStreak: 0 },
      });
    }
  }

  // Reload to get potentially reset streak
  const freshPlayer = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!freshPlayer) return { success: false, error: "Player not found" };

  const newStreak = Math.min(freshPlayer.dailyStreak + 1, MAX_DAILY_STREAK);
  const streakMultiplier = Math.pow(
    DAILY_STREAK_MULTIPLIER,
    Math.min(newStreak - 1, MAX_DAILY_STREAK - 1),
  );
  const reward = Math.floor(DAILY_REWARD_BASE * streakMultiplier);
  const xpGained = 10 + newStreak * 2; // Bonus XP for streak
  const newBalance = d(freshPlayer.lunarBalance) + reward;

  await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: freshPlayer.version },
      data: {
        lunarBalance: { increment: reward },
        dailyStreak: newStreak,
        lastDailyAt: now,
        version: { increment: 1 },
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "DAILY_REWARD",
        resource: "LUNAR",
        amount: reward,
        balanceAfter: newBalance,
        description: `Day ${newStreak} streak reward`,
        metadata: { streak: newStreak, multiplier: streakMultiplier },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "daily_reward",
        data: { streak: newStreak, reward, xpGained },
      },
    }),
  ]);

  // Grant XP for daily claim
  await grantXP(playerId, xpGained, "daily_reward");

  GameMetrics.trackPlayerAction(playerId, "daily_reward", {
    streak: newStreak,
    reward,
    xpGained,
  });

  return { success: true, reward, streak: newStreak, xpGained };
}

// --- Achievement System ---

interface AchievementCheck {
  key: string;
  check: (stats: {
    moduleCount: number;
    level: number;
    totalEarnings: number;
    crewCount: number;
  }) => boolean;
}

const ACHIEVEMENT_CHECKS: AchievementCheck[] = [
  { key: "first_module", check: (s) => s.moduleCount >= 1 },
  { key: "five_modules", check: (s) => s.moduleCount >= 5 },
  { key: "ten_modules", check: (s) => s.moduleCount >= 10 },
  { key: "twenty_modules", check: (s) => s.moduleCount >= 20 },
  { key: "level_5", check: (s) => s.level >= 5 },
  { key: "level_10", check: (s) => s.level >= 10 },
  { key: "first_1k", check: (s) => s.totalEarnings >= 1000 },
  { key: "first_10k", check: (s) => s.totalEarnings >= 10000 },
  { key: "first_100k", check: (s) => s.totalEarnings >= 100000 },
  { key: "first_crew", check: (s) => s.crewCount >= 1 },
  { key: "full_crew", check: (s) => s.crewCount >= 5 },
];

/**
 * Check and grant any newly-earned achievements.
 * Call after state-changing actions (build, upgrade, collect, etc.)
 */
export async function checkAchievements(playerId: string): Promise<{
  newAchievements: Array<{
    key: string;
    name: string;
    xpReward: number;
    lunarReward: number;
  }>;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) return { newAchievements: [] };

  const stats = {
    moduleCount: player.moduleCount,
    level: player.level,
    totalEarnings: d(player.totalEarnings),
    crewCount: player.crewCount,
  };

  // Get already-unlocked achievement keys
  const existing = await prisma.playerAchievement.findMany({
    where: { playerId },
    select: { achievement: { select: { key: true } } },
  });
  const alreadyUnlocked = new Set(existing.map((e) => e.achievement.key));

  const newlyEarned: Array<{
    key: string;
    name: string;
    xpReward: number;
    lunarReward: number;
  }> = [];

  for (const ac of ACHIEVEMENT_CHECKS) {
    if (alreadyUnlocked.has(ac.key)) continue;
    if (!ac.check(stats)) continue;

    // Find the achievement definition
    const achievement = await prisma.achievement.findUnique({
      where: { key: ac.key },
    });
    if (!achievement) continue;

    // Grant achievement
    await prisma.playerAchievement.create({
      data: {
        playerId,
        achievementId: achievement.id,
        progress: achievement.threshold,
      },
    });

    // Grant rewards
    const lunarReward = d(achievement.lunarReward);
    if (lunarReward > 0) {
      await prisma.player.update({
        where: { id: playerId },
        data: { lunarBalance: { increment: lunarReward } },
      });
      await prisma.transaction.create({
        data: {
          playerId,
          type: "ACHIEVEMENT",
          resource: "LUNAR",
          amount: lunarReward,
          balanceAfter: d(player.lunarBalance) + lunarReward,
          description: `Achievement: ${achievement.name}`,
          metadata: { achievementKey: ac.key },
        },
      });
    }

    if (achievement.xpReward > 0) {
      await grantXP(playerId, achievement.xpReward, `achievement_${ac.key}`);
    }

    newlyEarned.push({
      key: ac.key,
      name: achievement.name,
      xpReward: achievement.xpReward,
      lunarReward,
    });

    await prisma.gameEvent.create({
      data: {
        playerId,
        type: "achievement",
        data: { key: ac.key, name: achievement.name },
      },
    });
  }

  return { newAchievements: newlyEarned };
}

// --- Alliance System ---

const ALLIANCE_CREATE_COST = 1000;
const ALLIANCE_MAX_MEMBERS = 10;

/**
 * Create a new alliance. Player becomes LEADER.
 */
export async function createAlliance(
  playerId: string,
  name: string,
  description?: string,
): Promise<{ success: boolean; error?: string; allianceId?: string }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { allianceMember: true },
  });
  if (!player) return { success: false, error: "Player not found" };
  if (player.allianceMember) {
    return { success: false, error: "Already in an alliance. Leave first." };
  }

  const balance = d(player.lunarBalance);
  if (balance < ALLIANCE_CREATE_COST) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${ALLIANCE_CREATE_COST}, have ${Math.floor(balance)}.`,
    };
  }

  // Check name uniqueness
  const exists = await prisma.alliance.findUnique({ where: { name } });
  if (exists) {
    return { success: false, error: "Alliance name already taken" };
  }

  const newBalance = balance - ALLIANCE_CREATE_COST;

  const [, alliance] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId, version: player.version },
      data: {
        lunarBalance: { decrement: ALLIANCE_CREATE_COST },
        version: { increment: 1 },
      },
    }),
    prisma.alliance.create({
      data: {
        name,
        description: description ?? null,
        memberCount: 1,
        maxMembers: ALLIANCE_MAX_MEMBERS,
        members: {
          create: {
            playerId,
            role: "LEADER",
          },
        },
      },
    }),
    prisma.transaction.create({
      data: {
        playerId,
        type: "BUILD",
        resource: "LUNAR",
        amount: -ALLIANCE_CREATE_COST,
        balanceAfter: newBalance,
        description: `Created alliance "${name}"`,
        metadata: { allianceName: name },
      },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "alliance_create",
        data: { allianceName: name },
      },
    }),
  ]);

  GameMetrics.trackPlayerAction(playerId, "alliance_create", {
    allianceName: name,
    cost: ALLIANCE_CREATE_COST,
  });

  return { success: true, allianceId: alliance.id };
}

/**
 * Join an existing alliance.
 */
export async function joinAlliance(
  playerId: string,
  allianceId: string,
): Promise<{ success: boolean; error?: string }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { allianceMember: true },
  });
  if (!player) return { success: false, error: "Player not found" };
  if (player.allianceMember) {
    return { success: false, error: "Already in an alliance. Leave first." };
  }

  const alliance = await prisma.alliance.findUnique({
    where: { id: allianceId, deletedAt: null },
  });
  if (!alliance) return { success: false, error: "Alliance not found" };
  if (alliance.memberCount >= alliance.maxMembers) {
    return { success: false, error: "Alliance is full" };
  }

  await prisma.$transaction([
    prisma.allianceMember.create({
      data: {
        playerId,
        allianceId,
        role: "MEMBER",
      },
    }),
    prisma.alliance.update({
      where: { id: allianceId },
      data: { memberCount: { increment: 1 } },
    }),
    prisma.gameEvent.create({
      data: {
        playerId,
        type: "alliance_join",
        data: { allianceId, allianceName: alliance.name },
      },
    }),
  ]);

  return { success: true };
}

/**
 * Leave current alliance.
 */
export async function leaveAlliance(
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  const member = await prisma.allianceMember.findUnique({
    where: { playerId },
    include: { alliance: true },
  });
  if (!member) return { success: false, error: "Not in an alliance" };

  if (member.role === "LEADER" && member.alliance.memberCount > 1) {
    return {
      success: false,
      error: "Leaders must transfer leadership or disband the alliance first",
    };
  }

  await prisma.$transaction([
    prisma.allianceMember.delete({ where: { id: member.id } }),
    prisma.alliance.update({
      where: { id: member.allianceId },
      data: {
        memberCount: { decrement: 1 },
        ...(member.alliance.memberCount <= 1 ? { deletedAt: new Date() } : {}),
      },
    }),
  ]);

  return { success: true };
}

// --- Price Alert ---

/**
 * Create a price alert for a resource.
 */
export async function createPriceAlert(
  playerId: string,
  resource: string,
  targetPrice: number,
  direction: "above" | "below",
): Promise<{ success: boolean; error?: string; alertId?: string }> {
  const currentPrice = await prisma.resourcePrice.findUnique({
    where: {
      type: resource as
        | "LUNAR"
        | "REGOLITH"
        | "WATER_ICE"
        | "HELIUM3"
        | "RARE_EARTH",
    },
  });
  if (!currentPrice) return { success: false, error: "Unknown resource" };

  const alert = await prisma.priceAlert.create({
    data: {
      playerId,
      resource: resource as
        | "LUNAR"
        | "REGOLITH"
        | "WATER_ICE"
        | "HELIUM3"
        | "RARE_EARTH",
      priceAtAlert: d(currentPrice.currentPrice),
      changePercent: 0,
      direction,
      message: `Alert: ${resource} ${direction} ${targetPrice}`,
    },
  });

  return { success: true, alertId: alert.id };
}

/**
 * Get all alerts for a player.
 */
export async function getPlayerAlerts(playerId: string) {
  return prisma.priceAlert.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Mark an alert as read.
 */
export async function markAlertRead(
  playerId: string,
  alertId: string,
): Promise<{ success: boolean }> {
  await prisma.priceAlert.updateMany({
    where: { id: alertId, playerId },
    data: { isRead: true },
  });
  return { success: true };
}

// --- GameConfig Runtime Reading ---

const configCache = new Map<string, { value: unknown; fetchedAt: number }>();
const CONFIG_TTL = 60_000; // 1 minute cache

/**
 * Read a GameConfig value from DB with in-memory caching.
 * Falls back to defaultValue if key not found.
 */
export async function getGameConfig<T>(
  key: string,
  defaultValue: T,
): Promise<T> {
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CONFIG_TTL) {
    return cached.value as T;
  }

  const config = await prisma.gameConfig.findUnique({
    where: { key },
  });

  if (!config) return defaultValue;

  const value = config.value as T;
  configCache.set(key, { value, fetchedAt: Date.now() });
  return value;
}

export const gameEngine = {
  getOrCreatePlayer,
  calculateColonyState,
  calculateModuleCost,
  buildModule,
  upgradeModule,
  recruitCrew,
  assignCrew,
  collectEarnings,
  syncPlayerSummary,
  toggleModule,
  repairModule,
  demolishModule,
  grantXP,
  claimDailyReward,
  checkAchievements,
  createAlliance,
  joinAlliance,
  leaveAlliance,
  createPriceAlert,
  getPlayerAlerts,
  markAlertRead,
  getGameConfig,
};

export default gameEngine;
