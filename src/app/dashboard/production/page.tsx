"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import {
  useColony,
  useProductionHistory,
  type ProductionEntry,
} from "@/hooks/use-colony";
import { EfficiencyGauge } from "@/components/visualizations/efficiency-gauge";
import {
  DonutChart,
  type DonutSegment,
} from "@/components/visualizations/donut-chart";
import { Sparkline } from "@/components/visualizations/sparkline";
import { TickCountdown } from "@/components/visualizations/live-displays";
import { LiveCounter } from "@/components/visualizations/live-displays";
import { FillMeter } from "@/components/visualizations/fill-meter";

// ---------------------------------------------------------------------------
// Module palette for chart colors
// ---------------------------------------------------------------------------

const MODULE_COLORS: Record<string, string> = {
  SOLAR_PANEL: "#facc15",
  MINING_RIG: "#f97316",
  HABITAT: "#06b6d4",
  RESEARCH_LAB: "#a855f7",
  WATER_EXTRACTOR: "#3b82f6",
  OXYGEN_GENERATOR: "#10b981",
  STORAGE_DEPOT: "#64748b",
  LAUNCH_PAD: "#ef4444",
};

const MODULE_ICONS: Record<string, string> = {
  SOLAR_PANEL: "⚡",
  MINING_RIG: "⛏️",
  HABITAT: "🏠",
  RESEARCH_LAB: "🔬",
  WATER_EXTRACTOR: "💧",
  OXYGEN_GENERATOR: "🫁",
  STORAGE_DEPOT: "📦",
  LAUNCH_PAD: "🚀",
};

// ---------------------------------------------------------------------------
// Custom Recharts tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
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
            {Number(p.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production Analytics Page
// ---------------------------------------------------------------------------

export default function ProductionPage() {
  const { data: colony, isLoading: colonyLoading } = useColony();
  const { data: history, isLoading: historyLoading } = useProductionHistory();

  // --- summary stats --------------------------------------------------
  const stats = useMemo(() => {
    if (!colony)
      return {
        totalRate: 0,
        activeModules: 0,
        totalModules: 0,
        avgEfficiency: 0,
        bestModule: null as null | { type: string; output: number },
      };

    const active = colony.modules.filter((m) => m.isActive);
    const avgEff =
      active.length > 0
        ? Math.round(
            active.reduce((s, m) => s + m.efficiency, 0) / active.length,
          )
        : 0;
    const best = [...colony.modules].sort(
      (a, b) => b.baseOutput + b.bonusOutput - (a.baseOutput + a.bonusOutput),
    )[0];

    return {
      totalRate: colony.productionRate,
      activeModules: active.length,
      totalModules: colony.modules.length,
      avgEfficiency: avgEff,
      bestModule: best
        ? { type: best.type, output: best.baseOutput + best.bonusOutput }
        : null,
    };
  }, [colony]);

  // --- production by module type -------------------------------------
  const moduleBreakdown = useMemo(() => {
    if (!colony) return [];
    const map = new Map<
      string,
      { type: string; count: number; output: number }
    >();
    for (const m of colony.modules) {
      const prev = map.get(m.type) ?? { type: m.type, count: 0, output: 0 };
      map.set(m.type, {
        type: m.type,
        count: prev.count + 1,
        output: prev.output + m.baseOutput + m.bonusOutput,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.output - a.output);
  }, [colony]);

  // --- production history for charts ---------------------------------
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map((entry: ProductionEntry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      produced: entry.totalProduced,
      collected: entry.totalCollected,
      efficiency: entry.avgEfficiency,
    }));
  }, [history]);

  const isLoading = colonyLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">
          Loading production data…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <h1 className="text-xl font-bold">
        <span className="mr-2">📊</span>Production Analytics
      </h1>

      {/* Live Overview Strip */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <EfficiencyGauge
          value={stats.avgEfficiency}
          size={72}
          label="Colony Eff"
          strokeWidth={5}
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">Production Rate</span>
          <LiveCounter
            value={stats.totalRate}
            decimals={1}
            suffix="/tick"
            size="lg"
            color="#06b6d4"
          />
        </div>

        <div className="hidden h-10 w-px bg-slate-800 sm:block" />

        <TickCountdown size={48} />

        <div className="hidden h-10 w-px bg-slate-800 sm:block" />

        {/* Module type donut */}
        {moduleBreakdown.length > 0 && (
          <DonutChart
            segments={moduleBreakdown.map(
              (m): DonutSegment => ({
                label: m.type.replace(/_/g, " "),
                value: m.output,
                color: MODULE_COLORS[m.type] ?? "#64748b",
                icon: MODULE_ICONS[m.type],
              }),
            )}
            size={72}
            thickness={0.35}
            centerValue={`${stats.totalModules}`}
            centerLabel="modules"
          />
        )}

        {/* Efficiency sparkline from history */}
        {chartData.length >= 2 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Efficiency Trend</span>
            <Sparkline
              data={chartData.map((d) => d.efficiency)}
              width={100}
              height={32}
              color="#10b981"
              showDot
              dotRadius={2.5}
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Production Rate"
          value={`${stats.totalRate.toFixed(1)}/tick`}
          icon="⚡"
          color="text-cyan-400"
        />
        <SummaryCard
          label="Active Modules"
          value={`${stats.activeModules}/${stats.totalModules}`}
          icon="🏗️"
          color="text-emerald-400"
        />
        <SummaryCard
          label="Avg Efficiency"
          value={`${stats.avgEfficiency}%`}
          icon="📈"
          color={
            stats.avgEfficiency >= 80
              ? "text-emerald-400"
              : stats.avgEfficiency >= 50
                ? "text-amber-400"
                : "text-red-400"
          }
        />
        <SummaryCard
          label="Best Module"
          value={
            stats.bestModule
              ? `${MODULE_ICONS[stats.bestModule.type] ?? ""} ${stats.bestModule.output}/t`
              : "—"
          }
          icon="🏆"
          color="text-amber-400"
        />
      </div>

      {/* Earnings Over Time */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Earnings Over Time
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradColl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="produced"
                name="Produced"
                stroke="#06b6d4"
                fill="url(#gradProd)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke="#a855f7"
                fill="url(#gradColl)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Production history will appear after your first tick cycle." />
        )}
      </div>

      {/* Efficiency Trend */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">
          Efficiency Trend
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="efficiency"
                name="Efficiency %"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart message="Efficiency data will appear soon." />
        )}
      </div>

      {/* Module Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Output by Module Type
          </h2>
          {moduleBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={moduleBreakdown} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tickFormatter={(t: string) =>
                    `${MODULE_ICONS[t] ?? ""} ${t.replace(/_/g, " ").slice(0, 12)}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="output" name="Output/tick" radius={[0, 4, 4, 0]}>
                  {moduleBreakdown.map((entry) => (
                    <Cell
                      key={entry.type}
                      fill={MODULE_COLORS[entry.type] ?? "#64748b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Build modules to see breakdown." />
          )}
        </div>

        {/* Module list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Module Summary
          </h2>
          <div className="space-y-2">
            {moduleBreakdown.length > 0 ? (
              moduleBreakdown.map((entry) => (
                <div
                  key={entry.type}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {MODULE_ICONS[entry.type] ?? "📦"}
                    </span>
                    <div>
                      <div className="text-sm font-medium capitalize text-white">
                        {entry.type.replace(/_/g, " ").toLowerCase()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ×{entry.count}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Mini fill meter showing % of total */}
                    <FillMeter
                      value={entry.output}
                      max={stats.totalRate || 1}
                      color={MODULE_COLORS[entry.type] ?? "#64748b"}
                      showLabel={false}
                      height={4}
                      animate={false}
                      className="w-16"
                    />
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums text-white">
                        {entry.output.toFixed(1)}/t
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {(
                          (entry.output / (stats.totalRate || 1)) *
                          100
                        ).toFixed(0)}
                        % of total
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No modules built yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
    >
      <div className="text-xs text-slate-500">
        {icon} {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${color}`}>
        {value}
      </div>
    </motion.div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-500">
      {message}
    </div>
  );
}
