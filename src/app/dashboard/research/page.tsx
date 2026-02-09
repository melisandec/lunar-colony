"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useColony } from "@/hooks/use-colony";
import { GAME_CONSTANTS } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Module metadata for research tree
// ---------------------------------------------------------------------------

const TIERS = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;

const TIER_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  COMMON: {
    bg: "bg-slate-800/50",
    border: "border-slate-600",
    text: "text-slate-300",
  },
  UNCOMMON: {
    bg: "bg-emerald-900/20",
    border: "border-emerald-600/40",
    text: "text-emerald-400",
  },
  RARE: {
    bg: "bg-blue-900/20",
    border: "border-blue-500/40",
    text: "text-blue-400",
  },
  EPIC: {
    bg: "bg-purple-900/20",
    border: "border-purple-500/40",
    text: "text-purple-400",
  },
  LEGENDARY: {
    bg: "bg-amber-900/20",
    border: "border-amber-500/40",
    text: "text-amber-400",
  },
};

const TIER_REQUIREMENTS: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 3,
  RARE: 5,
  EPIC: 8,
  LEGENDARY: 12,
};

const MODULE_TYPES = GAME_CONSTANTS.MODULE_TYPES;

const MODULE_META: Record<
  string,
  { icon: string; name: string; description: string; category: string }
> = {
  SOLAR_PANEL: {
    icon: "⚡",
    name: "Solar Panel",
    description: "Generates energy from solar radiation",
    category: "Energy",
  },
  MINING_RIG: {
    icon: "⛏️",
    name: "Mining Rig",
    description: "Extracts raw materials from regolith",
    category: "Production",
  },
  HABITAT: {
    icon: "🏠",
    name: "Habitat",
    description: "Houses crew to boost colony output",
    category: "Support",
  },
  RESEARCH_LAB: {
    icon: "🔬",
    name: "Research Lab",
    description: "Unlocks advanced technologies",
    category: "Research",
  },
  WATER_EXTRACTOR: {
    icon: "💧",
    name: "Water Extractor",
    description: "Harvests ice deposits for water",
    category: "Production",
  },
  OXYGEN_GENERATOR: {
    icon: "🫁",
    name: "Oxygen Generator",
    description: "Produces breathable atmosphere",
    category: "Support",
  },
  STORAGE_DEPOT: {
    icon: "📦",
    name: "Storage Depot",
    description: "Increases resource capacity",
    category: "Logistics",
  },
  LAUNCH_PAD: {
    icon: "🚀",
    name: "Launch Pad",
    description: "Enables trade and exploration missions",
    category: "Logistics",
  },
};

// ---------------------------------------------------------------------------
// Research Tree Page
// ---------------------------------------------------------------------------

export default function ResearchPage() {
  const { data: colony, isLoading } = useColony();
  const playerLevel = colony?.level ?? 1;

  // Figure out which tiers each module type has been built at
  const builtTiers = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (colony) {
      for (const m of colony.modules) {
        const set = map.get(m.type) ?? new Set<string>();
        set.add(m.tier);
        map.set(m.type, set);
      }
    }
    return map;
  }, [colony]);

  // Count modules by type
  const moduleCountByType = useMemo(() => {
    const map = new Map<string, number>();
    if (colony) {
      for (const m of colony.modules) {
        map.set(m.type, (map.get(m.type) ?? 0) + 1);
      }
    }
    return map;
  }, [colony]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">
          Loading research tree…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          <span className="mr-2">🔬</span>Research Tree
        </h1>
        <span className="rounded-lg bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-400">
          Level {playerLevel}
        </span>
      </div>

      {/* Tier legend */}
      <div className="flex flex-wrap gap-2">
        {TIERS.map((tier) => {
          const colors = TIER_COLORS[tier]!;
          const unlocked = playerLevel >= (TIER_REQUIREMENTS[tier] ?? 99);
          return (
            <div
              key={tier}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                unlocked
                  ? `${colors.border} ${colors.bg} ${colors.text}`
                  : "border-slate-800 bg-slate-900/30 text-slate-600"
              }`}
            >
              {unlocked ? "✅" : "🔒"}{" "}
              <span className="font-medium">{tier}</span>
              <span className="text-[10px] opacity-60">
                Lv.{TIER_REQUIREMENTS[tier]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tree grid: modules as rows, tiers as columns */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="mb-2 grid grid-cols-[200px_repeat(5,1fr)] gap-2 px-2 text-xs text-slate-500">
            <div>Module</div>
            {TIERS.map((t) => (
              <div key={t} className="text-center">
                {t}
              </div>
            ))}
          </div>

          {/* Module rows */}
          {MODULE_TYPES.map((type, idx) => {
            const meta = MODULE_META[type] ?? {
              icon: "📦",
              name: type,
              description: "",
              category: "Other",
            };
            const built = builtTiers.get(type) ?? new Set();
            const count = moduleCountByType.get(type) ?? 0;

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="mb-2 grid grid-cols-[200px_repeat(5,1fr)] items-center gap-2 rounded-xl border border-slate-800/50 bg-slate-900/30 px-2 py-3"
              >
                {/* Module info */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meta.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {meta.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {meta.category} · ×{count}
                    </div>
                  </div>
                </div>

                {/* Tier nodes */}
                {TIERS.map((tier, tierIdx) => {
                  const unlockLv = TIER_REQUIREMENTS[tier] ?? 99;
                  const unlocked = playerLevel >= unlockLv;
                  const hasBuilt = built.has(tier);
                  const colors = TIER_COLORS[tier]!;

                  return (
                    <div key={tier} className="flex justify-center">
                      <div className="relative">
                        {/* Connection line to next */}
                        {tierIdx < TIERS.length - 1 && (
                          <div className="absolute top-1/2 left-full -translate-y-1/2 h-[2px] w-[calc(100%-2px)] bg-slate-700" />
                        )}

                        <motion.div
                          whileHover={unlocked ? { scale: 1.1 } : undefined}
                          className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg border transition ${
                            hasBuilt
                              ? `${colors.border} ${colors.bg} ring-2 ring-${colors.text.replace("text-", "")}/20`
                              : unlocked
                                ? `${colors.border} ${colors.bg} opacity-80`
                                : "border-slate-800/60 bg-slate-900/50 opacity-40"
                          }`}
                          title={
                            hasBuilt
                              ? `${tier} — Built!`
                              : unlocked
                                ? `${tier} — Available`
                                : `${tier} — Requires Lv.${unlockLv}`
                          }
                        >
                          {hasBuilt ? (
                            <span className="text-lg">✅</span>
                          ) : unlocked ? (
                            <span className="text-lg">🔓</span>
                          ) : (
                            <span className="text-lg opacity-50">🔒</span>
                          )}
                          <span className="text-[9px] font-medium leading-none text-slate-500">
                            Lv.{unlockLv}
                          </span>
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Module info cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODULE_TYPES.map((type) => {
          const meta = MODULE_META[type] ?? {
            icon: "📦",
            name: type,
            description: "",
            category: "Other",
          };
          const count = moduleCountByType.get(type) ?? 0;
          const built = builtTiers.get(type) ?? new Set();
          const highestTier = [...TIERS].reverse().find((t) => built.has(t));

          return (
            <div
              key={type}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {meta.name}
                  </h3>
                  <p className="text-[10px] text-slate-500">{meta.category}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">{meta.description}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Built: {count}</span>
                <span
                  className={`font-medium ${
                    highestTier
                      ? (TIER_COLORS[highestTier]?.text ?? "text-slate-400")
                      : "text-slate-600"
                  }`}
                >
                  {highestTier ?? "None"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
