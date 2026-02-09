/**
 * Market Simulation Engine
 *
 * Simulates a dynamic resource market with:
 *   1. Price updates  — random walk (70%) + player demand (20%) + seasonality (10%)
 *   2. Demand calc    — aggregated module counts that consume each resource
 *   3. Market depth   — synthetic order book around current price
 *   4. Trading        — simulated order matching against depth
 *   5. Price history  — last 100 snapshots per resource, prune older data
 *   6. Price alerts   — notify players of significant movements (±10%)
 *
 * Entry points:
 *   - runMarketTick()         — called by cron every 15 min
 *   - executeTrade()          — called by player trade action
 *   - getMarketOverview()     — read-only snapshot for Frame display
 *   - getMarketDepth()        — order book for a single resource
 */

import prisma from "@/lib/database";
import type { ResourceType } from "@/lib/utils";
import { GameMetrics } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResourceConfig {
  type: ResourceType;
  basePrice: number;
  volatility: number; // 0–1: how wild the swings are
  seasonalFactor: number; // amplitude of the sine wave component
  minPrice: number;
  maxPrice: number;
  /** Which module types drive demand for this resource */
  demandDrivers: string[]; // ModuleType values
}

export interface PriceUpdate {
  type: ResourceType;
  previousPrice: number;
  newPrice: number;
  changePercent: number;
  supply: number;
  demand: number;
}

export interface MarketDepthOrder {
  price: number;
  quantity: number;
  total: number; // cumulative
}

export interface MarketDepth {
  resource: ResourceType;
  currentPrice: number;
  bids: MarketDepthOrder[]; // Buy orders (descending price)
  asks: MarketDepthOrder[]; // Sell orders (ascending price)
  spread: number;
  spreadPercent: number;
}

export interface TradeResult {
  success: boolean;
  resource: ResourceType;
  side: "buy" | "sell";
  requestedQuantity: number;
  filledQuantity: number;
  avgPrice: number;
  totalCost: number; // Positive for buy, negative (revenue) for sell
  slippage: number; // Difference from market price in %
  error?: string;
}

export interface MarketOverview {
  resources: Array<{
    type: ResourceType;
    currentPrice: number;
    priceChange24h: number;
    changePercent: number;
    supply: number;
    demand: number;
    trend: "up" | "down" | "stable";
  }>;
  lastUpdated: Date;
  alerts: Array<{
    resource: ResourceType;
    message: string;
    direction: string;
  }>;
}

export interface MarketTickResult {
  updates: PriceUpdate[];
  alertsCreated: number;
  historyPruned: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Resource configurations — defines the character of each market
// ---------------------------------------------------------------------------

export const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  LUNAR: {
    type: "LUNAR",
    basePrice: 1.0,
    volatility: 0.02, // Very stable (it's the currency)
    seasonalFactor: 0.005,
    minPrice: 0.9,
    maxPrice: 1.1,
    demandDrivers: [], // Everything uses LUNAR
  },
  REGOLITH: {
    type: "REGOLITH",
    basePrice: 2.5,
    volatility: 0.08,
    seasonalFactor: 0.03,
    minPrice: 0.5,
    maxPrice: 10.0,
    demandDrivers: ["MINING_RIG", "STORAGE_DEPOT"],
  },
  WATER_ICE: {
    type: "WATER_ICE",
    basePrice: 8.75,
    volatility: 0.12,
    seasonalFactor: 0.05,
    minPrice: 2.0,
    maxPrice: 30.0,
    demandDrivers: ["WATER_EXTRACTOR", "HABITAT", "OXYGEN_GENERATOR"],
  },
  HELIUM3: {
    type: "HELIUM3",
    basePrice: 45.0,
    volatility: 0.18,
    seasonalFactor: 0.08,
    minPrice: 10.0,
    maxPrice: 200.0,
    demandDrivers: ["RESEARCH_LAB", "LAUNCH_PAD"],
  },
  RARE_EARTH: {
    type: "RARE_EARTH",
    basePrice: 120.0,
    volatility: 0.25,
    seasonalFactor: 0.1,
    minPrice: 30.0,
    maxPrice: 500.0,
    demandDrivers: ["RESEARCH_LAB", "SOLAR_PANEL"],
  },
};

// Market depth generation parameters
const DEPTH_LEVELS = 8; // Orders per side
const DEPTH_SPREAD_PCT = 0.005; // 0.5% base spread
const DEPTH_QUANTITY_BASE = 100; // Base qty per level
const DEPTH_PRICE_STEP_PCT = 0.003; // 0.3% between levels

// Price alert threshold
const ALERT_THRESHOLD_PCT = 10; // Alert if price moves >10% in one tick

// Max history entries per resource before pruning
const MAX_HISTORY_PER_RESOURCE = 100;

// Demand cache (15 min TTL)
let demandCache: { data: Record<string, number>; expiresAt: number } | null =
  null;
const DEMAND_CACHE_TTL_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// 1. Price Update Algorithm
// ---------------------------------------------------------------------------

/**
 * Calculate the new price for a resource.
 *
 * Formula: newPrice = currentPrice × (1 + Δ)
 * Where Δ = 0.70 * randomWalk + 0.20 * demandPressure + 0.10 * seasonality
 *
 * Each component:
 *   - randomWalk: Gaussian noise scaled by volatility
 *   - demandPressure: (demand - supply) / max(supply, 1) clamped to [-0.1, 0.1]
 *   - seasonality: sin(phase) * seasonalFactor
 *
 * Result is clamped to [minPrice, maxPrice] with mean-reversion pull
 * when price is >2σ from base.
 */
function calculateNewPrice(
  currentPrice: number,
  config: ResourceConfig,
  demand: number,
  supply: number,
  seasonalPhase: number,
): {
  newPrice: number;
  components: {
    walk: number;
    demand: number;
    seasonal: number;
    reversion: number;
  };
} {
  // --- Random walk (Gaussian via Box-Muller) ---
  const u1 = Math.random();
  const u2 = Math.random();
  const gaussian =
    Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  const walkDelta = gaussian * config.volatility;

  // --- Demand pressure ---
  const effectiveSupply = Math.max(supply, 1);
  const rawDemandPressure = (demand - effectiveSupply) / effectiveSupply;
  const demandDelta = Math.max(-0.1, Math.min(0.1, rawDemandPressure * 0.5));

  // --- Seasonality (sine wave with advancing phase) ---
  const seasonalDelta = Math.sin(seasonalPhase) * config.seasonalFactor;

  // --- Mean reversion (pulls toward base when far away) ---
  const deviationFromBase =
    (currentPrice - config.basePrice) / config.basePrice;
  const reversionStrength = 0.02; // Gentle pull
  const reversionDelta =
    Math.abs(deviationFromBase) > 0.3
      ? -deviationFromBase * reversionStrength
      : 0;

  // --- Combine ---
  const totalDelta =
    0.7 * walkDelta + 0.2 * demandDelta + 0.1 * seasonalDelta + reversionDelta;

  let newPrice = currentPrice * (1 + totalDelta);

  // Clamp to bounds
  newPrice = Math.max(config.minPrice, Math.min(config.maxPrice, newPrice));

  // Round to 4 decimal places
  newPrice = Math.round(newPrice * 10000) / 10000;

  return {
    newPrice,
    components: {
      walk: walkDelta,
      demand: demandDelta,
      seasonal: seasonalDelta,
      reversion: reversionDelta,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Player Demand Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate aggregate player demand for each resource based on module counts.
 * Cached for 15 minutes to avoid hammering the DB.
 *
 * Demand = sum of modules that consume each resource, weighted by tier.
 * Supply = derived from production logs (recent output).
 */
async function calculatePlayerDemand(): Promise<Record<string, number>> {
  // Return from cache if fresh
  if (demandCache && Date.now() < demandCache.expiresAt) {
    return demandCache.data;
  }

  // Count active modules by type across all players
  const moduleCounts = await prisma.$queryRaw<
    Array<{ type: string; tier: string; count: bigint }>
  >`
    SELECT m."type"::text AS "type", m."tier"::text AS "tier", COUNT(*) AS "count"
    FROM "Module" m
    WHERE m."isActive" = true AND m."deletedAt" IS NULL
    GROUP BY m."type", m."tier"
  `;

  // Tier multipliers for demand weighting
  const tierWeight: Record<string, number> = {
    COMMON: 1,
    UNCOMMON: 1.5,
    RARE: 2.5,
    EPIC: 4,
    LEGENDARY: 7,
  };

  // Aggregate demand per resource
  const demand: Record<string, number> = {};
  for (const config of Object.values(RESOURCE_CONFIGS)) {
    let totalDemand = 0;
    for (const row of moduleCounts) {
      if (config.demandDrivers.includes(row.type)) {
        const weight = tierWeight[row.tier] ?? 1;
        totalDemand += Number(row.count) * weight;
      }
    }
    demand[config.type] = totalDemand;
  }

  // Cache the result
  demandCache = {
    data: demand,
    expiresAt: Date.now() + DEMAND_CACHE_TTL_MS,
  };

  return demand;
}

/**
 * Calculate supply from recent production logs.
 * Uses the last 24 hours of production as a proxy for supply.
 */
async function calculateSupply(): Promise<Record<string, number>> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const supplyRows = await prisma.$queryRaw<
    Array<{ resource: string; totalProduced: number }>
  >`
    SELECT
      pl."resource"::text AS "resource",
      COALESCE(SUM(pl."totalProduced"), 0) AS "totalProduced"
    FROM "ProductionLog" pl
    WHERE pl."date" >= ${yesterday}
    GROUP BY pl."resource"
  `;

  const supply: Record<string, number> = {};
  for (const row of supplyRows) {
    supply[row.resource] = Number(row.totalProduced);
  }

  return supply;
}

// ---------------------------------------------------------------------------
// 3. Market Depth Generation
// ---------------------------------------------------------------------------

/**
 * Generate a synthetic order book around the current price.
 * Creates DEPTH_LEVELS bid (buy) and ask (sell) orders.
 *
 * Bids are placed below current price, asks above.
 * Quantity increases further from market price (more liquidity at extremes).
 */
export function generateMarketDepth(
  resource: ResourceType,
  currentPrice: number,
): MarketDepth {
  const config = RESOURCE_CONFIGS[resource];
  const halfSpread = currentPrice * DEPTH_SPREAD_PCT;

  const bids: MarketDepthOrder[] = [];
  const asks: MarketDepthOrder[] = [];

  let bidCumulative = 0;
  let askCumulative = 0;

  for (let i = 0; i < DEPTH_LEVELS; i++) {
    // Deeper levels have more liquidity (linear scale + random jitter)
    const levelMultiplier = 1 + i * 0.6;
    const jitter = 0.8 + Math.random() * 0.4; // ±20% randomness
    const quantity = Math.round(DEPTH_QUANTITY_BASE * levelMultiplier * jitter);

    // Bid price decreases with each level
    const bidPrice = Math.max(
      config.minPrice,
      currentPrice - halfSpread - currentPrice * DEPTH_PRICE_STEP_PCT * (i + 1),
    );
    bidCumulative += quantity;
    bids.push({
      price: Math.round(bidPrice * 10000) / 10000,
      quantity,
      total: bidCumulative,
    });

    // Ask price increases with each level
    const askPrice = Math.min(
      config.maxPrice,
      currentPrice + halfSpread + currentPrice * DEPTH_PRICE_STEP_PCT * (i + 1),
    );
    askCumulative += quantity;
    asks.push({
      price: Math.round(askPrice * 10000) / 10000,
      quantity,
      total: askCumulative,
    });
  }

  const bestBid = bids[0]?.price ?? currentPrice * 0.995;
  const bestAsk = asks[0]?.price ?? currentPrice * 1.005;
  const spread = bestAsk - bestBid;
  const spreadPercent = (spread / currentPrice) * 100;

  return {
    resource,
    currentPrice,
    bids,
    asks,
    spread: Math.round(spread * 10000) / 10000,
    spreadPercent: Math.round(spreadPercent * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// 4. Trade Execution
// ---------------------------------------------------------------------------

/**
 * Execute a trade for a player against the synthetic order book.
 *
 * Walks the order book to fill the requested quantity, computing
 * a volume-weighted average price (VWAP) and slippage.
 *
 * For buys:  player pays LUNAR, receives resource
 * For sells: player pays resource, receives LUNAR
 */
export async function executeTrade(
  playerId: string,
  resource: ResourceType,
  side: "buy" | "sell",
  quantity: number,
): Promise<TradeResult> {
  if (resource === "LUNAR") {
    return {
      success: false,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: 0,
      avgPrice: 0,
      totalCost: 0,
      slippage: 0,
      error: "Cannot trade LUNAR for LUNAR",
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: 0,
      avgPrice: 0,
      totalCost: 0,
      slippage: 0,
      error: "Quantity must be positive",
    };
  }

  // Get current price
  const priceData = await prisma.resourcePrice.findUnique({
    where: { type: resource },
  });

  if (!priceData) {
    return {
      success: false,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: 0,
      avgPrice: 0,
      totalCost: 0,
      slippage: 0,
      error: "Resource not found",
    };
  }

  const currentPrice = Number(priceData.currentPrice);
  const depth = generateMarketDepth(resource, currentPrice);

  // Walk the order book
  const orders = side === "buy" ? depth.asks : depth.bids;
  let remainingQty = quantity;
  let totalSpent = 0;
  let filledQty = 0;

  for (const order of orders) {
    if (remainingQty <= 0) break;
    const fillQty = Math.min(remainingQty, order.quantity);
    totalSpent += fillQty * order.price;
    filledQty += fillQty;
    remainingQty -= fillQty;
  }

  if (filledQty === 0) {
    return {
      success: false,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: 0,
      avgPrice: 0,
      totalCost: 0,
      slippage: 0,
      error: "Insufficient market liquidity",
    };
  }

  const avgPrice = totalSpent / filledQty;
  const slippage = ((avgPrice - currentPrice) / currentPrice) * 100;

  // Execute the trade in a transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Get player with lock
      const player = await tx.player.findUniqueOrThrow({
        where: { id: playerId },
      });

      if (side === "buy") {
        // Check LUNAR balance
        const lunarBalance = Number(player.lunarBalance);
        if (lunarBalance < totalSpent) {
          throw new Error(
            `Insufficient LUNAR: need ${totalSpent.toFixed(2)}, have ${lunarBalance.toFixed(2)}`,
          );
        }

        // Debit LUNAR
        await tx.player.update({
          where: { id: playerId, version: player.version },
          data: {
            lunarBalance: { decrement: totalSpent },
            version: { increment: 1 },
          },
        });

        // Credit resource
        await tx.playerResource.upsert({
          where: { playerId_type: { playerId, type: resource } },
          update: { amount: { increment: filledQty } },
          create: { playerId, type: resource, amount: filledQty },
        });
      } else {
        // SELL: check resource balance
        const resourceRow = await tx.playerResource.findUnique({
          where: { playerId_type: { playerId, type: resource } },
        });

        const resourceBalance = resourceRow ? Number(resourceRow.amount) : 0;
        if (resourceBalance < filledQty) {
          throw new Error(
            `Insufficient ${resource}: need ${filledQty}, have ${resourceBalance}`,
          );
        }

        // Debit resource
        await tx.playerResource.update({
          where: { playerId_type: { playerId, type: resource } },
          data: { amount: { decrement: filledQty } },
        });

        // Credit LUNAR
        await tx.player.update({
          where: { id: playerId, version: player.version },
          data: {
            lunarBalance: { increment: totalSpent },
            version: { increment: 1 },
          },
        });
      }

      // Log the transaction
      const newBalance =
        Number(player.lunarBalance) +
        (side === "sell" ? totalSpent : -totalSpent);
      await tx.transaction.create({
        data: {
          playerId,
          type: "TRADE",
          resource,
          amount: side === "buy" ? filledQty : -filledQty,
          balanceAfter: newBalance,
          description: `${side.toUpperCase()} ${filledQty} ${resource} @ ${avgPrice.toFixed(4)} $L`,
          metadata: {
            side,
            filledQty,
            avgPrice,
            totalCost: totalSpent,
            slippage,
            marketPrice: currentPrice,
          },
        },
      });

      // Log game event
      await tx.gameEvent.create({
        data: {
          playerId,
          type: "trade",
          severity: "INFO",
          data: {
            resource,
            side,
            quantity: filledQty,
            avgPrice,
            totalCost: totalSpent,
          },
        },
      });
    });

    // Emit structured metric
    GameMetrics.trackTrade(
      playerId,
      resource,
      side,
      filledQty,
      Math.round(avgPrice * 10000) / 10000,
      Math.round(totalSpent * 10000) / 10000,
      Math.round(slippage * 100) / 100,
    );

    return {
      success: true,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: filledQty,
      avgPrice: Math.round(avgPrice * 10000) / 10000,
      totalCost: Math.round(totalSpent * 10000) / 10000,
      slippage: Math.round(slippage * 100) / 100,
    };
  } catch (error) {
    return {
      success: false,
      resource,
      side,
      requestedQuantity: quantity,
      filledQuantity: 0,
      avgPrice: 0,
      totalCost: 0,
      slippage: 0,
      error: error instanceof Error ? error.message : "Trade failed",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Market Overview (read-only for Frame display)
// ---------------------------------------------------------------------------

/**
 * Get a snapshot of all resource prices for Frame rendering.
 */
export async function getMarketOverview(
  playerId?: string,
): Promise<MarketOverview> {
  const prices = await prisma.resourcePrice.findMany({
    orderBy: { type: "asc" },
  });

  const resources = prices
    .filter((p) => p.type !== "LUNAR") // Don't show LUNAR price (it's the base currency)
    .map((p) => {
      const change = Number(p.priceChange24h);
      const current = Number(p.currentPrice);
      const changePercent =
        current > 0 ? (change / (current - change)) * 100 : 0;
      return {
        type: p.type as ResourceType,
        currentPrice: Number(p.currentPrice),
        priceChange24h: change,
        changePercent: Math.round(changePercent * 100) / 100,
        supply: Number(p.supply),
        demand: Number(p.demand),
        trend:
          Math.abs(changePercent) < 1
            ? ("stable" as const)
            : changePercent > 0
              ? ("up" as const)
              : ("down" as const),
      };
    });

  // Get recent alerts for this player (if provided)
  let alerts: MarketOverview["alerts"] = [];
  if (playerId) {
    const recentAlerts = await prisma.priceAlert.findMany({
      where: { playerId, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    alerts = recentAlerts.map((a) => ({
      resource: a.resource as ResourceType,
      message: a.message,
      direction: a.direction,
    }));
  }

  return {
    resources,
    lastUpdated: prices[0]?.lastUpdatedAt ?? new Date(),
    alerts,
  };
}

// ---------------------------------------------------------------------------
// 6. Market Tick — called by cron every 15 minutes
// ---------------------------------------------------------------------------

/**
 * Run a full market tick: update all prices, record history, create alerts.
 */
export async function runMarketTick(): Promise<MarketTickResult> {
  const startTime = Date.now();
  const updates: PriceUpdate[] = [];
  let alertsCreated = 0;
  let historyPruned = 0;

  // Fetch demand and supply
  const [demand, supply] = await Promise.all([
    calculatePlayerDemand(),
    calculateSupply(),
  ]);

  // Get all current prices
  const prices = await prisma.resourcePrice.findMany();

  // Update each resource
  for (const priceRow of prices) {
    const resourceType = priceRow.type as ResourceType;
    const config = RESOURCE_CONFIGS[resourceType];
    if (!config) continue;

    const currentPrice = Number(priceRow.currentPrice);
    const currentPhase = Number(priceRow.seasonalPhase ?? 0);
    const resourceDemand = demand[resourceType] ?? 0;
    const resourceSupply = supply[resourceType] ?? 0;

    // Calculate new price
    const { newPrice } = calculateNewPrice(
      currentPrice,
      config,
      resourceDemand,
      resourceSupply,
      currentPhase,
    );

    const priceChange = newPrice - currentPrice;
    const changePercent =
      currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

    // Advance seasonal phase (roughly quarter cycle per day at 15 min intervals)
    const newPhase = (currentPhase + 0.0654) % (2 * Math.PI); // ~96 ticks/day

    // Update price record
    await prisma.resourcePrice.update({
      where: { id: priceRow.id },
      data: {
        currentPrice: newPrice,
        priceChange24h: priceChange,
        supply: resourceSupply,
        demand: resourceDemand,
        volatility: config.volatility,
        seasonalPhase: newPhase,
        lastUpdatedAt: new Date(),
      },
    });

    // Record history
    await prisma.priceHistory.create({
      data: {
        resourcePriceId: priceRow.id,
        type: resourceType,
        price: newPrice,
        supply: resourceSupply,
        demand: resourceDemand,
        volume: 0, // Will be populated as trades happen
      },
    });

    updates.push({
      type: resourceType,
      previousPrice: currentPrice,
      newPrice,
      changePercent: Math.round(changePercent * 100) / 100,
      supply: resourceSupply,
      demand: resourceDemand,
    });

    // Create alerts for significant movements
    if (Math.abs(changePercent) >= ALERT_THRESHOLD_PCT) {
      const direction =
        changePercent > 20 ? "spike" : changePercent > 0 ? "up" : "down";

      const message = `${resourceType} ${direction === "spike" ? "spiked" : direction === "up" ? "rose" : "dropped"} ${Math.abs(changePercent).toFixed(1)}% to ${newPrice.toFixed(2)} $L`;

      // Create alerts for all active players (batch)
      const activePlayers = await prisma.player.findMany({
        where: { deletedAt: null },
        select: { id: true },
        take: 1000, // Safety limit
      });

      if (activePlayers.length > 0) {
        await prisma.priceAlert.createMany({
          data: activePlayers.map((p) => ({
            playerId: p.id,
            resource: resourceType,
            priceAtAlert: newPrice,
            changePercent,
            direction,
            message,
          })),
        });
        alertsCreated += activePlayers.length;
      }
    }

    // Prune old history (keep only MAX_HISTORY_PER_RESOURCE per resource)
    const historyCount = await prisma.priceHistory.count({
      where: { resourcePriceId: priceRow.id },
    });

    if (historyCount > MAX_HISTORY_PER_RESOURCE) {
      const toDelete = historyCount - MAX_HISTORY_PER_RESOURCE;
      // Delete oldest entries
      const oldest = await prisma.priceHistory.findMany({
        where: { resourcePriceId: priceRow.id },
        orderBy: { snapshotAt: "asc" },
        take: toDelete,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.priceHistory.deleteMany({
          where: { id: { in: oldest.map((h) => h.id) } },
        });
        historyPruned += oldest.length;
      }
    }
  }

  // Prune old alerts (older than 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.priceAlert.deleteMany({
    where: { createdAt: { lt: weekAgo } },
  });

  // Log global event
  await prisma.gameEvent.create({
    data: {
      type: "market_tick",
      severity: "INFO",
      data: {
        updates: updates.map((u) => ({
          type: u.type,
          price: u.newPrice,
          change: u.changePercent,
        })),
        alertsCreated,
        historyPruned,
      },
    },
  });

  return {
    updates,
    alertsCreated,
    historyPruned,
    durationMs: Date.now() - startTime,
  };
}

// ---------------------------------------------------------------------------
// 7. Price History (for charts / sparklines)
// ---------------------------------------------------------------------------

/**
 * Get price history for a resource (most recent first).
 */
export async function getPriceHistory(
  resource: ResourceType,
  limit = 50,
): Promise<
  Array<{ price: number; supply: number; demand: number; timestamp: Date }>
> {
  const history = await prisma.priceHistory.findMany({
    where: { type: resource },
    orderBy: { snapshotAt: "desc" },
    take: limit,
  });

  return history.map((h) => ({
    price: Number(h.price),
    supply: Number(h.supply),
    demand: Number(h.demand),
    timestamp: h.snapshotAt,
  }));
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

const marketEngine = {
  runMarketTick,
  executeTrade,
  getMarketOverview,
  getMarketDepth: generateMarketDepth,
  getPriceHistory,
  RESOURCE_CONFIGS,
};

export default marketEngine;
