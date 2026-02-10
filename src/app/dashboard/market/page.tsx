"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  useMarketOverview,
  useResourceDetail,
  useExecuteTrade,
  type MarketResource,
  type PriceHistoryEntry,
  type DepthOrder,
} from "@/hooks/use-market";
import { useColony } from "@/hooks/use-colony";
import { useUIStore } from "@/stores/ui-store";
import { useGameStore } from "@/stores/game-store";
import { MarketDepthViz } from "@/components/visualizations/market-depth";

import { TrendArrow } from "@/components/visualizations/status-indicators";
import {
  MarketTicker,
  type MarketTickerItem,
} from "@/components/visualizations/live-displays";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESOURCE_ICONS: Record<string, string> = {
  REGOLITH: "🪨",
  WATER_ICE: "🧊",
  HELIUM3: "⚛️",
  RARE_EARTH: "💎",
  LUNAR: "💰",
};

const RESOURCE_COLORS: Record<string, string> = {
  REGOLITH: "#f97316",
  WATER_ICE: "#3b82f6",
  HELIUM3: "#a855f7",
  RARE_EARTH: "#ef4444",
  LUNAR: "#facc15",
};

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-slate-300">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold text-white">
            {Number(p.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Terminal Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const { data: overview, isLoading: overviewLoading } = useMarketOverview();
  const { data: colony } = useColony();
  const selectedResource = useGameStore((s) => s.selectedResource);
  const setSelectedResource = useGameStore((s) => s.setSelectedResource);
  const addToast = useUIStore((s) => s.addToast);

  const [selected, setSelected] = useState<string>(
    selectedResource ?? "REGOLITH",
  );
  const { data: detail, isLoading: detailLoading } =
    useResourceDetail(selected);
  const trade = useExecuteTrade();

  // Trade form state
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");

  const handleSelect = useCallback(
    (res: string) => {
      setSelected(res);
      setSelectedResource(res);
    },
    [setSelectedResource],
  );

  // Price chart data
  const priceData = useMemo(() => {
    if (!detail?.history) return [];
    return detail.history.map((h: PriceHistoryEntry) => ({
      time: new Date(h.snapshotAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: h.price,
      volume: h.volume,
    }));
  }, [detail]);

  // Depth data
  const depthData = useMemo(() => {
    if (!detail?.depth) return [];
    const bids = (detail.depth.bids ?? []).map((b: DepthOrder) => ({
      price: b.price,
      bid: b.quantity,
      ask: 0,
    }));
    const asks = (detail.depth.asks ?? []).map((a: DepthOrder) => ({
      price: a.price,
      bid: 0,
      ask: a.quantity,
    }));
    return [...bids.reverse(), ...asks];
  }, [detail]);

  // Resource info from overview
  const resourceInfo = useMemo(() => {
    if (!overview?.resources) return null;
    return (
      overview.resources.find((r: MarketResource) => r.type === selected) ??
      null
    );
  }, [overview, selected]);

  // Estimated cost
  const qty = Number(quantity) || 0;
  const unitPrice = resourceInfo?.currentPrice ?? 0;
  const estCost = qty * unitPrice;
  const canAfford =
    side === "buy" ? (colony?.lunarBalance ?? 0) >= estCost : true;

  const handleTrade = async () => {
    if (!qty || qty <= 0) return;
    try {
      await trade.mutateAsync({ resource: selected, side, quantity: qty });
      addToast({
        type: "success",
        title: `${side === "buy" ? "Bought" : "Sold"} ${qty} ${selected}`,
        icon: side === "buy" ? "📥" : "📤",
      });
      setQuantity("");
    } catch (err) {
      addToast({
        type: "error",
        title: "Trade failed",
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  if (overviewLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading market…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <h1 className="text-xl font-bold">
        <span className="mr-2">📈</span>Market Terminal
      </h1>

      {/* Live market ticker tape */}
      {overview?.resources && (
        <MarketTicker
          items={overview.resources.map(
            (r: MarketResource): MarketTickerItem => ({
              symbol: r.type.replace(/_/g, " "),
              price: r.currentPrice,
              change: r.changePercent,
              icon: RESOURCE_ICONS[r.type],
            }),
          )}
          speed={35}
        />
      )}

      {/* Resource selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(overview?.resources ?? []).map((r: MarketResource) => (
          <button
            key={r.type}
            onClick={() => handleSelect(r.type)}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              selected === r.type
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700"
            }`}
          >
            <span>{RESOURCE_ICONS[r.type] ?? "📦"}</span>
            <span className="hidden sm:inline">
              {r.type.replace(/_/g, " ")}
            </span>
            <span
              className={`text-xs tabular-nums ${r.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {r.changePercent >= 0 ? "+" : ""}
              {r.changePercent.toFixed(1)}%
            </span>
          </button>
        ))}
      </div>

      {/* Price + Chart section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Price chart (2 cols) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <span className="text-2xl">
                {RESOURCE_ICONS[selected] ?? "📦"}
              </span>
              <span className="ml-2 text-lg font-bold capitalize text-white">
                {selected.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
            {resourceInfo && (
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-white">
                  {resourceInfo.currentPrice.toFixed(2)} $L
                </div>
                <div
                  className={`text-xs tabular-nums ${resourceInfo.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {resourceInfo.changePercent >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(resourceInfo.changePercent).toFixed(2)}%
                </div>
              </div>
            )}
          </div>

          {priceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="gradPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={RESOURCE_COLORS[selected] ?? "#06b6d4"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={RESOURCE_COLORS[selected] ?? "#06b6d4"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  name="Price"
                  stroke={RESOURCE_COLORS[selected] ?? "#06b6d4"}
                  fill="url(#gradPrice)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-500">
              {detailLoading
                ? "Loading chart…"
                : "Price history will appear soon."}
            </div>
          )}
        </div>

        {/* Trade form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Place Order
          </h3>

          {/* Buy / Sell toggle */}
          <div className="mb-4 flex rounded-lg border border-slate-800 p-0.5">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  side === s
                    ? s === "buy"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {s === "buy" ? "📥 Buy" : "📤 Sell"}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <label className="mb-1 block text-xs text-slate-500">Quantity</label>
          <input
            type="number"
            min={0}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
          />

          {/* Estimate */}
          <div className="mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Price</span>
              <span className="tabular-nums">{unitPrice.toFixed(2)} $L</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Est. {side === "buy" ? "Cost" : "Revenue"}</span>
              <span className="tabular-nums font-semibold text-white">
                {estCost.toFixed(2)} $L
              </span>
            </div>
            {side === "buy" && !canAfford && qty > 0 && (
              <div className="text-xs text-red-400">Insufficient balance</div>
            )}
          </div>

          {/* Execute */}
          <button
            onClick={handleTrade}
            disabled={
              !qty ||
              qty <= 0 ||
              trade.isPending ||
              (side === "buy" && !canAfford)
            }
            className={`w-full rounded-lg py-2.5 text-sm font-bold transition disabled:opacity-40 ${
              side === "buy"
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-red-600 text-white hover:bg-red-500"
            }`}
          >
            {trade.isPending
              ? "Processing…"
              : `${side === "buy" ? "Buy" : "Sell"} ${selected.replace(/_/g, " ")}`}
          </button>

          {/* Balance */}
          <div className="mt-3 text-center text-xs text-slate-500">
            Balance: {Math.floor(colony?.lunarBalance ?? 0)} $LUNAR
          </div>
        </div>
      </div>

      {/* Depth chart */}
      {detail?.depth && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">
            Order Book Depth
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* SVG depth visualization */}
            <div className="flex justify-center">
              <MarketDepthViz
                bids={detail.depth.bids ?? []}
                asks={detail.depth.asks ?? []}
                currentPrice={detail.depth.currentPrice}
                spread={detail.depth.spread}
                width={320}
                height={160}
              />
            </div>

            {/* Bar chart version */}
            {depthData.length > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={depthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="price"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toFixed(1)}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="bid"
                    name="Bids"
                    fill="#10b981"
                    stackId="depth"
                  />
                  <Bar
                    dataKey="ask"
                    name="Asks"
                    fill="#ef4444"
                    stackId="depth"
                  />
                  {resourceInfo && (
                    <ReferenceLine
                      x={resourceInfo.currentPrice}
                      stroke="#facc15"
                      strokeDasharray="3 3"
                      label={{ value: "Price", fill: "#facc15", fontSize: 10 }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Market overview table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">
          All Resources
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                <th className="pb-2">Resource</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">24h</th>
                <th className="hidden pb-2 text-right sm:table-cell">Supply</th>
                <th className="hidden pb-2 text-right sm:table-cell">Demand</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.resources ?? []).map((r: MarketResource) => (
                <tr
                  key={r.type}
                  onClick={() => handleSelect(r.type)}
                  className={`cursor-pointer border-b border-slate-800/50 transition hover:bg-slate-800/30 ${
                    selected === r.type ? "bg-slate-800/20" : ""
                  }`}
                >
                  <td className="py-2">
                    <span className="mr-2">
                      {RESOURCE_ICONS[r.type] ?? "📦"}
                    </span>
                    <span className="capitalize">
                      {r.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold text-white">
                    {r.currentPrice.toFixed(2)}
                  </td>
                  <td
                    className={`py-2 text-right tabular-nums ${r.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    <TrendArrow
                      direction={r.changePercent}
                      value={Math.abs(r.changePercent)}
                    />
                  </td>
                  <td className="hidden py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                    {r.supply?.toLocaleString() ?? "—"}
                  </td>
                  <td className="hidden py-2 text-right tabular-nums text-slate-400 sm:table-cell">
                    {r.demand?.toLocaleString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
