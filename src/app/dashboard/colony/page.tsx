"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useColony,
  useRepositionModule,
  useBuildModule,
  useUpgradeModule,
  useAssignCrew,
  useRecruitCrew,
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

  const [dragSource, setDragSource] = useState<string | null>(null);

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
        />,
      );
    },
    [openModal, colony],
  );

  // Context menu
  const handleModuleContext = useCallback(
    (module: DashboardModule) => (e: React.MouseEvent) => {
      e.preventDefault();
      openContextMenu(e.clientX, e.clientY, [
        {
          label: "View Details",
          icon: "🔍",
          action: () => selectModule(module.id),
        },
        {
          label: module.isActive ? "Deactivate" : "Activate",
          icon: module.isActive ? "⏸️" : "▶️",
          action: () =>
            addToast({
              type: "info",
              title: `Toggle ${module.isActive ? "off" : "on"} coming soon`,
              icon: "🔧",
            }),
        },
        {
          label: "Repair",
          icon: "🔧",
          action: () =>
            addToast({
              type: "info",
              title: "Repair coming soon",
              icon: "🔧",
            }),
        },
        {
          label: "Demolish",
          icon: "🗑️",
          danger: true,
          action: () =>
            addToast({
              type: "warning",
              title: "Demolish coming soon",
              icon: "⚠️",
            }),
        },
      ]);
    },
    [openContextMenu, selectModule, addToast],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading colony map…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4 lg:flex-row">
      {/* Grid */}
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="mr-2">🗺️</span>Colony Map
          </h1>
          <span className="text-sm text-slate-500">
            {colony?.modules.length ?? 0}/{MAX_MODULES} modules
          </span>
        </div>

        <div
          data-tutorial="grid"
          className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5"
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
                  draggable
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
          <span className="ml-auto text-slate-600 hidden sm:inline">
            Drag to reposition · Right-click for options
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
}: {
  x: number;
  y: number;
  balance: number;
  moduleCount: number;
}) {
  const build = useBuildModule();
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const buildableTypes = GAME_CONSTANTS.MODULE_TYPES;

  const handleBuild = async (type: string) => {
    try {
      await build.mutateAsync(type);
      addToast({
        type: "success",
        title: `${MODULE_LABELS[type] ?? type} built!`,
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

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Build Module</h2>
      <p className="mb-4 text-sm text-slate-400">
        Position ({x}, {y}) · Balance: {Math.floor(balance)} $LUNAR ·{" "}
        {moduleCount}/{MAX_MODULES} slots
      </p>

      <div className="grid grid-cols-2 gap-2">
        {buildableTypes.map((type) => {
          const icon = MODULE_ICONS[type] ?? "📦";
          const label = MODULE_LABELS[type] ?? type;
          return (
            <button
              key={type}
              onClick={() => handleBuild(type)}
              disabled={build.isPending || moduleCount >= MAX_MODULES}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition hover:border-cyan-500/40 hover:bg-slate-800 disabled:opacity-40"
            >
              <span className="text-xl">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-[10px] text-slate-500">COMMON</div>
              </div>
            </button>
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
