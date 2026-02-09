/**
 * Dynamic OG Image Generation for Frame Responses
 *
 * Uses @vercel/og ImageResponse to create dynamic images for each screen.
 * Images are generated on-demand and cached at the Vercel edge.
 *
 * Each generator receives parsed query params and returns an ImageResponse.
 */

import { ImageResponse } from "@vercel/og";
import { FRAME_IMAGE, formatNumber, formatLunar } from "@/lib/utils";

const W = FRAME_IMAGE.WIDTH;
const H = FRAME_IMAGE.HEIGHT;

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const gradients = {
  home: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
  colony: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  build: "linear-gradient(135deg, #0d1117 0%, #1b2838 50%, #2a475e 100%)",
  market: "linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #11001c 100%)",
  alliance: "linear-gradient(135deg, #0a1628 0%, #1a3a5c 50%, #0a2540 100%)",
  result: "linear-gradient(135deg, #0b3d0b 0%, #1a4d2e 50%, #0d2818 100%)",
  error: "linear-gradient(135deg, #3d0b0b 0%, #4d1a1a 50%, #280d0d 100%)",
};

const baseStyle = {
  width: W,
  height: H,
  display: "flex" as const,
  flexDirection: "column" as const,
  color: "white",
  fontFamily: "sans-serif",
  padding: 40,
};

// ---------------------------------------------------------------------------
// HOME image
// ---------------------------------------------------------------------------

export function generateHomeImage(params: URLSearchParams): ImageResponse {
  const balance = params.get("balance") ?? "0";
  const production = params.get("production") ?? "0";
  const modules = params.get("modules") ?? "0";
  const level = params.get("level") ?? "1";
  const pending = params.get("pending") ?? "0";
  const collected = params.get("collected") ?? "0";
  const name = params.get("name") ?? "Commander";
  const eventBanner = params.get("eventBanner") ?? "none";
  const eventCount = Number(params.get("eventCount") ?? "0");

  const hasCollected = Number(collected) > 0;
  const hasEvent = eventBanner !== "none" && eventCount > 0;

  return new ImageResponse(
    <div style={{ ...baseStyle, background: gradients.home }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 42, fontWeight: "bold" }}>
          🌙 Lunar Colony Tycoon
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            background: "rgba(255,255,255,0.1)",
            padding: "6px 16px",
            borderRadius: 8,
          }}
        >
          Lv.{level}
        </div>
      </div>

      {/* Player name */}
      <div
        style={{
          display: "flex",
          fontSize: 22,
          opacity: 0.7,
          marginTop: 4,
        }}
      >
        Welcome back, {name}
      </div>

      {/* Collection banner */}
      {hasCollected && (
        <div
          style={{
            display: "flex",
            marginTop: 16,
            padding: "10px 20px",
            background: "rgba(74,222,128,0.2)",
            border: "1px solid rgba(74,222,128,0.4)",
            borderRadius: 12,
            fontSize: 22,
            color: "#4ade80",
          }}
        >
          ⚡ +{formatLunar(Number(collected))} collected!
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          marginTop: hasCollected ? 20 : 40,
          gap: 20,
          flex: 1,
        }}
      >
        <StatBox
          icon="💰"
          label="Balance"
          value={formatLunar(Number(balance))}
        />
        <StatBox
          icon="⚡"
          label="Production"
          value={`${formatNumber(Number(production))}/tick`}
        />
        <StatBox icon="🏗️" label="Modules" value={modules} />
        {Number(pending) > 0 && (
          <StatBox
            icon="⏳"
            label="Pending"
            value={formatLunar(Number(pending))}
            accent
          />
        )}
      </div>

      {/* Active event banner */}
      {hasEvent && (
        <div
          style={{
            display: "flex",
            marginTop: 8,
            padding: "8px 16px",
            background: "rgba(250,204,21,0.15)",
            border: "1px solid rgba(250,204,21,0.4)",
            borderRadius: 10,
            fontSize: 18,
            color: "#facc15",
            alignItems: "center",
            gap: 8,
          }}
        >
          🎉 {eventCount} active event{eventCount > 1 ? "s" : ""}:{" "}
          {formatEventName(eventBanner)}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          fontSize: 16,
          opacity: 0.5,
          marginTop: 8,
        }}
      >
        Btn 1: Produce · 2: Colony · 3: Market · 4: Alliance
      </div>
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// COLONY image
// ---------------------------------------------------------------------------

export function generateColonyImage(params: URLSearchParams): ImageResponse {
  const balance = params.get("balance") ?? "0";
  const production = params.get("production") ?? "0";
  const moduleCount = params.get("moduleCount") ?? "0";
  const level = params.get("level") ?? "1";

  // Parse module type counts
  const moduleTypes: { name: string; count: number; icon: string }[] = [];
  const typeIcons: Record<string, string> = {
    solar_panel: "⚡",
    mining_rig: "⛏️",
    habitat: "🏠",
    research_lab: "🔬",
    water_extractor: "💧",
    oxygen_generator: "🫁",
    storage_depot: "📦",
    launch_pad: "🚀",
  };

  for (const [key, val] of params.entries()) {
    if (key.startsWith("mod_")) {
      const typeName = key.slice(4);
      moduleTypes.push({
        name: typeName.replace(/_/g, " "),
        count: Number(val),
        icon: typeIcons[typeName] ?? "🔧",
      });
    }
  }

  return new ImageResponse(
    <div style={{ ...baseStyle, background: gradients.colony }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: "bold" }}>
          🏗️ Your Colony
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 18,
          }}
        >
          <span
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 12px",
              borderRadius: 6,
            }}
          >
            Lv.{level}
          </span>
          <span
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 12px",
              borderRadius: 6,
            }}
          >
            💰 {formatLunar(Number(balance))}
          </span>
        </div>
      </div>

      {/* Module grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 28,
          flex: 1,
        }}
      >
        {moduleTypes.length > 0 ? (
          moduleTypes.map((mt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.08)",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 20,
              }}
            >
              <span style={{ display: "flex" }}>{mt.icon}</span>
              <span style={{ display: "flex", textTransform: "capitalize" }}>
                {mt.name}
              </span>
              <span
                style={{
                  display: "flex",
                  background: "rgba(255,255,255,0.15)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 16,
                }}
              >
                ×{mt.count}
              </span>
            </div>
          ))
        ) : (
          <div style={{ display: "flex", fontSize: 22, opacity: 0.6 }}>
            No modules yet — build your first one!
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          fontSize: 18,
          opacity: 0.7,
        }}
      >
        <span style={{ display: "flex" }}>
          📊 {moduleCount} modules · ⚡ {formatNumber(Number(production))}/tick
        </span>
      </div>
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// BUILD image
// ---------------------------------------------------------------------------

export function generateBuildImage(params: URLSearchParams): ImageResponse {
  const balance = params.get("balance") ?? "0";
  const solarCost = params.get("solarCost") ?? "100";
  const miningCost = params.get("miningCost") ?? "250";
  const habitatCost = params.get("habitatCost") ?? "200";
  const moduleCount = params.get("moduleCount") ?? "0";

  const bal = Number(balance);
  const items = [
    {
      icon: "⚡",
      name: "Solar Panel",
      cost: Number(solarCost),
      output: "+10/tick",
    },
    {
      icon: "⛏️",
      name: "Mining Rig",
      cost: Number(miningCost),
      output: "+25/tick",
    },
    {
      icon: "🏠",
      name: "Habitat",
      cost: Number(habitatCost),
      output: "+5/tick",
    },
  ];

  return new ImageResponse(
    <div style={{ ...baseStyle, background: gradients.build }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: "bold" }}>
          🔨 Build Module
        </div>
        <div style={{ display: "flex", fontSize: 20 }}>
          💰 {formatLunar(bal)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 16,
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {moduleCount}/20 slots used
      </div>

      {/* Build options */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginTop: 28,
          flex: 1,
        }}
      >
        {items.map((item, i) => {
          const canAfford = bal >= item.cost;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                background: canAfford
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,0,0,0.08)",
                border: canAfford
                  ? "1px solid rgba(255,255,255,0.15)"
                  : "1px solid rgba(255,0,0,0.2)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", fontSize: 28 }}>
                  {item.icon}
                </span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      display: "flex",
                      fontSize: 22,
                      fontWeight: "bold",
                    }}
                  >
                    Btn {i + 1}: {item.name}
                  </span>
                  <span style={{ display: "flex", fontSize: 16, opacity: 0.7 }}>
                    {item.output}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: canAfford ? "#4ade80" : "#f87171",
                  fontWeight: "bold",
                }}
              >
                {formatNumber(item.cost)} $L
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 15,
          opacity: 0.4,
          marginTop: 8,
        }}
      >
        Btn 4: Back to Colony
      </div>
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// MARKET image
// ---------------------------------------------------------------------------

export function generateMarketImage(params: URLSearchParams): ImageResponse {
  const balance = params.get("balance") ?? "0";
  const alertCount = Number(params.get("alertCount") ?? "0");

  // Parse live prices from query params (set by marketScreen in game-state)
  const resources: Array<{
    type: string;
    icon: string;
    price: string;
    change: string;
    trend: string;
  }> = [];

  const resourceMeta: Record<string, { display: string; icon: string }> = {
    regolith: { display: "REGOLITH", icon: "🪨" },
    water_ice: { display: "WATER ICE", icon: "🧊" },
    helium3: { display: "HELIUM-3", icon: "⚛️" },
    rare_earth: { display: "RARE EARTH", icon: "💎" },
  };

  for (const [key, meta] of Object.entries(resourceMeta)) {
    const price = params.get(`price_${key}`);
    const change = params.get(`change_${key}`);
    const trend = params.get(`trend_${key}`) ?? "stable";
    if (price) {
      const changeNum = Number(change ?? 0);
      resources.push({
        type: meta.display,
        icon: meta.icon,
        price: Number(price).toFixed(2),
        change: `${changeNum >= 0 ? "+" : ""}${changeNum.toFixed(1)}%`,
        trend,
      });
    }
  }

  // Fallback if no live data yet
  if (resources.length === 0) {
    resources.push(
      {
        type: "REGOLITH",
        icon: "🪨",
        price: "2.50",
        change: "—",
        trend: "stable",
      },
      {
        type: "WATER ICE",
        icon: "🧊",
        price: "8.75",
        change: "—",
        trend: "stable",
      },
      {
        type: "HELIUM-3",
        icon: "⚛️",
        price: "45.00",
        change: "—",
        trend: "stable",
      },
      {
        type: "RARE EARTH",
        icon: "💎",
        price: "120.00",
        change: "—",
        trend: "stable",
      },
    );
  }

  return new ImageResponse(
    <div style={{ ...baseStyle, background: gradients.market }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 36, fontWeight: "bold" }}>
          📈 Lunar Market
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
          <span
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 12px",
              borderRadius: 6,
            }}
          >
            💰 {formatLunar(Number(balance))}
          </span>
          {alertCount > 0 && (
            <span
              style={{
                display: "flex",
                background: "rgba(251,191,36,0.2)",
                border: "1px solid rgba(251,191,36,0.4)",
                padding: "4px 12px",
                borderRadius: 6,
                color: "#fbbf24",
              }}
            >
              🔔 {alertCount}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 24,
          flex: 1,
        }}
      >
        {resources.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              background: "rgba(255,255,255,0.06)",
              border:
                r.trend === "up"
                  ? "1px solid rgba(74,222,128,0.15)"
                  : r.trend === "down"
                    ? "1px solid rgba(248,113,113,0.15)"
                    : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              fontSize: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", fontSize: 24 }}>{r.icon}</span>
              <span style={{ display: "flex", fontWeight: "bold" }}>
                {r.type}
              </span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ display: "flex", fontWeight: "bold" }}>
                {r.price} $L
              </span>
              <span
                style={{
                  display: "flex",
                  color:
                    r.trend === "up"
                      ? "#4ade80"
                      : r.trend === "down"
                        ? "#f87171"
                        : "#9ca3af",
                  fontSize: 18,
                  minWidth: 70,
                  justifyContent: "flex-end",
                }}
              >
                {r.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 14,
          opacity: 0.4,
          marginTop: 8,
        }}
      >
        Btn 1: Buy · 2: Sell · 3: Prices · 4: Home
      </div>
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// ALLIANCE image
// ---------------------------------------------------------------------------

export function generateAllianceImage(params: URLSearchParams): ImageResponse {
  const balance = params.get("balance") ?? "0";

  return new ImageResponse(
    <div style={{ ...baseStyle, background: gradients.alliance }}>
      <div style={{ display: "flex", fontSize: 36, fontWeight: "bold" }}>
        🤝 Alliance HQ
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          opacity: 0.7,
          marginTop: 8,
        }}
      >
        Join forces with other colonists
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 48,
          }}
        >
          🏗️
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.6 }}>
          Alliance system coming soon
        </div>
        <div style={{ display: "flex", fontSize: 18, opacity: 0.4 }}>
          Co-op bonuses · Shared treasury · Ranked leagues
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 16,
          opacity: 0.5,
        }}
      >
        💰 {formatLunar(Number(balance))}
      </div>
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// RESULT image (build success / failure)
// ---------------------------------------------------------------------------

export function generateResultImage(params: URLSearchParams): ImageResponse {
  const success = params.get("success") === "1";
  const isTradeResult = params.get("tradeResult") === "1";
  const moduleName = (params.get("module") ?? "MODULE").replace(/_/g, " ");
  const error = params.get("error") ?? "";
  const balance = params.get("balance") ?? "0";
  const modules = params.get("modules") ?? "0";

  // Trade-specific params
  const side = params.get("side") ?? "";
  const resource = (params.get("resource") ?? "").replace(/_/g, " ");
  const quantity = params.get("quantity") ?? "0";
  const avgPrice = params.get("avgPrice") ?? "0";
  const totalCost = params.get("totalCost") ?? "0";
  const slippage = params.get("slippage") ?? "0";

  const bg = success ? gradients.result : gradients.error;

  // Trade result layout
  if (isTradeResult) {
    return new ImageResponse(
      <div
        style={{
          ...baseStyle,
          background: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 56 }}>
          {success ? "✅" : "❌"}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: "bold",
            marginTop: 16,
            textTransform: "uppercase",
          }}
        >
          {success
            ? `${side} ${quantity} ${resource}`
            : `${side} ${resource} Failed`}
        </div>

        {success ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>
              💰 Avg Price: {Number(avgPrice).toFixed(4)} $L
            </div>
            <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>
              📊 Total: {Number(totalCost).toFixed(2)} $L
            </div>
            <div style={{ display: "flex", fontSize: 18, opacity: 0.6 }}>
              Slippage: {slippage}% · Balance: {formatLunar(Number(balance))}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 20,
              opacity: 0.8,
              marginTop: 16,
              color: "#fca5a5",
              maxWidth: 600,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
      </div>,
      { width: W, height: H },
    );
  }

  // Original build result layout

  return new ImageResponse(
    <div
      style={{
        ...baseStyle,
        background: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 56,
        }}
      >
        {success ? "✅" : "❌"}
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 32,
          fontWeight: "bold",
          marginTop: 16,
          textTransform: "capitalize",
        }}
      >
        {success ? `${moduleName} Built!` : "Build Failed"}
      </div>

      {success ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginTop: 20,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>
            💰 Balance: {formatLunar(Number(balance))}
          </div>
          <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>
            🏗️ Total Modules: {modules}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            fontSize: 20,
            opacity: 0.8,
            marginTop: 16,
            color: "#fca5a5",
            maxWidth: 600,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}
    </div>,
    { width: W, height: H },
  );
}

// ---------------------------------------------------------------------------
// Landing image (for GET / first load)
// ---------------------------------------------------------------------------

export function generateLandingImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        ...baseStyle,
        background: gradients.home,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", fontSize: 64, fontWeight: "bold" }}>
        🌙 Lunar Colony Tycoon
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          marginTop: 16,
          opacity: 0.8,
        }}
      >
        Build your lunar empire. Earn $LUNAR.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          marginTop: 32,
          padding: "12px 24px",
          background: "rgba(255,255,255,0.15)",
          borderRadius: 12,
        }}
      >
        Press ⚡ Produce to begin
      </div>
    </div>,
    { width: W, height: H },
  );
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
    default:
      return generateLandingImage();
  }
}

// ---------------------------------------------------------------------------
// Shared component helpers (used inside ImageResponse JSX)
// ---------------------------------------------------------------------------

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: accent ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.08)",
        border: accent
          ? "1px solid rgba(74,222,128,0.3)"
          : "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: "16px 24px",
        minWidth: 150,
        flex: 1,
      }}
    >
      <div style={{ display: "flex", fontSize: 28 }}>{icon}</div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: "bold",
          marginTop: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{ display: "flex", fontSize: 14, opacity: 0.6, marginTop: 2 }}
      >
        {label}
      </div>
    </div>
  );
}

/** Human-readable event type name for the banner. */
function formatEventName(eventType: string): string {
  const names: Record<string, string> = {
    PRODUCTION_RUSH: "Production Rush",
    EFFICIENCY_CHALLENGE: "Efficiency Challenge",
    MARKET_MANIPULATION: "Market Manipulation",
    WEEKLY_BURN: "Weekly Burn",
    SOLAR_FLARE: "Solar Flare",
    METEOR_SHOWER: "Meteor Shower",
    EQUIPMENT_SURPLUS: "Equipment Surplus",
    EARTH_CONTRACT: "Earth Contract",
    ALLIANCE_TOURNAMENT: "Alliance Tournament",
    RESEARCH_BREAKTHROUGH: "Research Breakthrough",
  };
  return names[eventType] ?? eventType.replace(/_/g, " ").toLowerCase();
}
