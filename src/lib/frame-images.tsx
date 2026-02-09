/**
 * Dynamic OG Image Generation for Frame Responses
 *
 * Uses the design-system templates for all screen images.
 * Each generator parses query params and delegates to the
 * template / animation functions from `@/lib/design`.
 */

import type { ImageResponse } from "@vercel/og";
import {
  LandingScreen,
  HomeScreen,
  ColonyScreen,
  BuildScreen,
  MarketScreen,
  AllianceScreen,
  BuildResultScreen,
  TradeResultScreen,
  type MarketResource,
  type TierKey,
  type ResourceKey,
  productionCycleFrames,
  moduleConstructionFrames,
  lunarEarningFrames,
  levelUpFrames,
  selectAnimationFrame,
} from "@/lib/design";

// ---------------------------------------------------------------------------
// HOME image
// ---------------------------------------------------------------------------

export function generateHomeImage(params: URLSearchParams): ImageResponse {
  // Parse optional enriched module grid (mgrid_0_type=SOLAR_PANEL&mgrid_0_tier=COMMON&mgrid_0_eff=95 …)
  const moduleGrid: Array<{
    type: string;
    tier?: TierKey;
    efficiency?: number;
    isActive?: boolean;
  }> = [];
  for (let i = 0; ; i++) {
    const t = params.get(`mgrid_${i}_type`);
    if (!t) break;
    moduleGrid.push({
      type: t,
      tier: (params.get(`mgrid_${i}_tier`) as TierKey) ?? undefined,
      efficiency: params.has(`mgrid_${i}_eff`)
        ? Number(params.get(`mgrid_${i}_eff`))
        : undefined,
      isActive: params.has(`mgrid_${i}_active`)
        ? params.get(`mgrid_${i}_active`) === "1"
        : undefined,
    });
  }

  return HomeScreen({
    name: params.get("name") ?? "Commander",
    level: params.get("level") ?? "1",
    balance: Number(params.get("balance") ?? "0"),
    production: Number(params.get("production") ?? "0"),
    modules: params.get("modules") ?? "0",
    pending: Number(params.get("pending") ?? "0"),
    collected: Number(params.get("collected") ?? "0"),
    eventBanner: params.get("eventBanner") ?? "none",
    eventCount: Number(params.get("eventCount") ?? "0"),
    crew: params.has("crew") ? Number(params.get("crew")) : undefined,
    crewMax: params.has("crewMax") ? Number(params.get("crewMax")) : undefined,
    streak: params.has("streak") ? Number(params.get("streak")) : undefined,
    rank: params.has("rank") ? Number(params.get("rank")) : undefined,
    moduleGrid: moduleGrid.length > 0 ? moduleGrid : undefined,
  });
}

// ---------------------------------------------------------------------------
// COLONY image
// ---------------------------------------------------------------------------

export function generateColonyImage(params: URLSearchParams): ImageResponse {
  // Legacy compact module list (mod_solar_panel=3 …)
  const modules: Array<{ type: string; count: number; tier?: TierKey }> = [];
  for (const [key, val] of params.entries()) {
    if (key.startsWith("mod_")) {
      modules.push({
        type: key.slice(4).toUpperCase(),
        count: Number(val),
      });
    }
  }

  // Enriched per-module grid (cgrid_0_type=SOLAR_PANEL&cgrid_0_tier=COMMON&cgrid_0_eff=95&cgrid_0_lvl=2 …)
  const moduleGrid: Array<{
    type: string;
    tier?: TierKey;
    efficiency?: number;
    isActive?: boolean;
    level?: number;
  }> = [];
  for (let i = 0; ; i++) {
    const t = params.get(`cgrid_${i}_type`);
    if (!t) break;
    moduleGrid.push({
      type: t,
      tier: (params.get(`cgrid_${i}_tier`) as TierKey) ?? undefined,
      efficiency: params.has(`cgrid_${i}_eff`)
        ? Number(params.get(`cgrid_${i}_eff`))
        : undefined,
      isActive: params.has(`cgrid_${i}_active`)
        ? params.get(`cgrid_${i}_active`) === "1"
        : undefined,
      level: params.has(`cgrid_${i}_lvl`)
        ? Number(params.get(`cgrid_${i}_lvl`))
        : undefined,
    });
  }

  return ColonyScreen({
    level: params.get("level") ?? "1",
    balance: Number(params.get("balance") ?? "0"),
    production: Number(params.get("production") ?? "0"),
    moduleCount: params.get("moduleCount") ?? "0",
    modules,
    moduleGrid: moduleGrid.length > 0 ? moduleGrid : undefined,
    selectedModule: params.has("selectedModule")
      ? Number(params.get("selectedModule"))
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// BUILD image
// ---------------------------------------------------------------------------

export function generateBuildImage(params: URLSearchParams): ImageResponse {
  const solarCost = Number(params.get("solarCost") ?? "100");
  const miningCost = Number(params.get("miningCost") ?? "250");
  const habitatCost = Number(params.get("habitatCost") ?? "200");

  return BuildScreen({
    balance: Number(params.get("balance") ?? "0"),
    moduleCount: params.get("moduleCount") ?? "0",
    maxModules: 20,
    items: [
      { moduleType: "SOLAR_PANEL", cost: solarCost, output: "+10/tick" },
      { moduleType: "MINING_RIG", cost: miningCost, output: "+25/tick" },
      { moduleType: "HABITAT", cost: habitatCost, output: "+5/tick" },
    ],
  });
}

// ---------------------------------------------------------------------------
// MARKET image
// ---------------------------------------------------------------------------

const RESOURCE_KEY_MAP: Record<string, ResourceKey> = {
  regolith: "REGOLITH",
  water_ice: "WATER_ICE",
  helium3: "HELIUM3",
  rare_earth: "RARE_EARTH",
};

export function generateMarketImage(params: URLSearchParams): ImageResponse {
  const resources: MarketResource[] = [];

  for (const [qKey, rKey] of Object.entries(RESOURCE_KEY_MAP)) {
    const price = params.get(`price_${qKey}`);
    const change = params.get(`change_${qKey}`);
    const trend = (params.get(`trend_${qKey}`) ?? "stable") as
      | "up"
      | "down"
      | "stable";
    if (price) {
      const changeNum = Number(change ?? 0);
      resources.push({
        resource: rKey,
        price: Number(price).toFixed(2),
        changePercent: `${changeNum >= 0 ? "+" : ""}${changeNum.toFixed(1)}%`,
        trend,
      });
    }
  }

  // Fallback when no live data
  if (resources.length === 0) {
    resources.push(
      {
        resource: "REGOLITH",
        price: "2.50",
        changePercent: "—",
        trend: "stable",
      },
      {
        resource: "WATER_ICE",
        price: "8.75",
        changePercent: "—",
        trend: "stable",
      },
      {
        resource: "HELIUM3",
        price: "45.00",
        changePercent: "—",
        trend: "stable",
      },
      {
        resource: "RARE_EARTH",
        price: "120.00",
        changePercent: "—",
        trend: "stable",
      },
    );
  }

  // Parse optional sparkline data: sparkline=0.3,0.5,0.8,0.6,...
  let sparklineData: number[] | undefined;
  const sparklineRaw = params.get("sparkline");
  if (sparklineRaw) {
    sparklineData = sparklineRaw
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n));
  }

  // Parse optional depth data
  let depth:
    | { buyPct: number; sellPct: number; buyQty: string; sellQty: string }
    | undefined;
  if (params.has("depthBuyPct")) {
    depth = {
      buyPct: Number(params.get("depthBuyPct") ?? "0"),
      sellPct: Number(params.get("depthSellPct") ?? "0"),
      buyQty: params.get("depthBuyQty") ?? "0",
      sellQty: params.get("depthSellQty") ?? "0",
    };
  }

  return MarketScreen({
    balance: Number(params.get("balance") ?? "0"),
    alertCount: Number(params.get("alertCount") ?? "0"),
    resources,
    sparklineData,
    featuredResource: (params.get("featured") as ResourceKey) ?? undefined,
    depth,
    openOrders: params.has("openOrders")
      ? Number(params.get("openOrders"))
      : undefined,
  });
}

// ---------------------------------------------------------------------------
// ALLIANCE image
// ---------------------------------------------------------------------------

export function generateAllianceImage(params: URLSearchParams): ImageResponse {
  return AllianceScreen({
    balance: Number(params.get("balance") ?? "0"),
  });
}

// ---------------------------------------------------------------------------
// RESULT image (build / trade)
// ---------------------------------------------------------------------------

export function generateResultImage(params: URLSearchParams): ImageResponse {
  const success = params.get("success") === "1";
  const isTradeResult = params.get("tradeResult") === "1";

  if (isTradeResult) {
    return TradeResultScreen({
      success,
      side: params.get("side") ?? "",
      resource: (params.get("resource") ?? "").replace(/_/g, " "),
      quantity: params.get("quantity") ?? "0",
      avgPrice: params.get("avgPrice") ?? "0",
      totalCost: params.get("totalCost") ?? "0",
      slippage: params.get("slippage") ?? "0",
      balance: Number(params.get("balance") ?? "0"),
      error: params.get("error") ?? undefined,
    });
  }

  return BuildResultScreen({
    success,
    moduleName: (params.get("module") ?? "MODULE").replace(/_/g, " "),
    balance: Number(params.get("balance") ?? "0"),
    modules: params.get("modules") ?? "0",
    error: params.get("error") ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// ANIMATION images
// ---------------------------------------------------------------------------

export function generateProductionAnimation(
  params: URLSearchParams,
): ImageResponse {
  const production = Number(params.get("production") ?? "0");
  const frames = productionCycleFrames(production);
  return selectAnimationFrame(frames, params) as ImageResponse;
}

export function generateConstructionAnimation(
  params: URLSearchParams,
): ImageResponse {
  const moduleName = (params.get("module") ?? "Module").replace(/_/g, " ");
  const frames = moduleConstructionFrames(moduleName);
  return selectAnimationFrame(frames, params) as ImageResponse;
}

export function generateEarningAnimation(
  params: URLSearchParams,
): ImageResponse {
  const amount = Number(params.get("amount") ?? "0");
  const frames = lunarEarningFrames(amount);
  return selectAnimationFrame(frames, params) as ImageResponse;
}

export function generateLevelUpAnimation(
  params: URLSearchParams,
): ImageResponse {
  const oldLevel = Number(params.get("oldLevel") ?? "1");
  const newLevel = Number(params.get("newLevel") ?? "2");
  const frames = levelUpFrames(oldLevel, newLevel);
  return selectAnimationFrame(frames, params) as ImageResponse;
}

// ---------------------------------------------------------------------------
// Landing image
// ---------------------------------------------------------------------------

export function generateLandingImage(): ImageResponse {
  return LandingScreen();
}

// ---------------------------------------------------------------------------
// Router — pick the right generator from query params
// ---------------------------------------------------------------------------

export function generateFrameImage(
  searchParams: URLSearchParams,
): ImageResponse {
  const screen = searchParams.get("screen") ?? "landing";

  switch (screen) {
    case "home":
      return generateHomeImage(searchParams);
    case "colony":
      return generateColonyImage(searchParams);
    case "build":
      return generateBuildImage(searchParams);
    case "market":
      return generateMarketImage(searchParams);
    case "alliance":
      return generateAllianceImage(searchParams);
    case "result":
      return generateResultImage(searchParams);
    // Animation screens
    case "anim_production":
      return generateProductionAnimation(searchParams);
    case "anim_construction":
      return generateConstructionAnimation(searchParams);
    case "anim_earning":
      return generateEarningAnimation(searchParams);
    case "anim_levelup":
      return generateLevelUpAnimation(searchParams);
    default:
      return generateLandingImage();
  }
}
