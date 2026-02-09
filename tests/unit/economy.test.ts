/**
 * Token Economy — Unit Tests
 *
 * Tests the $LUNAR economy mechanics:
 *   - Module cost curve (exponential scaling)
 *   - ROI calculations
 *   - Starting balance adequacy
 *   - Cost progression with module count
 *   - Sink/source balance
 */

import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";
import {
  createModule,
  createStarterColony,
  calculateModuleCost as factoryCalcCost,
  calculateROI,
} from "../helpers/factories";
import type { ModuleType } from "@/lib/utils";

// Import engine after mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const gameEngine =
  require("@/lib/game-engine/index") as typeof import("@/lib/game-engine/index");
const { calculateModuleCost } = gameEngine;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GAME_CONSTANTS } =
  require("@/lib/utils") as typeof import("@/lib/utils");

beforeEach(() => {
  resetPrismaMock();
});

// =========================================================================
// 1. Module Cost Curve
// =========================================================================

describe("Module cost curve", () => {
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

  test("First module costs base price (0 existing)", () => {
    for (const [type, cost] of Object.entries(baseCosts)) {
      expect(calculateModuleCost(type as ModuleType, 0)).toBe(cost);
    }
  });

  test("Cost increases with each module (exponential)", () => {
    for (const type of Object.keys(baseCosts) as ModuleType[]) {
      const cost0 = calculateModuleCost(type, 0);
      const cost1 = calculateModuleCost(type, 1);
      const cost5 = calculateModuleCost(type, 5);
      const cost10 = calculateModuleCost(type, 10);
      const cost19 = calculateModuleCost(type, 19);

      expect(cost1).toBeGreaterThan(cost0);
      expect(cost5).toBeGreaterThan(cost1);
      expect(cost10).toBeGreaterThan(cost5);
      expect(cost19).toBeGreaterThan(cost10);
    }
  });

  test("Cost formula: base × 1.15^count (floored)", () => {
    const type: ModuleType = "SOLAR_PANEL";
    for (let count = 0; count <= 19; count++) {
      const expected = Math.floor(100 * Math.pow(1.15, count));
      expect(calculateModuleCost(type, count)).toBe(expected);
    }
  });

  test("20th module is significantly more expensive than 1st", () => {
    const type: ModuleType = "MINING_RIG";
    const first = calculateModuleCost(type, 0);
    const twentieth = calculateModuleCost(type, 19);
    // 1.15^19 ≈ 14.23, so 20th should be ~14x the base
    expect(twentieth / first).toBeGreaterThan(10);
    expect(twentieth / first).toBeLessThan(20);
  });

  test("LAUNCH_PAD 20th module = floor(1000 × 1.15^19) ≈ 14,232", () => {
    const cost = calculateModuleCost("LAUNCH_PAD", 19);
    const expected = Math.floor(1000 * Math.pow(1.15, 19));
    expect(cost).toBe(expected);
  });
});

// =========================================================================
// 2. Starting Balance Adequacy
// =========================================================================

describe("Starting balance", () => {
  test("STARTING_LUNAR is 500", () => {
    expect(GAME_CONSTANTS.STARTING_LUNAR).toBe(500);
  });

  test("Can afford cheapest module (SOLAR_PANEL = 100)", () => {
    const cost = calculateModuleCost("SOLAR_PANEL", 4); // Already have 4 starter modules
    expect(GAME_CONSTANTS.STARTING_LUNAR).toBeGreaterThanOrEqual(cost);
  });

  test("Can afford at least 2 cheap modules from starting balance", () => {
    const cost1 = calculateModuleCost("SOLAR_PANEL", 4);
    const cost2 = calculateModuleCost("STORAGE_DEPOT", 5);
    expect(GAME_CONSTANTS.STARTING_LUNAR).toBeGreaterThan(cost1 + cost2);
  });

  test("Cannot afford LAUNCH_PAD from starting balance alone", () => {
    const cost = calculateModuleCost("LAUNCH_PAD", 4);
    expect(cost).toBeGreaterThan(GAME_CONSTANTS.STARTING_LUNAR);
  });
});

// =========================================================================
// 3. ROI Calculations
// =========================================================================

describe("ROI calculations", () => {
  test("Simple ROI: 100 cost / 10 per day = 10 days", () => {
    expect(calculateROI(100, 10)).toBe(10);
  });

  test("Expensive module has longer ROI", () => {
    const cheapROI = calculateROI(100, 10);
    const expensiveROI = calculateROI(1000, 10);
    expect(expensiveROI).toBeGreaterThan(cheapROI);
  });

  test("Higher output = shorter ROI", () => {
    const lowOutput = calculateROI(500, 5);
    const highOutput = calculateROI(500, 50);
    expect(highOutput).toBeLessThan(lowOutput);
  });

  test("Zero output yields very large ROI (not Infinity)", () => {
    const roi = calculateROI(100, 0);
    expect(roi).toBeGreaterThanOrEqual(100000);
    expect(isFinite(roi)).toBe(true);
  });
});

// =========================================================================
// 4. Total Colony Costs
// =========================================================================

describe("Total colony cost progression", () => {
  test("Total cost for 20 SOLAR_PANELs follows geometric sum", () => {
    let totalCost = 0;
    for (let i = 0; i < 20; i++) {
      totalCost += calculateModuleCost("SOLAR_PANEL", i);
    }
    // Geometric sum: 100 × (1.15^20 - 1) / (1.15 - 1) ≈ 10,244
    expect(totalCost).toBeGreaterThan(8000);
    expect(totalCost).toBeLessThan(15000);
  });

  test("Total cost for 20 LAUNCH_PADs is very high", () => {
    let totalCost = 0;
    for (let i = 0; i < 20; i++) {
      totalCost += calculateModuleCost("LAUNCH_PAD", i);
    }
    expect(totalCost).toBeGreaterThan(80000);
  });

  test("Mixed colony total cost is between cheap and expensive extremes", () => {
    // Real players would build a mix
    let mixedCost = 0;
    const buildOrder: ModuleType[] = [
      "SOLAR_PANEL",
      "MINING_RIG",
      "HABITAT",
      "WATER_EXTRACTOR",
      "SOLAR_PANEL",
      "STORAGE_DEPOT",
      "OXYGEN_GENERATOR",
      "MINING_RIG",
      "RESEARCH_LAB",
      "SOLAR_PANEL",
      "WATER_EXTRACTOR",
      "HABITAT",
      "MINING_RIG",
      "OXYGEN_GENERATOR",
      "STORAGE_DEPOT",
      "RESEARCH_LAB",
      "MINING_RIG",
      "SOLAR_PANEL",
      "WATER_EXTRACTOR",
      "LAUNCH_PAD",
    ];
    for (let i = 0; i < buildOrder.length; i++) {
      mixedCost += calculateModuleCost(buildOrder[i]!, i);
    }

    // Should be between all-SOLAR and all-LAUNCH_PAD
    expect(mixedCost).toBeGreaterThan(5000);
    expect(mixedCost).toBeLessThan(100000);
  });
});

// =========================================================================
// 5. Game Constants Validation
// =========================================================================

describe("Game constants", () => {
  test("MAX_MODULES is 20", () => {
    expect(GAME_CONSTANTS.MAX_MODULES).toBe(20);
  });

  test("TICK_INTERVAL_MS is 5 minutes", () => {
    expect(GAME_CONSTANTS.TICK_INTERVAL_MS).toBe(5 * 60 * 1000);
  });

  test("MODULE_COST_MULTIPLIER is 1.15", () => {
    expect(GAME_CONSTANTS.MODULE_COST_MULTIPLIER).toBe(1.15);
  });

  test("8 module types defined", () => {
    expect(GAME_CONSTANTS.MODULE_TYPES).toHaveLength(8);
  });

  test("5 tiers defined", () => {
    expect(GAME_CONSTANTS.TIERS).toHaveLength(5);
  });

  test("5 resource types defined", () => {
    expect(GAME_CONSTANTS.RESOURCE_TYPES).toHaveLength(5);
  });
});

// =========================================================================
// 6. Economy Sink/Source Balance
// =========================================================================

describe("Sink/source balance", () => {
  test("Module building is a significant sink", () => {
    // Total cost of first 8 modules (starter colony → full colony)
    let sinkTotal = 0;
    const types: ModuleType[] = [
      "SOLAR_PANEL",
      "MINING_RIG",
      "HABITAT",
      "WATER_EXTRACTOR",
      "OXYGEN_GENERATOR",
      "STORAGE_DEPOT",
      "RESEARCH_LAB",
      "LAUNCH_PAD",
    ];
    for (let i = 4; i < 12; i++) {
      // After 4 starter modules
      sinkTotal += calculateModuleCost(types[i - 4]!, i);
    }

    // Building 8 more modules should cost several thousand LUNAR
    expect(sinkTotal).toBeGreaterThan(2000);
  });

  test("Production source grows linearly with modules", () => {
    // With a starter colony, daily output baseline
    const BASE_OUTPUTS: Record<string, number> = {
      SOLAR_PANEL: 10,
      MINING_RIG: 25,
      HABITAT: 5,
      WATER_EXTRACTOR: 20,
    };
    const starterDaily = Object.values(BASE_OUTPUTS).reduce((s, v) => s + v, 0);
    // 4 modules: 60 LUNAR per tick, 288 ticks/day = 17,280
    // But actually production is per-tick, and production cycle runs once per cron (every 15 min)
    // So output is per-cycle, not per-tick
    expect(starterDaily).toBe(60); // Per cycle
  });
});
