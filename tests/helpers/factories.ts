/**
 * Test Factories — generate realistic game data for tests.
 *
 * Every factory returns plain objects that match the shapes expected
 * by the engine functions. No Prisma dependency — these are pure data builders.
 */

import type { ModuleType, Tier, ResourceType } from "@/lib/utils";
import type { ModuleProductionRow } from "@/lib/production-engine";
import type { ModifierSet } from "@/lib/event-engine";

// ---------------------------------------------------------------------------
// Module Factory
// ---------------------------------------------------------------------------

const DEFAULT_MODULE: ModuleProductionRow = {
  moduleId: "mod_test_1",
  moduleType: "SOLAR_PANEL",
  tier: "COMMON",
  level: 1,
  efficiency: 100,
  baseOutput: 10,
  bonusOutput: 0,
  ageInCycles: 0,
  crewSpecialty: null,
  crewOutputBonus: 0,
  crewEfficiencyBonus: 0,
};

let moduleCounter = 0;

export function createModule(
  overrides: Partial<ModuleProductionRow> = {},
): ModuleProductionRow {
  moduleCounter++;
  return {
    ...DEFAULT_MODULE,
    moduleId: `mod_test_${moduleCounter}`,
    ...overrides,
  };
}

/** Create a standard starter colony (4 modules). */
export function createStarterColony(): ModuleProductionRow[] {
  return [
    createModule({ moduleType: "SOLAR_PANEL", baseOutput: 10 }),
    createModule({ moduleType: "MINING_RIG", baseOutput: 25 }),
    createModule({ moduleType: "HABITAT", baseOutput: 5 }),
    createModule({ moduleType: "WATER_EXTRACTOR", baseOutput: 20 }),
  ];
}

/** Create a mid-game colony with varied tiers and levels. */
export function createMidGameColony(): ModuleProductionRow[] {
  return [
    createModule({
      moduleType: "SOLAR_PANEL",
      tier: "UNCOMMON",
      level: 3,
      baseOutput: 15,
    }),
    createModule({
      moduleType: "SOLAR_PANEL",
      tier: "COMMON",
      level: 2,
      baseOutput: 10,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "RARE",
      level: 2,
      baseOutput: 56,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "COMMON",
      level: 1,
      baseOutput: 25,
    }),
    createModule({
      moduleType: "HABITAT",
      tier: "COMMON",
      level: 1,
      baseOutput: 5,
    }),
    createModule({
      moduleType: "RESEARCH_LAB",
      tier: "UNCOMMON",
      level: 2,
      baseOutput: 22,
    }),
    createModule({
      moduleType: "WATER_EXTRACTOR",
      tier: "COMMON",
      level: 1,
      baseOutput: 20,
    }),
    createModule({
      moduleType: "STORAGE_DEPOT",
      tier: "COMMON",
      level: 1,
      baseOutput: 8,
    }),
  ];
}

/** Create an endgame colony (20 max modules, high tiers). */
export function createEndGameColony(): ModuleProductionRow[] {
  return [
    createModule({
      moduleType: "SOLAR_PANEL",
      tier: "LEGENDARY",
      level: 10,
      baseOutput: 50,
    }),
    createModule({
      moduleType: "SOLAR_PANEL",
      tier: "EPIC",
      level: 8,
      baseOutput: 33,
    }),
    createModule({
      moduleType: "SOLAR_PANEL",
      tier: "RARE",
      level: 5,
      baseOutput: 22,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "LEGENDARY",
      level: 10,
      baseOutput: 125,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "EPIC",
      level: 7,
      baseOutput: 84,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "RARE",
      level: 5,
      baseOutput: 56,
    }),
    createModule({
      moduleType: "MINING_RIG",
      tier: "UNCOMMON",
      level: 3,
      baseOutput: 37,
    }),
    createModule({
      moduleType: "HABITAT",
      tier: "EPIC",
      level: 6,
      baseOutput: 18,
    }),
    createModule({
      moduleType: "HABITAT",
      tier: "RARE",
      level: 4,
      baseOutput: 12,
    }),
    createModule({
      moduleType: "RESEARCH_LAB",
      tier: "LEGENDARY",
      level: 10,
      baseOutput: 75,
    }),
    createModule({
      moduleType: "RESEARCH_LAB",
      tier: "EPIC",
      level: 7,
      baseOutput: 50,
    }),
    createModule({
      moduleType: "WATER_EXTRACTOR",
      tier: "LEGENDARY",
      level: 10,
      baseOutput: 100,
    }),
    createModule({
      moduleType: "WATER_EXTRACTOR",
      tier: "RARE",
      level: 5,
      baseOutput: 45,
    }),
    createModule({
      moduleType: "OXYGEN_GENERATOR",
      tier: "EPIC",
      level: 6,
      baseOutput: 60,
    }),
    createModule({
      moduleType: "OXYGEN_GENERATOR",
      tier: "RARE",
      level: 4,
      baseOutput: 40,
    }),
    createModule({
      moduleType: "STORAGE_DEPOT",
      tier: "RARE",
      level: 4,
      baseOutput: 18,
    }),
    createModule({
      moduleType: "STORAGE_DEPOT",
      tier: "UNCOMMON",
      level: 2,
      baseOutput: 12,
    }),
    createModule({
      moduleType: "LAUNCH_PAD",
      tier: "LEGENDARY",
      level: 10,
      baseOutput: 250,
    }),
    createModule({
      moduleType: "LAUNCH_PAD",
      tier: "EPIC",
      level: 7,
      baseOutput: 168,
    }),
    createModule({
      moduleType: "LAUNCH_PAD",
      tier: "RARE",
      level: 5,
      baseOutput: 112,
    }),
  ];
}

/** Create a module with assigned crew. */
export function createModuleWithCrew(
  moduleOverrides: Partial<ModuleProductionRow> = {},
  crewOverrides: {
    specialty?: ModuleType | null;
    outputBonus?: number;
    efficiencyBonus?: number;
  } = {},
): ModuleProductionRow {
  const moduleType = moduleOverrides.moduleType ?? "SOLAR_PANEL";
  return createModule({
    ...moduleOverrides,
    crewSpecialty: crewOverrides.specialty ?? moduleType, // Default: specialty match
    crewOutputBonus: crewOverrides.outputBonus ?? 15,
    crewEfficiencyBonus: crewOverrides.efficiencyBonus ?? 10,
  });
}

/** Create an aged module (past diminishing returns threshold). */
export function createAgedModule(
  ageInCycles: number,
  moduleOverrides: Partial<ModuleProductionRow> = {},
): ModuleProductionRow {
  return createModule({ ageInCycles, ...moduleOverrides });
}

// ---------------------------------------------------------------------------
// Modifier Factory
// ---------------------------------------------------------------------------

export function createModifierSet(
  modifiers: Record<string, number> = {},
  eventNames: string[] = [],
): ModifierSet {
  return {
    modifiers,
    activeEventNames: eventNames,
    activeCount: eventNames.length,
  };
}

export const EMPTY_MODIFIERS: ModifierSet = {
  modifiers: {},
  activeEventNames: [],
  activeCount: 0,
};

export const PRODUCTION_RUSH_MODIFIERS: ModifierSet = {
  modifiers: {
    GLOBAL_PRODUCTION: 1.5,
    SOLAR_PANEL_OUTPUT: 1.75,
    MINING_RIG_OUTPUT: 1.75,
  },
  activeEventNames: ["Production Rush"],
  activeCount: 1,
};

export const SOLAR_FLARE_MODIFIERS: ModifierSet = {
  modifiers: {
    SOLAR_PANEL_OUTPUT: 0.3,
    POWER_DEPENDENT_MODULES: 0.5,
    STORAGE_DEPOT_OUTPUT: 2.0,
  },
  activeEventNames: ["Solar Flare"],
  activeCount: 1,
};

// ---------------------------------------------------------------------------
// Market Factory
// ---------------------------------------------------------------------------

export interface MockResourcePrice {
  type: ResourceType;
  basePrice: number;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number;
  supply: number;
  demand: number;
  seasonalPhase: number;
}

export function createResourcePrice(
  overrides: Partial<MockResourcePrice> = {},
): MockResourcePrice {
  return {
    type: "REGOLITH",
    basePrice: 2.5,
    currentPrice: 2.5,
    minPrice: 0.5,
    maxPrice: 10.0,
    volatility: 0.08,
    supply: 1000,
    demand: 1000,
    seasonalPhase: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Economy Simulation Helpers
// ---------------------------------------------------------------------------

/** Simulate N production ticks for a set of modules. */
export function simulateProductionTicks(
  modules: ModuleProductionRow[],
  ticks: number,
  calculateFn: (
    row: ModuleProductionRow,
    mods?: ModifierSet,
  ) => { output: number },
  modifiers?: ModifierSet,
): { totalProduced: number; perTick: number[] } {
  const perTick: number[] = [];
  let totalProduced = 0;

  for (let t = 0; t < ticks; t++) {
    let tickOutput = 0;
    for (const mod of modules) {
      tickOutput += calculateFn(mod, modifiers).output;
    }
    perTick.push(tickOutput);
    totalProduced += tickOutput;
  }

  return { totalProduced, perTick };
}

/** Calculate module build cost. */
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
  return Math.floor(baseCost * Math.pow(1.15, existingModuleCount));
}

/** Calculate ROI in days for a module purchase. */
export function calculateROI(moduleCost: number, dailyOutput: number): number {
  return moduleCost / Math.max(dailyOutput, 0.001);
}

// ---------------------------------------------------------------------------
// Statistical Helpers
// ---------------------------------------------------------------------------

/** Run a function N times and return statistical properties. */
export function runMonteCarlo<T extends number>(
  fn: () => T,
  iterations: number,
): {
  values: T[];
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  p5: number;
  p95: number;
} {
  const values: T[] = [];
  for (let i = 0; i < iterations; i++) {
    values.push(fn());
  }
  values.sort((a, b) => a - b);

  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    values,
    mean,
    stdDev,
    min: values[0]!,
    max: values[values.length - 1]!,
    median: values[Math.floor(values.length / 2)]!,
    p5: values[Math.floor(values.length * 0.05)]!,
    p95: values[Math.floor(values.length * 0.95)]!,
  };
}
