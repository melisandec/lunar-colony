"use client";

import { useColony, useUpgradeModule } from "@/hooks/use-colony";
import { useUIStore } from "@/stores/ui-store";

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

const UPGRADE_BASE_COSTS: Record<string, number> = {
  SOLAR_PANEL: 50,
  MINING_RIG: 125,
  HABITAT: 100,
  RESEARCH_LAB: 250,
  WATER_EXTRACTOR: 150,
  OXYGEN_GENERATOR: 175,
  STORAGE_DEPOT: 75,
  LAUNCH_PAD: 500,
};

function upgradeCost(type: string, level: number): number {
  const base = UPGRADE_BASE_COSTS[type] ?? 100;
  return Math.floor(base * Math.pow(1.5, level - 1));
}

export default function UpgradesPage() {
  const { data: colony, isLoading } = useColony();
  const upgrade = useUpgradeModule();
  const addToast = useUIStore((s) => s.addToast);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading upgrades…</div>
      </div>
    );
  }

  const modules = colony?.modules ?? [];
  const balance = colony?.lunarBalance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white">⬆️ Upgrades</h2>
        <p className="text-sm text-slate-400">
          Enhance your modules. Each level gives +15% base output. Max Lv.10.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Balance: {Math.floor(balance).toLocaleString()} $LUNAR
        </p>
      </div>

      {modules.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-sm text-slate-400">
            No modules built yet. Build some modules first!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules
            .sort((a, b) => a.type.localeCompare(b.type))
            .map((m) => {
              const cost = upgradeCost(m.type, m.level);
              const isMaxLevel = m.level >= 10;
              const canAfford = balance >= cost;

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-800/60 bg-slate-900/50 p-4"
                >
                  <span className="text-2xl">
                    {MODULE_ICONS[m.type] ?? "📦"}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">
                      {m.type.replace(/_/g, " ")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lv.{m.level}/10 · Output: {m.baseOutput.toFixed(1)}/tick ·
                      Eff: {m.efficiency}%
                    </p>
                    {!isMaxLevel && (
                      <p className="text-[10px] text-slate-600">
                        Next: +{(m.baseOutput * 0.15).toFixed(1)}/tick output
                      </p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await upgrade.mutateAsync(m.id);
                        addToast({
                          type: "success",
                          title: `Upgraded to Lv.${m.level + 1}!`,
                          icon: "⬆️",
                        });
                      } catch (err) {
                        addToast({
                          type: "error",
                          title: "Upgrade failed",
                          message:
                            err instanceof Error
                              ? err.message
                              : "Unknown error",
                          icon: "❌",
                        });
                      }
                    }}
                    disabled={upgrade.isPending || isMaxLevel || !canAfford}
                    className="shrink-0 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isMaxLevel
                      ? "MAX"
                      : upgrade.isPending
                        ? "…"
                        : `${cost.toLocaleString()} $L`}
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
