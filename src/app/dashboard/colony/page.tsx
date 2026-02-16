"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-device";
import { ColonySkeleton } from "@/components/dashboard/colony-skeleton";
import {
  useColony,
  useRepositionModule,
  useBuildModule,
  useUpgradeModule,
  useAssignCrew,
  useRecruitCrew,
  useToggleModule,
  useRepairModule,
  useDemolishModule,
  useDailyReward,
  useBlueprints,
  type Blueprint,
} from "@/hooks/use-colony";
import {
  useGameStore,
  type DashboardModule,
  type DashboardCrew,
} from "@/stores/game-store";
import { useUIStore } from "@/stores/ui-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard";
import { ModuleCard, EmptyGridCell } from "@/components/dashboard/module-card";
import { GAME_CONSTANTS } from "@/lib/utils";
import { EfficiencyGauge } from "@/components/visualizations/efficiency-gauge";
import { FillMeter } from "@/components/visualizations/fill-meter";
import { StatusDot } from "@/components/visualizations/status-indicators";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_COLS = 5;
const GRID_ROWS = 4;
const MAX_MODULES = GAME_CONSTANTS.MAX_MODULES;

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

const MODULE_LABELS: Record<string, string> = {
  SOLAR_PANEL: "Solar Panel",
  MINING_RIG: "Mining Rig",
  HABITAT: "Habitat",
  RESEARCH_LAB: "Research Lab",
  WATER_EXTRACTOR: "Water Extractor",
  OXYGEN_GENERATOR: "Oxygen Generator",
  STORAGE_DEPOT: "Storage Depot",
  LAUNCH_PAD: "Launch Pad",
};

// ---------------------------------------------------------------------------
// Colony Map Page
// ---------------------------------------------------------------------------

export default function ColonyMapPage() {
  const { data: colony, isLoading } = useColony();
  const selectedId = useGameStore((s) => s.selectedModuleId);
  const selectModule = useGameStore((s) => s.selectModule);
  const openModal = useUIStore((s) => s.openModal);
  const openContextMenu = useUIStore((s) => s.openContextMenu);
  const addToast = useUIStore((s) => s.addToast);
  const reposition = useRepositionModule();
  const upgrade = useUpgradeModule();
  const assignCrewMutation = useAssignCrew();
  const recruitCrew = useRecruitCrew();
  const toggleModule = useToggleModule();
  const repairModule = useRepairModule();
  const demolishModule = useDemolishModule();
  const dailyReward = useDailyReward();

  const [dragSource, setDragSource] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Build the grid: 5x4 = 20 cells
  const grid = useMemo(() => {
    const cells: (DashboardModule | null)[][] = Array.from(
      { length: GRID_ROWS },
      () => Array.from({ length: GRID_COLS }, () => null),
    );
    if (colony) {
      for (const m of colony.modules) {
        const { x, y } = m.coordinates;
        if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
          cells[y]![x] = m;
        }
      }
    }
    return cells;
  }, [colony]);

  const selectedModule = useMemo(
    () => colony?.modules.find((m) => m.id === selectedId) ?? null,
    [colony, selectedId],
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "Escape",
      handler: () => selectModule(null),
      description: "Deselect module",
    },
  ]);

  // Drag & drop handlers
  const handleDragStart = useCallback(
    (moduleId: string) => (e: React.DragEvent) => {
      setDragSource(moduleId);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  const handleDrop = useCallback(
    (x: number, y: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (dragSource) {
        reposition.mutate(
          { moduleId: dragSource, x, y },
          {
            onSuccess: () => {
              addToast({
                type: "success",
                title: "Module moved",
                icon: "📍",
              });
            },
          },
        );
        setDragSource(null);
      }
    },
    [dragSource, reposition, addToast],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // Build modal
  const handleBuildClick = useCallback(
    (x: number, y: number) => {
      openModal(
        <BuildModuleDialog
          x={x}
          y={y}
          balance={colony?.lunarBalance ?? 0}
          moduleCount={colony?.modules.length ?? 0}
          playerLevel={colony?.level ?? 1}
        />,
      );
    },
    [openModal, colony],
  );

  // Context menu items for a module
  const getModuleContextItems = useCallback(
    (module: DashboardModule) => [
      {
        label: "View Details",
        icon: "🔍",
        action: () => selectModule(module.id),
      },
      {
        label: module.isActive ? "Deactivate" : "Activate",
        icon: module.isActive ? "⏸️" : "▶️",
        action: async () => {
          try {
            const result = await toggleModule.mutateAsync(module.id);
            addToast({
              type: "success",
              title: result.isActive ? "Module activated" : "Module deactivated",
              icon: result.isActive ? "▶️" : "⏸️",
            });
          } catch (err) {
            addToast({
              type: "error",
              title: "Toggle failed",
              message: err instanceof Error ? err.message : "Unknown error",
              icon: "❌",
            });
          }
        },
      },
      {
        label: "Repair",
        icon: "🔧",
        action: async () => {
          try {
            const result = await repairModule.mutateAsync(module.id);
            addToast({
              type: "success",
              title: `Repaired for ${result.cost} $LUNAR`,
              icon: "🔧",
            });
          } catch (err) {
            addToast({
              type: "error",
              title: "Repair failed",
              message: err instanceof Error ? err.message : "Unknown error",
              icon: "❌",
            });
          }
        },
      },
      {
        label: "Demolish",
        icon: "🗑️",
        danger: true,
        action: async () => {
          try {
            const result = await demolishModule.mutateAsync(module.id);
            selectModule(null);
            addToast({
              type: "warning",
              title: `Demolished (+${result.refund} $LUNAR refund)`,
              icon: "🗑️",
            });
          } catch (err) {
            addToast({
              type: "error",
              title: "Demolish failed",
              message: err instanceof Error ? err.message : "Unknown error",
              icon: "❌",
            });
          }
        },
      },
    ],
    [selectModule, addToast, toggleModule, repairModule, demolishModule],
  );

  const handleModuleContext = useCallback(
    (module: DashboardModule) => (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, getModuleContextItems(module));
    },
    [openContextMenu, getModuleContextItems],
  );

  const handleModuleLongPress = useCallback(
    (module: DashboardModule, x: number, y: number) => {
      openContextMenu(x, y, getModuleContextItems(module));
    },
    [openContextMenu, getModuleContextItems],
  );

  if (isLoading) {
    return <ColonySkeleton />;
  }

  const hasNoModules = (colony?.modules.length ?? 0) === 0;

  return (
    <div className="relative flex min-h-full flex-col gap-4 lg:flex-row">
      {/* Grid */}
      <div className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">
            <span className="mr-2">🗺️</span>Your Colony
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const result = await dailyReward.mutateAsync();
                  addToast({
                    type: "success",
                    title: `+${result.reward} $LUNAR!`,
                    message: `Day ${result.streak} streak · +${result.xpGained} XP`,
                    icon: "🎁",
                  });
                } catch (err) {
                  addToast({
                    type: "info",
                    title:
                      err instanceof Error ? err.message : "Try again later",
                    icon: "🎁",
                  });
                }
              }}
              disabled={dailyReward.isPending}
              className="min-h-[44px] rounded-xl bg-amber-600/25 px-4 py-2.5 text-sm font-semibold text-amber-400 shadow-lg shadow-amber-900/20 transition hover:bg-amber-600/35 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {dailyReward.isPending ? "Claiming…" : "🎁 Daily Reward"}
            </button>
            <span className="text-sm text-slate-500">
              {colony?.modules.length ?? 0}/{MAX_MODULES} modules
            </span>
          </div>
        </div>

        {/* Empty state CTA */}
        {hasNoModules && (
          <div className="mb-6 rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 p-8 text-center">
            <p className="mb-4 text-lg font-medium text-slate-200">
              Build your first module to start earning $LUNAR!
            </p>
            <p className="mb-6 text-sm text-slate-500">
              Tap any empty slot below to open the build menu.
            </p>
            <span className="text-4xl" aria-hidden="true">
              🏗️
            </span>
          </div>
        )}

        <div
          data-tutorial="grid"
          className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-5"
        >
          {grid.map((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <ModuleCard
                  key={cell.id}
                  module={cell}
                  selected={cell.id === selectedId}
                  onClick={() => selectModule(cell.id)}
                  onContextMenu={handleModuleContext(cell)}
                  onLongPress={
                    isMobile
                      ? (x, y) => handleModuleLongPress(cell, x, y)
                      : undefined
                  }
                  draggable={!isMobile}
                  onDragStart={handleDragStart(cell.id)}
                />
              ) : (
                <EmptyGridCell
                  key={`empty-${x}-${y}`}
                  onDrop={handleDrop(x, y)}
                  onDragOver={handleDragOver}
                  onClick={() => handleBuildClick(x, y)}
                  highlight={!!dragSource}
                />
              ),
            ),
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            ≥80%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            50–79%
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            &lt;50%
          </span>
          <span className={`ml-auto text-slate-600 ${isMobile ? "inline" : "hidden sm:inline"}`}>
            {isMobile ? "Long-press module for options" : "Drag to reposition · Right-click for options"}
          </span>
        </div>

        {/* Crew Roster */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              👨‍🚀 Crew Roster
              <span className="ml-2 text-xs font-normal text-slate-500">
                {colony?.crew.length ?? 0}/5
              </span>
            </h2>
            <button
              onClick={async () => {
                try {
                  const result = await recruitCrew.mutateAsync();
                  addToast({
                    type: "success",
                    title: `Recruited ${result.crew?.name ?? "crew"}!`,
                    message: result.crew
                      ? `${result.crew.role} · +${result.crew.outputBonus}% output`
                      : undefined,
                    icon: "👨‍🚀",
                  });
                } catch (err) {
                  addToast({
                    type: "error",
                    title: "Recruit failed",
                    message:
                      err instanceof Error ? err.message : "Unknown error",
                    icon: "❌",
                  });
                }
              }}
              disabled={
                recruitCrew.isPending || (colony?.crew.length ?? 0) >= 5
              }
              className="rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {recruitCrew.isPending
                ? "Recruiting…"
                : (colony?.crew.length ?? 0) >= 5
                  ? "Crew Full"
                  : "💰 Recruit (200 $L)"}
            </button>
          </div>

          {(colony?.crew.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-600">
              No crew yet. Recruit your first member to boost module output!
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {colony?.crew.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2"
                >
                  <span className="text-lg">👨‍🚀</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-white">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {c.role} · Lv.{c.level}
                      {c.specialty &&
                        ` · ${c.specialty.replace(/_/g, " ").toLowerCase()}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-emerald-400">
                      +{c.outputBonus}% out
                    </div>
                    <div className="text-[10px] text-cyan-400">
                      +{c.efficiencyBonus}% eff
                    </div>
                  </div>
                  {c.assignedModuleId ? (
                    <span className="text-[9px] font-medium text-amber-400/70">
                      Assigned
                    </span>
                  ) : (
                    <span className="text-[9px] font-medium text-slate-600">
                      Idle
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedModule && (
          <motion.aside
            data-tutorial="detail-panel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 lg:w-80"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">
                {MODULE_ICONS[selectedModule.type] ?? "📦"}
              </span>
              <div>
                <h2 className="text-lg font-bold capitalize">
                  {selectedModule.type.replace(/_/g, " ").toLowerCase()}
                </h2>
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  {selectedModule.tier} · Lv.{selectedModule.level}
                </span>
              </div>
            </div>

            {/* Efficiency Gauge */}
            <div className="mb-4 flex justify-center">
              <EfficiencyGauge
                value={selectedModule.efficiency}
                size={96}
                label="Efficiency"
                strokeWidth={7}
              />
            </div>

            <div className="space-y-3">
              {/* Output fill meters */}
              <FillMeter
                value={selectedModule.baseOutput + selectedModule.bonusOutput}
                max={selectedModule.baseOutput * 2}
                color={
                  selectedModule.efficiency >= 80
                    ? "#10b981"
                    : selectedModule.efficiency >= 50
                      ? "#f59e0b"
                      : "#ef4444"
                }
                label="Output"
                icon="⚡"
                labelFormat="value"
                valueLabel={`${(selectedModule.baseOutput + selectedModule.bonusOutput).toFixed(1)}/tick`}
              />

              <DetailRow
                label="Base Output"
                value={`${selectedModule.baseOutput}/tick`}
              />
              <DetailRow
                label="Bonus"
                value={`+${selectedModule.bonusOutput}/tick`}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Status</span>
                <StatusDot
                  status={selectedModule.isActive ? "active" : "offline"}
                  label={selectedModule.isActive ? "Online" : "Offline"}
                />
              </div>
              <DetailRow
                label="Position"
                value={`(${selectedModule.coordinates.x}, ${selectedModule.coordinates.y})`}
              />

              {/* Crew assignment display */}
              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-800/30 p-3">
                <div className="text-xs font-medium text-slate-400">
                  👨‍🚀 Assigned Crew
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {colony?.crew.find(
                    (c) => c.assignedModuleId === selectedModule.id,
                  )?.name ?? "No crew assigned"}
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await upgrade.mutateAsync(selectedModule.id);
                      addToast({
                        type: "success",
                        title: `Upgraded to Lv.${selectedModule.level + 1}!`,
                        icon: "⬆️",
                      });
                    } catch (err) {
                      addToast({
                        type: "error",
                        title: "Upgrade failed",
                        message:
                          err instanceof Error ? err.message : "Unknown error",
                        icon: "❌",
                      });
                    }
                  }}
                  disabled={upgrade.isPending || selectedModule.level >= 10}
                  className="flex-1 rounded-lg bg-cyan-600/20 py-2 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {upgrade.isPending
                    ? "Upgrading…"
                    : selectedModule.level >= 10
                      ? "Max Level"
                      : "⬆️ Upgrade"}
                </button>
                <button
                  onClick={() => {
                    openModal(
                      <AssignCrewDialog
                        moduleId={selectedModule.id}
                        moduleName={
                          MODULE_LABELS[selectedModule.type] ??
                          selectedModule.type
                        }
                        crew={colony?.crew ?? []}
                        assignMutation={assignCrewMutation}
                      />,
                    );
                  }}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
                >
                  👨‍🚀 Assign
                </button>
              </div>
            </div>

            <button
              onClick={() => selectModule(null)}
              className="mt-4 w-full text-center text-xs text-slate-600 transition hover:text-slate-400"
            >
              Press Esc to close
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build Module Dialog
// ---------------------------------------------------------------------------

function BuildModuleDialog({
  x,
  y,
  balance,
  moduleCount,
  playerLevel,
}: {
  x: number;
  y: number;
  balance: number;
  moduleCount: number;
  playerLevel: number;
}) {
  const build = useBuildModule();
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const { data: bpData, isLoading: bpLoading } = useBlueprints(playerLevel);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const handleBuild = async (type: string, tier: string) => {
    try {
      await build.mutateAsync({ moduleType: type, tier });
      addToast({
        type: "success",
        title: `${MODULE_LABELS[type] ?? type} (${tier}) built!`,
        icon: MODULE_ICONS[type] ?? "🏗️",
      });
      closeModal();
    } catch (err) {
      addToast({
        type: "error",
        title: "Build failed",
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  // Group blueprints by module type
  const grouped = useMemo(() => {
    if (!bpData?.blueprints) return {};
    const map: Record<string, Blueprint[]> = {};
    for (const bp of bpData.blueprints) {
      if (!map[bp.type]) map[bp.type] = [];
      map[bp.type]!.push(bp);
    }
    return map;
  }, [bpData]);

  const TIER_COLORS: Record<string, string> = {
    COMMON: "text-slate-300 border-slate-600",
    UNCOMMON: "text-green-400 border-green-600",
    RARE: "text-blue-400 border-blue-500",
    EPIC: "text-purple-400 border-purple-500",
    LEGENDARY: "text-amber-400 border-amber-500",
  };

  // Fallback list when blueprints haven't loaded yet
  const moduleTypes =
    Object.keys(grouped).length > 0
      ? Object.keys(grouped)
      : GAME_CONSTANTS.MODULE_TYPES;

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <h2 className="mb-1 text-lg font-bold">Build Module</h2>
      <p className="mb-4 text-sm text-slate-400">
        Position ({x}, {y}) · Balance: {Math.floor(balance)} $LUNAR ·{" "}
        {moduleCount}/{MAX_MODULES} slots
      </p>

      {bpLoading && (
        <p className="mb-3 text-xs text-slate-500 animate-pulse">
          Loading blueprints…
        </p>
      )}

      <div className="space-y-2">
        {moduleTypes.map((type) => {
          const icon = MODULE_ICONS[type] ?? "📦";
          const label = MODULE_LABELS[type] ?? type;
          const tiers = grouped[type];
          const isExpanded = expandedType === type;

          return (
            <div key={type}>
              {/* Module type header — click to expand tiers */}
              <button
                onClick={() => setExpandedType(isExpanded ? null : type)}
                disabled={moduleCount >= MAX_MODULES}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition hover:border-cyan-500/40 hover:bg-slate-800 disabled:opacity-40"
              >
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    {label}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {tiers
                      ? `${tiers.filter((t) => t.unlocked).length}/${tiers.length} tiers unlocked`
                      : "COMMON"}
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded tier list */}
              {isExpanded && tiers && (
                <div className="ml-4 mt-1 space-y-1">
                  {tiers.map((bp) => {
                    const tierColor =
                      TIER_COLORS[bp.tier] ?? "text-slate-300 border-slate-600";
                    const canAfford = balance >= bp.baseCost;
                    const disabled =
                      build.isPending ||
                      !bp.unlocked ||
                      !canAfford ||
                      moduleCount >= MAX_MODULES;

                    return (
                      <button
                        key={bp.id}
                        onClick={() => handleBuild(bp.type, bp.tier)}
                        disabled={disabled}
                        className={`flex w-full items-center justify-between rounded border bg-slate-900/60 p-2 text-left text-xs transition hover:bg-slate-800 disabled:opacity-40 ${tierColor}`}
                      >
                        <div>
                          <span className="font-semibold">{bp.tier}</span>
                          {!bp.unlocked && (
                            <span className="ml-1 text-[10px] text-slate-500">
                              🔒 Lv{bp.unlockLevel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                          <span title="Base output">
                            ⚡ {bp.baseOutput}/cycle
                          </span>
                          <span title="Build cost">
                            💰 {Math.floor(bp.baseCost)}
                          </span>
                          <span title="Max level">📈 Lv{bp.maxLevel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fallback if no blueprint data yet */}
              {isExpanded && !tiers && (
                <div className="ml-4 mt-1">
                  <button
                    onClick={() => handleBuild(type, "COMMON")}
                    disabled={build.isPending || moduleCount >= MAX_MODULES}
                    className="w-full rounded border border-slate-600 bg-slate-900/60 p-2 text-left text-xs text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    COMMON (default)
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign Crew Dialog
// ---------------------------------------------------------------------------

function AssignCrewDialog({
  moduleId,
  moduleName,
  crew,
  assignMutation,
}: {
  moduleId: string;
  moduleName: string;
  crew: DashboardCrew[];
  assignMutation: ReturnType<typeof useAssignCrew>;
}) {
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const available = crew.filter(
    (c) =>
      c.isActive && (!c.assignedModuleId || c.assignedModuleId === moduleId),
  );
  const currentlyAssigned = crew.find((c) => c.assignedModuleId === moduleId);

  const handleAssign = async (crewId: string) => {
    try {
      await assignMutation.mutateAsync({ crewId, moduleId });
      addToast({
        type: "success",
        title: "Crew assigned!",
        icon: "👨‍🚀",
      });
      closeModal();
    } catch (err) {
      addToast({
        type: "error",
        title: "Assignment failed",
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  const handleUnassign = async (crewId: string) => {
    try {
      await assignMutation.mutateAsync({ crewId, moduleId: null });
      addToast({
        type: "success",
        title: "Crew unassigned",
        icon: "👨‍🚀",
      });
      closeModal();
    } catch (err) {
      addToast({
        type: "error",
        title: "Unassign failed",
        message: err instanceof Error ? err.message : "Unknown error",
        icon: "❌",
      });
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Assign Crew</h2>
      <p className="mb-4 text-sm text-slate-400">
        {moduleName}
        {currentlyAssigned && (
          <span className="ml-2 text-cyan-400">
            — Currently: {currentlyAssigned.name}
          </span>
        )}
      </p>

      {available.length === 0 ? (
        <p className="text-sm text-slate-500">
          No available crew members. Use the Recruit button on the colony map to
          hire crew first.
        </p>
      ) : (
        <div className="space-y-2">
          {available.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                c.assignedModuleId === moduleId
                  ? handleUnassign(c.id)
                  : handleAssign(c.id)
              }
              disabled={assignMutation.isPending}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition hover:border-cyan-500/40 hover:bg-slate-800 disabled:opacity-40"
            >
              <span className="text-xl">👨‍🚀</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">{c.name}</div>
                <div className="text-[10px] text-slate-500">
                  {c.role} · Lv.{c.level}
                  {c.specialty &&
                    ` · ${c.specialty.replace(/_/g, " ").toLowerCase()}`}
                </div>
              </div>
              {c.assignedModuleId === moduleId ? (
                <span className="text-xs font-medium text-amber-400">
                  Unassign
                </span>
              ) : (
                <span className="text-xs font-medium text-cyan-400">
                  Assign
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
