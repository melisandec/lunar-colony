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
  });
}

// ---------------------------------------------------------------------------
// COLONY image
// ---------------------------------------------------------------------------

export function generateColonyImage(params: URLSearchParams): ImageResponse {
  const modules: Array<{ type: string; count: number; tier?: TierKey }> = [];

  for (const [key, val] of params.entries()) {
    if (key.startsWith("mod_")) {
      modules.push({
        type: key.slice(4).toUpperCase(),
        count: Number(val),
      });
    }
  }

  return ColonyScreen({
    level: params.get("level") ?? "1",
    balance: Number(params.get("balance") ?? "0"),
    production: Number(params.get("production") ?? "0"),
    moduleCount: params.get("moduleCount") ?? "0",
    modules,
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

  return MarketScreen({
    balance: Number(params.get("balance") ?? "0"),
    alertCount: Number(params.get("alertCount") ?? "0"),
    resources,
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
