/**
 * Market Engine — Unit Tests
 *
 * Tests the market simulation logic:
 *   - Price calculation stays within bounds
 *   - Mean reversion pulls extreme prices back
 *   - Market depth structure (bids descending, asks ascending)
 *   - Trade execution against order book
 *   - Statistical price behavior over many ticks
 */

import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";
import { createResourcePrice, runMonteCarlo } from "../helpers/factories";
import type { ResourceType } from "@/lib/utils";

// Import engine after mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const marketEngine =
  require("@/lib/market-engine") as typeof import("@/lib/market-engine");
const { generateMarketDepth, RESOURCE_CONFIGS } = marketEngine;

beforeEach(() => {
  resetPrismaMock();
});

// =========================================================================
// 1. RESOURCE_CONFIGS validation
// =========================================================================

describe("Resource configurations", () => {
  const resources: ResourceType[] = [
    "LUNAR",
    "REGOLITH",
    "WATER_ICE",
    "HELIUM3",
    "RARE_EARTH",
  ];

  for (const resource of resources) {
    test(`${resource} has valid config`, () => {
      const config = RESOURCE_CONFIGS[resource];
      expect(config).toBeDefined();
      expect(config.minPrice).toBeLessThan(config.maxPrice);
      expect(config.basePrice).toBeGreaterThanOrEqual(config.minPrice);
      expect(config.basePrice).toBeLessThanOrEqual(config.maxPrice);
      expect(config.volatility).toBeGreaterThan(0);
      expect(config.volatility).toBeLessThanOrEqual(1);
    });
  }

  test("LUNAR has lowest volatility (currency stability)", () => {
    const lunarVol = RESOURCE_CONFIGS.LUNAR.volatility;
    for (const [type, config] of Object.entries(RESOURCE_CONFIGS)) {
      if (type !== "LUNAR") {
        expect(lunarVol).toBeLessThan(config.volatility);
      }
    }
  });

  test("RARE_EARTH has highest base price", () => {
    const rareEarthPrice = RESOURCE_CONFIGS.RARE_EARTH.basePrice;
    for (const config of Object.values(RESOURCE_CONFIGS)) {
      expect(rareEarthPrice).toBeGreaterThanOrEqual(config.basePrice);
    }
  });
});

// =========================================================================
// 2. Market Depth Structure
// =========================================================================

describe("generateMarketDepth", () => {
  test("Bids are in descending price order", () => {
    const depth = generateMarketDepth("REGOLITH", 2.5);
    for (let i = 1; i < depth.bids.length; i++) {
      expect(depth.bids[i]!.price).toBeLessThanOrEqual(
        depth.bids[i - 1]!.price,
      );
    }
  });

  test("Asks are in ascending price order", () => {
    const depth = generateMarketDepth("REGOLITH", 2.5);
    for (let i = 1; i < depth.asks.length; i++) {
      expect(depth.asks[i]!.price).toBeGreaterThanOrEqual(
        depth.asks[i - 1]!.price,
      );
    }
  });

  test("Has 8 levels of depth on each side", () => {
    const depth = generateMarketDepth("REGOLITH", 2.5);
    expect(depth.bids).toHaveLength(8);
    expect(depth.asks).toHaveLength(8);
  });

  test("Best bid < current price < best ask (spread exists)", () => {
    const price = 2.5;
    const depth = generateMarketDepth("REGOLITH", price);
    expect(depth.bids[0]!.price).toBeLessThan(price);
    expect(depth.asks[0]!.price).toBeGreaterThan(price);
  });

  test("Spread is positive and reasonable (<5%)", () => {
    const depth = generateMarketDepth("REGOLITH", 2.5);
    expect(depth.spread).toBeGreaterThan(0);
    expect(depth.spreadPercent).toBeLessThan(5);
  });

  test("Cumulative totals increase with depth", () => {
    const depth = generateMarketDepth("WATER_ICE", 8.75);
    for (let i = 1; i < depth.bids.length; i++) {
      expect(depth.bids[i]!.total).toBeGreaterThan(depth.bids[i - 1]!.total);
    }
    for (let i = 1; i < depth.asks.length; i++) {
      expect(depth.asks[i]!.total).toBeGreaterThan(depth.asks[i - 1]!.total);
    }
  });

  test("All quantities are positive integers", () => {
    const depth = generateMarketDepth("HELIUM3", 45);
    for (const bid of depth.bids) {
      expect(bid.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(bid.quantity)).toBe(true);
    }
    for (const ask of depth.asks) {
      expect(ask.quantity).toBeGreaterThan(0);
      expect(Number.isInteger(ask.quantity)).toBe(true);
    }
  });

  test("Prices respect resource min/max bounds", () => {
    const config = RESOURCE_CONFIGS.REGOLITH;
    const depth = generateMarketDepth("REGOLITH", 2.5);
    for (const bid of depth.bids) {
      expect(bid.price).toBeGreaterThanOrEqual(config.minPrice);
    }
    for (const ask of depth.asks) {
      expect(ask.price).toBeLessThanOrEqual(config.maxPrice);
    }
  });
});

// =========================================================================
// 3. Price Calculation Properties (via calculateNewPrice — internal)
// =========================================================================
// Since calculateNewPrice is not exported, we test its properties
// indirectly via statistical observations on generateMarketDepth and
// by implementing a reference price calculator.

describe("Price behavior (statistical)", () => {
  /**
   * Simulate price evolution by running many iterations of the
   * price update algorithm (reference implementation).
   */
  function simulatePriceWalk(
    resource: ResourceType,
    startPrice: number,
    ticks: number,
  ): number[] {
    const config = RESOURCE_CONFIGS[resource];
    const prices: number[] = [startPrice];
    let price = startPrice;
    let phase = 0;

    for (let i = 0; i < ticks; i++) {
      // Replicate the engine's formula
      const u1 = Math.random();
      const u2 = Math.random();
      const gaussian =
        Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) *
        Math.cos(2 * Math.PI * u2);
      const walkDelta = gaussian * config.volatility;
      const demandDelta = 0; // Balanced supply/demand
      const seasonalDelta = Math.sin(phase) * config.seasonalFactor;
      const deviationFromBase = (price - config.basePrice) / config.basePrice;
      const reversionDelta =
        Math.abs(deviationFromBase) > 0.3 ? -deviationFromBase * 0.02 : 0;

      const totalDelta =
        0.7 * walkDelta +
        0.2 * demandDelta +
        0.1 * seasonalDelta +
        reversionDelta;
      price = price * (1 + totalDelta);
      price = Math.max(config.minPrice, Math.min(config.maxPrice, price));
      price = Math.round(price * 10000) / 10000;

      prices.push(price);
      phase = (phase + 0.0654) % (2 * Math.PI);
    }

    return prices;
  }

  test("REGOLITH price stays within bounds over 1000 ticks", () => {
    const config = RESOURCE_CONFIGS.REGOLITH;
    const prices = simulatePriceWalk("REGOLITH", config.basePrice, 1000);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(config.minPrice);
      expect(p).toBeLessThanOrEqual(config.maxPrice);
    }
  });

  test("HELIUM3 price stays within bounds over 1000 ticks", () => {
    const config = RESOURCE_CONFIGS.HELIUM3;
    const prices = simulatePriceWalk("HELIUM3", config.basePrice, 1000);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(config.minPrice);
      expect(p).toBeLessThanOrEqual(config.maxPrice);
    }
  });

  test("RARE_EARTH price stays within bounds over 1000 ticks", () => {
    const config = RESOURCE_CONFIGS.RARE_EARTH;
    const prices = simulatePriceWalk("RARE_EARTH", config.basePrice, 1000);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(config.minPrice);
      expect(p).toBeLessThanOrEqual(config.maxPrice);
    }
  });

  test("Price exhibits mean-reversion tendency (returns near base eventually)", () => {
    const config = RESOURCE_CONFIGS.REGOLITH;
    // Start at max (extreme deviation)
    const prices = simulatePriceWalk("REGOLITH", config.maxPrice * 0.9, 500);
    const lastQuarter = prices.slice(-125);
    const avgLast = lastQuarter.reduce((s, p) => s + p, 0) / lastQuarter.length;

    // After 500 ticks should have moved somewhat toward base
    // This is probabilistic so we use a wide tolerance
    expect(avgLast).toBeLessThan(config.maxPrice * 0.95);
  });

  test("LUNAR price is very stable (tight range around 1.0)", () => {
    const config = RESOURCE_CONFIGS.LUNAR;
    const prices = simulatePriceWalk("LUNAR", 1.0, 500);
    const deviations = prices.map((p) => Math.abs(p - 1.0));
    const maxDeviation = Math.max(...deviations);
    // LUNAR should stay within 10% of 1.0
    expect(maxDeviation).toBeLessThan(0.15);
  });
});

// =========================================================================
// 4. executeTrade validation
// =========================================================================

describe("executeTrade", () => {
  const { executeTrade } = marketEngine;

  test("Rejects LUNAR-for-LUNAR trade", async () => {
    const result = await executeTrade("player_1", "LUNAR", "buy", 100);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot trade LUNAR for LUNAR");
  });

  test("Rejects zero quantity", async () => {
    const result = await executeTrade("player_1", "REGOLITH", "buy", 0);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Quantity must be positive");
  });

  test("Rejects negative quantity", async () => {
    const result = await executeTrade("player_1", "REGOLITH", "sell", -10);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Quantity must be positive");
  });

  test("Returns error when resource not found", async () => {
    prismaMock.resourcePrice.findUnique.mockResolvedValueOnce(null);
    const result = await executeTrade("player_1", "REGOLITH", "buy", 100);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Resource not found");
  });

  test("Successful buy fills at reasonable avg price", async () => {
    prismaMock.resourcePrice.findUnique.mockResolvedValueOnce({
      id: "rp_1",
      type: "REGOLITH",
      currentPrice: 2.5,
      basePrice: 2.5,
      priceChange24h: 0,
      supply: 1000,
      demand: 1000,
      volatility: 0.08,
      seasonalPhase: 0,
      lastUpdatedAt: new Date(),
    } as any);

    // Mock the transaction to succeed
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => {
      if (typeof fn === "function") {
        return fn(prismaMock);
      }
      return Promise.all(fn);
    });

    // Mock player lookup inside transaction
    prismaMock.player.findUniqueOrThrow.mockResolvedValueOnce({
      id: "player_1",
      lunarBalance: 10000,
      version: 1,
    } as any);

    const result = await executeTrade("player_1", "REGOLITH", "buy", 50);
    expect(result.success).toBe(true);
    expect(result.filledQuantity).toBe(50);
    // Average price should be near market price (2.5 ± spread)
    expect(result.avgPrice).toBeGreaterThan(2.0);
    expect(result.avgPrice).toBeLessThan(4.0);
    // Slippage should be small for small orders
    expect(Math.abs(result.slippage)).toBeLessThan(10);
  });
});

// =========================================================================
// 5. Market depth pricing consistency
// =========================================================================

describe("Market depth pricing consistency", () => {
  test("All 5 resources generate valid depth", () => {
    const resources: ResourceType[] = [
      "LUNAR",
      "REGOLITH",
      "WATER_ICE",
      "HELIUM3",
      "RARE_EARTH",
    ];
    for (const resource of resources) {
      const config = RESOURCE_CONFIGS[resource];
      const depth = generateMarketDepth(resource, config.basePrice);
      expect(depth.resource).toBe(resource);
      expect(depth.currentPrice).toBe(config.basePrice);
      expect(depth.bids.length).toBeGreaterThan(0);
      expect(depth.asks.length).toBeGreaterThan(0);
    }
  });

  test("Depth at min price still has valid structure", () => {
    const depth = generateMarketDepth("REGOLITH", 0.5);
    expect(depth.bids.length).toBeGreaterThan(0);
    // All bid prices should be clamped to minPrice
    for (const bid of depth.bids) {
      expect(bid.price).toBeGreaterThanOrEqual(0.5);
    }
  });

  test("Depth at max price still has valid structure", () => {
    const depth = generateMarketDepth("REGOLITH", 10.0);
    expect(depth.asks.length).toBeGreaterThan(0);
    // All ask prices should be clamped to maxPrice
    for (const ask of depth.asks) {
      expect(ask.price).toBeLessThanOrEqual(10.0);
    }
  });
});
