/**
 * Load Tests — Database Performance Simulation
 *
 * Simulates high-concurrency scenarios to test:
 *   - 1000 player production batch
 *   - Concurrent trade execution
 *   - Leaderboard query under load
 *
 * NOTE: These tests use mocked Prisma, so they validate
 * algorithmic scaling and memory usage, not actual DB latency.
 * For real DB load tests, run against a staging database.
 */

import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";
import {
  createModule,
  createStarterColony,
  createEndGameColony,
} from "../helpers/factories";

// Import after mocks
const { calculatePlayerProduction } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/production-engine") as typeof import("@/lib/production-engine");

const { generateMarketDepth } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/market-engine") as typeof import("@/lib/market-engine");

const { calculateColonyState } =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/game-engine/index") as typeof import("@/lib/game-engine/index");

beforeEach(() => {
  resetPrismaMock();
});

// =========================================================================
// 1. Bulk Production Calculation (1000 players)
// =========================================================================

describe("Bulk production (1000 players)", () => {
  test("Calculate production for 1000 starter colonies under 5s", async () => {
    const startTime = Date.now();
    const colony = createStarterColony();

    for (let i = 0; i < 1000; i++) {
      // Each call gets fresh mocks
      prismaMock.$queryRaw.mockResolvedValueOnce(colony);
      prismaMock.activeEvent.findMany.mockResolvedValueOnce([]);
    }

    const results = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        calculatePlayerProduction(`player_${i}`),
      ),
    );

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(5000); // Should complete in under 5s

    // All results should be consistent
    for (const result of results) {
      expect(result.totalLunar).toBe(60); // Starter = 10+25+5+20
      expect(result.activeModules).toBe(4);
    }
  }, 10000);

  test("Calculate production for 100 endgame colonies under 3s", async () => {
    const startTime = Date.now();
    const colony = createEndGameColony();

    for (let i = 0; i < 100; i++) {
      prismaMock.$queryRaw.mockResolvedValueOnce(colony);
      prismaMock.activeEvent.findMany.mockResolvedValueOnce([]);
    }

    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        calculatePlayerProduction(`player_${i}`),
      ),
    );

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(3000);

    // All endgame results should be large
    for (const result of results) {
      expect(result.totalLunar).toBeGreaterThan(5000);
      expect(result.activeModules).toBe(20);
    }
  }, 10000);
});

// =========================================================================
// 2. Concurrent Market Depth Generation
// =========================================================================

describe("Concurrent market depth generation", () => {
  test("Generate 1000 market depths under 1s", () => {
    const startTime = Date.now();
    const types = ["REGOLITH", "WATER_ICE", "HELIUM3", "RARE_EARTH"] as const;

    for (let i = 0; i < 1000; i++) {
      const resource = types[i % types.length]!;
      const depth = generateMarketDepth(resource, 10 + Math.random() * 100);
      expect(depth.bids.length).toBe(8);
      expect(depth.asks.length).toBe(8);
    }

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(1000);
  });
});

// =========================================================================
// 3. Colony State Calculation at Scale
// =========================================================================

describe("Colony state calculation at scale", () => {
  test("Calculate 1000 colony states under 500ms", () => {
    const startTime = Date.now();
    const now = new Date();

    for (let i = 0; i < 1000; i++) {
      const mockPlayer = {
        id: `player_${i}`,
        fid: i,
        username: `player_${i}`,
        level: Math.floor(Math.random() * 10) + 1,
        lunarBalance: Math.random() * 10000,
        modules: Array.from(
          { length: Math.floor(Math.random() * 20) + 1 },
          (_, j) => ({
            id: `m_${i}_${j}`,
            type: "SOLAR_PANEL",
            tier: "COMMON",
            level: 1,
            coordinates: { x: j % 5, y: Math.floor(j / 5) },
            baseOutput: 10,
            bonusOutput: 0,
            efficiency: 50 + Math.random() * 50,
            isActive: Math.random() > 0.1, // 90% active
            lastCollectedAt: new Date(
              now.getTime() - Math.random() * 60 * 60 * 1000,
            ),
          }),
        ),
      };

      const state = calculateColonyState(mockPlayer as never);
      expect(state.playerId).toBe(`player_${i}`);
    }

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(500);
  });
});

// =========================================================================
// 4. Memory Usage
// =========================================================================

describe("Memory usage", () => {
  test("Processing 1000 colonies does not leak excessive memory", async () => {
    const baseMemory = process.memoryUsage().heapUsed;

    const colony = createStarterColony();
    for (let i = 0; i < 1000; i++) {
      prismaMock.$queryRaw.mockResolvedValueOnce(colony);
      prismaMock.activeEvent.findMany.mockResolvedValueOnce([]);
    }

    await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        calculatePlayerProduction(`player_${i}`),
      ),
    );

    const peakMemory = process.memoryUsage().heapUsed;
    const memoryGrowthMB = (peakMemory - baseMemory) / 1024 / 1024;

    // Memory growth should be under 100MB for 1000 players
    expect(memoryGrowthMB).toBeLessThan(100);
  }, 10000);
});
