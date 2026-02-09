/**
 * Lunar Colony Tycoon — Screen Templates
 *
 * High-level screen templates that compose FrameCanvas + components
 * into complete Frame images.  Each template takes a typed props object
 * and returns an `ImageResponse`.
 *
 * Templates:
 *   HomeScreen, ColonyScreen, BuildScreen, MarketScreen,
 *   AllianceScreen, ResultScreen, LandingScreen
 */

import { ImageResponse } from "@vercel/og";
import { formatNumber, formatLunar } from "@/lib/utils";
import {
  FRAME,
  colors,
  tierColors,
  resourceMeta,
  moduleMeta,
  typography,
  type TierKey,
} from "./theme";
import {
  FrameCanvas,
  Header,
  Footer,
  Section,
  SplitLayout,
  Panel,
  StatBadge,
  StatRow,
  Badge,
  ModuleCard,
  ModuleGridCell,
  PriceRow,
  ProgressBar,
  StatusBanner,
  ToastBanner,
  Sparkline,
  DepthBar,
  InfoSidebar,
  LunarLogo,
  BalanceDisplay,
  LevelBadge,
} from "./components";
import type { ResourceKey } from "./theme";

const img = (jsx: React.ReactElement) =>
  new ImageResponse(jsx, { width: FRAME.WIDTH, height: FRAME.HEIGHT });

// ═══════════════════════════════════════════════════════════════════════════
// LANDING
// ═══════════════════════════════════════════════════════════════════════════

export function LandingScreen(): ImageResponse {
  return img(
    <FrameCanvas gradient="landing">
      <Section
        direction="column"
        align="center"
        justify="center"
        flex={1}
        gap={16}
      >
        <LunarLogo size="lg" />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: colors.text.secondary,
            marginTop: 8,
          }}
        >
          Build your lunar empire. Earn $LUNAR.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 24,
            padding: "14px 32px",
            background: `${colors.accent}20`,
            border: `1px solid ${colors.accent}45`,
            borderRadius: 14,
            fontSize: 22,
            color: colors.accent,
            fontWeight: 600,
          }}
        >
          Press ⚡ Produce to begin
        </div>
      </Section>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════

export interface HomeScreenProps {
  name: string;
  level: string;
  balance: number;
  production: number;
  modules: string;
  pending: number;
  collected: number;
  eventBanner: string;
  eventCount: number;
  /** Optional enriched data for the new split layout */
  crew?: number;
  crewMax?: number;
  streak?: number;
  rank?: number;
  /** Module grid cells — if provided, renders a visual mini-grid */
  moduleGrid?: Array<{
    type: string;
    tier?: TierKey;
    efficiency?: number;
    isActive?: boolean;
  }>;
}

export function HomeScreen(p: HomeScreenProps): ImageResponse {
  const hasCollected = p.collected > 0;
  const hasEvent = p.eventBanner !== "none" && p.eventCount > 0;
  const hasGrid = p.moduleGrid && p.moduleGrid.length > 0;

  return img(
    <FrameCanvas gradient="home">
      {/* Header */}
      <Header icon="🌙" title="LUNAR COLONY">
        <LevelBadge level={p.level} />
      </Header>

      {/* Collection toast — persistent across layouts */}
      {hasCollected && (
        <div style={{ display: "flex", marginTop: 4 }}>
          <ToastBanner
            icon="⚡"
            message={`+${formatLunar(p.collected)} collected!`}
            color={colors.success}
          />
        </div>
      )}

      {/* Main body — split layout */}
      <SplitLayout mainWidth="62%" sideWidth="36%">
        {/* LEFT: Colony status with visual grid or stat badges */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
          }}
        >
          {hasGrid ? (
            <Panel title="Colony Modules">
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {p.moduleGrid!.map((m, i) => (
                  <ModuleGridCell
                    key={i}
                    moduleType={m.type}
                    tier={(m.tier as TierKey) ?? "COMMON"}
                    efficiency={m.efficiency}
                    isActive={m.isActive}
                  />
                ))}
                {/* Fill remaining slots to hint capacity */}
                {Array.from({
                  length: Math.max(0, 8 - p.moduleGrid!.length),
                }).map((_, j) => (
                  <ModuleGridCell key={`e${j}`} empty />
                ))}
              </div>
            </Panel>
          ) : (
            <Panel title="Production Overview">
              <Section gap={12} align="stretch" wrap>
                <StatBadge
                  icon="⚡"
                  value={`${formatNumber(p.production)}/tick`}
                  label="Production"
                />
                <StatBadge icon="🏗️" value={p.modules} label="Modules" />
                {p.pending > 0 && (
                  <StatBadge
                    icon="⏳"
                    value={formatLunar(p.pending)}
                    label="Pending"
                    accentColor={colors.success}
                  />
                )}
              </Section>
            </Panel>
          )}

          {/* Event banner under the main panel */}
          {hasEvent && (
            <StatusBanner variant="warning" icon="🎉">
              {p.eventCount} active event{p.eventCount > 1 ? "s" : ""}:{" "}
              {formatEventName(p.eventBanner)}
            </StatusBanner>
          )}
        </div>

        {/* RIGHT: Player info sidebar */}
        <InfoSidebar title={`Commander ${p.name}`}>
          <StatRow icon="🏅" label="Level" value={p.level} />
          <StatRow
            icon="💰"
            label="Balance"
            value={formatLunar(p.balance)}
            valueColor={colors.accent}
          />
          <StatRow
            icon="⚡"
            label="Production"
            value={`${formatNumber(p.production)}/t`}
          />
          {p.crew !== undefined && (
            <StatRow
              icon="👨‍🚀"
              label="Crew"
              value={`${p.crew}/${p.crewMax ?? "—"}`}
            />
          )}
          {p.streak !== undefined && (
            <StatRow
              icon="🔥"
              label="Streak"
              value={`${p.streak}d`}
              valueColor={p.streak >= 7 ? colors.warning : undefined}
            />
          )}
          {p.rank !== undefined && (
            <StatRow icon="🏆" label="Rank" value={`#${p.rank}`} />
          )}
          {p.pending > 0 && (
            <StatRow
              icon="⏳"
              label="Pending"
              value={formatLunar(p.pending)}
              valueColor={colors.success}
            />
          )}
        </InfoSidebar>
      </SplitLayout>

      <Footer>Btn 1: Produce · 2: Colony · 3: Market · 4: Alliance</Footer>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COLONY
// ═══════════════════════════════════════════════════════════════════════════

export interface ColonyScreenProps {
  level: string;
  balance: number;
  production: number;
  moduleCount: string;
  modules: Array<{ type: string; count: number; tier?: TierKey }>;
  /** Enriched per-module data for the visual grid layout */
  moduleGrid?: Array<{
    type: string;
    tier?: TierKey;
    efficiency?: number;
    isActive?: boolean;
    level?: number;
  }>;
  /** Index of the selected module in moduleGrid for detail panel */
  selectedModule?: number;
}

export function ColonyScreen(p: ColonyScreenProps): ImageResponse {
  const hasGrid = p.moduleGrid && p.moduleGrid.length > 0;
  const selected =
    hasGrid && p.selectedModule !== undefined
      ? p.moduleGrid![p.selectedModule]
      : undefined;

  return img(
    <FrameCanvas gradient="colony">
      <Header icon="🏗️" title="YOUR COLONY">
        <LevelBadge level={p.level} />
        <BalanceDisplay amount={formatNumber(p.balance)} size="sm" />
      </Header>

      {hasGrid ? (
        /* ─── New: visual grid + detail split ─── */
        <SplitLayout mainWidth="60%" sideWidth="38%">
          {/* LEFT: 6-wide module grid */}
          <Panel title={`Colony Grid · ${p.moduleCount} modules`} flex={1}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {p.moduleGrid!.map((m, i) => (
                <ModuleGridCell
                  key={i}
                  moduleType={m.type}
                  tier={(m.tier as TierKey) ?? "COMMON"}
                  efficiency={m.efficiency}
                  isActive={m.isActive}
                  selected={i === p.selectedModule}
                />
              ))}
              {/* Empty placeholders to fill a 6-wide row */}
              {Array.from({
                length: Math.max(0, (6 - (p.moduleGrid!.length % 6)) % 6),
              }).map((_, j) => (
                <ModuleGridCell key={`e${j}`} empty />
              ))}
            </div>
            {/* Aggregate summary */}
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: colors.text.muted,
                marginTop: 4,
              }}
            >
              ⚡ {formatNumber(p.production)}/tick · 🏗️ {p.moduleCount} active
            </div>
          </Panel>

          {/* RIGHT: selected module detail or overview */}
          {selected ? (
            <Panel title="Module Detail" flex={1}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                }}
              >
                <ModuleGridCell
                  moduleType={selected.type}
                  tier={(selected.tier as TierKey) ?? "COMMON"}
                  efficiency={selected.efficiency}
                  isActive={selected.isActive}
                />
                <span
                  style={{
                    display: "flex",
                    ...typography.subtitle,
                    textTransform: "capitalize",
                  }}
                >
                  {selected.type.replace(/_/g, " ").toLowerCase()}
                </span>
              </div>
              <StatRow
                icon="📊"
                label="Efficiency"
                value={`${selected.efficiency ?? 100}%`}
                valueColor={
                  (selected.efficiency ?? 100) >= 80
                    ? colors.success
                    : (selected.efficiency ?? 100) >= 50
                      ? colors.warning
                      : colors.error
                }
              />
              <StatRow
                icon="⭐"
                label="Tier"
                value={selected.tier ?? "COMMON"}
                valueColor={
                  tierColors[(selected.tier as TierKey) ?? "COMMON"].border
                }
              />
              {selected.level !== undefined && (
                <StatRow
                  icon="🔧"
                  label="Level"
                  value={String(selected.level)}
                />
              )}
              <StatRow
                icon="🔌"
                label="Status"
                value={selected.isActive === false ? "Offline" : "Online"}
                valueColor={
                  selected.isActive === false ? colors.error : colors.success
                }
              />
            </Panel>
          ) : (
            <InfoSidebar title="Colony Stats">
              <StatRow
                icon="⚡"
                label="Production"
                value={`${formatNumber(p.production)}/t`}
              />
              <StatRow icon="🏗️" label="Modules" value={p.moduleCount} />
              <StatRow
                icon="💰"
                label="Balance"
                value={formatLunar(p.balance)}
                valueColor={colors.accent}
              />
              {p.modules.map((m, i) => (
                <StatRow
                  key={i}
                  icon={
                    moduleMeta[m.type as keyof typeof moduleMeta]?.icon ?? "📦"
                  }
                  label={m.type.replace(/_/g, " ").toLowerCase()}
                  value={`×${m.count}`}
                />
              ))}
            </InfoSidebar>
          )}
        </SplitLayout>
      ) : (
        /* ─── Fallback: legacy compact card list ─── */
        <>
          <Section direction="row" wrap gap={10} flex={1} mt={20}>
            {p.modules.length > 0 ? (
              p.modules.map((m, i) => (
                <ModuleCard
                  key={i}
                  moduleType={m.type}
                  tier={m.tier ?? "COMMON"}
                  count={m.count}
                  compact
                />
              ))
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: colors.text.muted,
                }}
              >
                No modules yet — build your first one!
              </div>
            )}
          </Section>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              color: colors.text.secondary,
              marginTop: 10,
            }}
          >
            <span style={{ display: "flex" }}>
              📊 {p.moduleCount} modules · ⚡ {formatNumber(p.production)}/tick
            </span>
          </div>
        </>
      )}

      <Footer>Btn 1: Build · 2: Upgrade · 3: Stats · 4: Home</Footer>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildItem {
  moduleType: string;
  cost: number;
  output: string;
  tier?: TierKey;
}

export interface BuildScreenProps {
  balance: number;
  moduleCount: string;
  maxModules: number;
  items: BuildItem[];
}

export function BuildScreen(p: BuildScreenProps): ImageResponse {
  return img(
    <FrameCanvas gradient="build">
      <Header icon="🔨" title="BUILD MODULE">
        <BalanceDisplay amount={formatNumber(p.balance)} size="sm" />
      </Header>

      {/* Capacity bar */}
      <div style={{ display: "flex", marginTop: 4 }}>
        <ProgressBar
          label={`Module slots: ${p.moduleCount}/${p.maxModules}`}
          value={Number(p.moduleCount)}
          max={p.maxModules}
          color={colors.accent}
          height={10}
        />
      </div>

      {/* Build options */}
      <Section direction="column" gap={12} flex={1} mt={20}>
        {p.items.map((item, i) => {
          const canAfford = p.balance >= item.cost;
          const tc = tierColors[item.tier ?? "COMMON"];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                background: canAfford
                  ? colors.glass.light
                  : `${colors.error}12`,
                borderLeft: `4px solid ${tc.border}`,
                border: canAfford
                  ? `1px solid ${colors.glass.medium}`
                  : `1px solid ${colors.error}30`,
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ display: "flex", fontSize: 28 }}>
                  {(
                    {
                      SOLAR_PANEL: "⚡",
                      MINING_RIG: "⛏️",
                      HABITAT: "🏠",
                      RESEARCH_LAB: "🔬",
                      WATER_EXTRACTOR: "💧",
                      OXYGEN_GENERATOR: "🫁",
                      STORAGE_DEPOT: "📦",
                      LAUNCH_PAD: "🚀",
                    } as Record<string, string>
                  )[item.moduleType] ?? "🔧"}
                </span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      display: "flex",
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    Btn {i + 1}:{" "}
                    {item.moduleType.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      fontSize: 15,
                      color: colors.text.muted,
                    }}
                  >
                    {item.output}
                  </span>
                </div>
              </div>
              <span
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  color: canAfford ? colors.success : colors.error,
                }}
              >
                {formatNumber(item.cost)} $L
              </span>
            </div>
          );
        })}
      </Section>

      <Footer>Btn 4: Back to Colony</Footer>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET
// ═══════════════════════════════════════════════════════════════════════════

export interface MarketResource {
  resource: ResourceKey;
  price: string;
  changePercent: string;
  trend: "up" | "down" | "stable";
}

export interface MarketScreenProps {
  balance: number;
  alertCount: number;
  resources: MarketResource[];
  /** Optional 24 h price history for the featured resource (normalised 0-1) */
  sparklineData?: number[];
  /** Featured resource key (first resource used if omitted) */
  featuredResource?: ResourceKey;
  /** Buy/sell depth data for featured resource */
  depth?: { buyPct: number; sellPct: number; buyQty: string; sellQty: string };
  /** Player's open orders summary */
  openOrders?: number;
}

export function MarketScreen(p: MarketScreenProps): ImageResponse {
  const hasSparkline = p.sparklineData && p.sparklineData.length > 0;
  const featured = p.featuredResource ?? p.resources[0]?.resource;
  const featuredRow = p.resources.find((r) => r.resource === featured);

  return img(
    <FrameCanvas gradient="market">
      <Header icon="📈" title="LUNAR MARKET">
        <BalanceDisplay amount={formatNumber(p.balance)} size="sm" />
        {p.alertCount > 0 && (
          <Badge color={colors.warning} bg={`${colors.warning}20`}>
            🔔 {p.alertCount}
          </Badge>
        )}
      </Header>

      {hasSparkline ? (
        /* ─── New: sparkline + depth + price list split ─── */
        <SplitLayout mainWidth="58%" sideWidth="40%">
          {/* LEFT: chart + depth for featured resource */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            {/* Sparkline chart */}
            <Panel
              title={`${featuredRow ? (featuredRow.resource as string) : String(featured)} · 24 h`}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 12,
                }}
              >
                <Sparkline
                  data={p.sparklineData!}
                  color={
                    featuredRow?.trend === "up"
                      ? colors.success
                      : featuredRow?.trend === "down"
                        ? colors.error
                        : colors.accent
                  }
                  height={52}
                  barWidth={4}
                  gap={1}
                />
                {/* Live price callout */}
                {featuredRow && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        ...typography.mono,
                        fontSize: 22,
                        fontWeight: 700,
                        color: colors.text.primary,
                      }}
                    >
                      {featuredRow.price} $L
                    </span>
                    <span
                      style={{
                        display: "flex",
                        ...typography.mono,
                        fontSize: 13,
                        color:
                          featuredRow.trend === "up"
                            ? colors.success
                            : featuredRow.trend === "down"
                              ? colors.error
                              : colors.text.muted,
                      }}
                    >
                      {featuredRow.changePercent}
                    </span>
                  </div>
                )}
              </div>
            </Panel>

            {/* Depth bar */}
            {p.depth && (
              <Panel title="Market Depth">
                <DepthBar
                  buyPct={p.depth.buyPct}
                  sellPct={p.depth.sellPct}
                  buyLabel={`Buy ${p.depth.buyQty}`}
                  sellLabel={`Sell ${p.depth.sellQty}`}
                />
              </Panel>
            )}

            {/* Open orders */}
            {p.openOrders !== undefined && p.openOrders > 0 && (
              <div
                style={{
                  display: "flex",
                  fontSize: 13,
                  color: colors.text.muted,
                }}
              >
                📋 {p.openOrders} open order{p.openOrders > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* RIGHT: price list for all resources */}
          <Panel title="All Resources" flex={1}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {p.resources.map((r, i) => (
                <StatRow
                  key={i}
                  icon={resourceMeta[r.resource]?.icon ?? "💎"}
                  label={resourceMeta[r.resource]?.label ?? String(r.resource)}
                  value={`${r.price} $L`}
                  trend={
                    r.trend === "up"
                      ? "up"
                      : r.trend === "down"
                        ? "down"
                        : "flat"
                  }
                />
              ))}
            </div>
          </Panel>
        </SplitLayout>
      ) : (
        /* ─── Fallback: classic price row list ─── */
        <Section direction="column" gap={10} flex={1} mt={18}>
          {p.resources.map((r, i) => (
            <PriceRow
              key={i}
              resource={r.resource}
              price={r.price}
              changePercent={r.changePercent}
              trend={r.trend}
            />
          ))}
        </Section>
      )}

      <Footer>Btn 1: Buy · 2: Sell · 3: Prices · 4: Home</Footer>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ALLIANCE
// ═══════════════════════════════════════════════════════════════════════════

export interface AllianceScreenProps {
  balance: number;
}

export function AllianceScreen(p: AllianceScreenProps): ImageResponse {
  return img(
    <FrameCanvas gradient="alliance">
      <Header icon="🤝" title="ALLIANCE HQ" />

      <div
        style={{
          display: "flex",
          fontSize: 20,
          color: colors.text.secondary,
          marginTop: 4,
        }}
      >
        Join forces with other colonists
      </div>

      <Section
        direction="column"
        align="center"
        justify="center"
        flex={1}
        gap={16}
      >
        <span style={{ display: "flex", fontSize: 56 }}>🏗️</span>
        <span
          style={{ display: "flex", fontSize: 26, color: colors.text.muted }}
        >
          Alliance system coming soon
        </span>
        <span
          style={{ display: "flex", fontSize: 18, color: colors.text.disabled }}
        >
          Co-op bonuses · Shared treasury · Ranked leagues
        </span>
      </Section>

      <div
        style={{
          display: "flex",
          fontSize: 16,
          color: colors.text.muted,
        }}
      >
        💰 {formatLunar(p.balance)}
      </div>

      <Footer>Btn 1: Info · Btn 4: Home</Footer>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT (Build / Trade success or failure)
// ═══════════════════════════════════════════════════════════════════════════

export interface BuildResultProps {
  success: boolean;
  moduleName: string;
  balance: number;
  modules: string;
  error?: string;
}

export function BuildResultScreen(p: BuildResultProps): ImageResponse {
  return img(
    <FrameCanvas gradient={p.success ? "success" : "error"}>
      <Section
        direction="column"
        align="center"
        justify="center"
        flex={1}
        gap={12}
      >
        <span style={{ display: "flex", fontSize: 64 }}>
          {p.success ? "✅" : "❌"}
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
            textTransform: "capitalize",
            marginTop: 8,
          }}
        >
          {p.success ? `${p.moduleName} Built!` : "Build Failed"}
        </span>

        {p.success ? (
          <Section direction="column" align="center" gap={6} mt={14}>
            <span
              style={{
                display: "flex",
                fontSize: 20,
                color: colors.text.secondary,
              }}
            >
              💰 Balance: {formatLunar(p.balance)}
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 20,
                color: colors.text.secondary,
              }}
            >
              🏗️ Total Modules: {p.modules}
            </span>
          </Section>
        ) : (
          <span
            style={{
              display: "flex",
              fontSize: 20,
              color: `${colors.error}CC`,
              marginTop: 12,
              maxWidth: 600,
              textAlign: "center",
            }}
          >
            {p.error}
          </span>
        )}
      </Section>
    </FrameCanvas>,
  );
}

export interface TradeResultProps {
  success: boolean;
  side: string;
  resource: string;
  quantity: string;
  avgPrice: string;
  totalCost: string;
  slippage: string;
  balance: number;
  error?: string;
}

export function TradeResultScreen(p: TradeResultProps): ImageResponse {
  return img(
    <FrameCanvas gradient={p.success ? "success" : "error"}>
      <Section
        direction="column"
        align="center"
        justify="center"
        flex={1}
        gap={12}
      >
        <span style={{ display: "flex", fontSize: 64 }}>
          {p.success ? "✅" : "❌"}
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 700,
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {p.success
            ? `${p.side} ${p.quantity} ${p.resource}`
            : `${p.side} ${p.resource} Failed`}
        </span>

        {p.success ? (
          <Section direction="column" align="center" gap={6} mt={14}>
            <span
              style={{
                display: "flex",
                fontSize: 20,
                color: colors.text.secondary,
              }}
            >
              💰 Avg Price: {Number(p.avgPrice).toFixed(4)} $L
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 20,
                color: colors.text.secondary,
              }}
            >
              📊 Total: {Number(p.totalCost).toFixed(2)} $L
            </span>
            <span
              style={{
                display: "flex",
                fontSize: 18,
                color: colors.text.muted,
              }}
            >
              Slippage: {p.slippage}% · Balance: {formatLunar(p.balance)}
            </span>
          </Section>
        ) : (
          <span
            style={{
              display: "flex",
              fontSize: 20,
              color: `${colors.error}CC`,
              marginTop: 12,
              maxWidth: 600,
              textAlign: "center",
            }}
          >
            {p.error}
          </span>
        )}
      </Section>
    </FrameCanvas>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

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
