/**
 * Core game engine for Lunar Colony Tycoon.
 *
 * Handles all game logic: colony management, resource production,
 * module building, and $LUNAR token economy.
 */

import prisma from "@/lib/database";
import { GAME_CONSTANTS, type ModuleType } from "@/lib/utils";

// --- Types ---

export interface ColonyState {
  playerId: string;
  colonyName: string;
  level: number;
  lunarBalance: number;
  modules: ModuleState[];
  productionRate: number;
  lastTick: Date;
  pendingEarnings: number;
}

export interface ModuleState {
  id: string;
  type: ModuleType;
  level: number;
  position: number;
  productionRate: number;
  isActive: boolean;
}

// --- Player Management ---

/**
 * Get or create a player by their Farcaster FID.
 * New players start with a default colony and starting $LUNAR.
 */
export async function getOrCreatePlayer(fid: number, username?: string) {
  let player = await prisma.player.findUnique({
    where: { fid },
    include: {
      colony: {
        include: { modules: true },
      },
    },
  });

  if (!player) {
    player = await prisma.player.create({
      data: {
        fid,
        username: username || `player_${fid}`,
        lunarBalance: GAME_CONSTANTS.STARTING_LUNAR,
        colony: {
          create: {
            name: `Colony #${fid}`,
            level: 1,
            // Start with a free solar panel
            modules: {
              create: {
                type: "solar_panel",
                level: 1,
                position: 0,
                productionRate: GAME_CONSTANTS.BASE_PRODUCTION_RATE,
                isActive: true,
              },
            },
          },
        },
      },
      include: {
        colony: {
          include: { modules: true },
        },
      },
    });
  }

  return player;
}

// --- Colony State ---

/**
 * Calculate the full colony state including pending earnings since last tick.
 */
export function calculateColonyState(
  player: Awaited<ReturnType<typeof getOrCreatePlayer>>,
): ColonyState {
  const colony = player.colony;
  if (!colony) {
    throw new Error(`Player ${player.fid} has no colony`);
  }

  const modules: ModuleState[] = colony.modules.map((m) => ({
    id: m.id,
    type: m.type as ModuleType,
    level: m.level,
    position: m.position,
    productionRate: m.productionRate,
    isActive: m.isActive,
  }));

  const totalProductionRate = modules
    .filter((m) => m.isActive)
    .reduce((sum, m) => sum + m.productionRate, 0);

  // Calculate earnings since last tick
  const now = new Date();
  const msElapsed = now.getTime() - colony.lastTick.getTime();
  const ticksElapsed = msElapsed / GAME_CONSTANTS.TICK_INTERVAL_MS;
  const pendingEarnings = Math.floor(ticksElapsed * totalProductionRate);

  return {
    playerId: player.id,
    colonyName: colony.name,
    level: colony.level,
    lunarBalance: player.lunarBalance,
    modules,
    productionRate: totalProductionRate,
    lastTick: colony.lastTick,
    pendingEarnings,
  };
}

// --- Module Management ---

/**
 * Calculate cost for building a new module based on how many the player has.
 */
export function calculateModuleCost(
  moduleType: ModuleType,
  existingModuleCount: number,
): number {
  const baseCosts: Record<ModuleType, number> = {
    solar_panel: 100,
    mining_rig: 250,
    habitat: 200,
    research_lab: 500,
    water_extractor: 300,
    oxygen_generator: 350,
    storage_depot: 150,
    launch_pad: 1000,
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
    include: { colony: { include: { modules: true } } },
  });

  if (!player?.colony) {
    return { success: false, error: "Colony not found" };
  }

  const moduleCount = player.colony.modules.length;

  if (moduleCount >= GAME_CONSTANTS.MAX_MODULES) {
    return { success: false, error: "Colony is full! Max modules reached." };
  }

  const cost = calculateModuleCost(moduleType, moduleCount);

  if (player.lunarBalance < cost) {
    return {
      success: false,
      error: `Not enough $LUNAR. Need ${cost}, have ${player.lunarBalance}.`,
    };
  }

  // Production rate based on module type
  const productionRates: Record<ModuleType, number> = {
    solar_panel: 10,
    mining_rig: 25,
    habitat: 5,
    research_lab: 15,
    water_extractor: 20,
    oxygen_generator: 18,
    storage_depot: 8,
    launch_pad: 50,
  };

  // Transactional: deduct cost and create module
  const [, newModule] = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { lunarBalance: { decrement: cost } },
    }),
    prisma.module.create({
      data: {
        colonyId: player.colony.id,
        type: moduleType,
        level: 1,
        position: moduleCount,
        productionRate: productionRates[moduleType],
        isActive: true,
      },
    }),
  ]);

  return {
    success: true,
    module: {
      id: newModule.id,
      type: newModule.type as ModuleType,
      level: newModule.level,
      position: newModule.position,
      productionRate: newModule.productionRate,
      isActive: newModule.isActive,
    },
  };
}

// --- Resource Collection ---

/**
 * Collect pending earnings and update the player's balance.
 * Called when a player interacts with the frame.
 */
export async function collectEarnings(playerId: string): Promise<{
  collected: number;
  newBalance: number;
}> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { colony: { include: { modules: true } } },
  });

  if (!player?.colony) {
    return { collected: 0, newBalance: 0 };
  }

  const state = calculateColonyState(player);

  if (state.pendingEarnings <= 0) {
    return { collected: 0, newBalance: player.lunarBalance };
  }

  const updated = await prisma.$transaction([
    prisma.player.update({
      where: { id: playerId },
      data: { lunarBalance: { increment: state.pendingEarnings } },
    }),
    prisma.colony.update({
      where: { id: player.colony.id },
      data: { lastTick: new Date() },
    }),
  ]);

  return {
    collected: state.pendingEarnings,
    newBalance: updated[0].lunarBalance,
  };
}

export const gameEngine = {
  getOrCreatePlayer,
  calculateColonyState,
  calculateModuleCost,
  buildModule,
  collectEarnings,
};

export default gameEngine;
