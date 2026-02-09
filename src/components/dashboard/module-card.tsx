"use client";

import { type DashboardModule } from "@/stores/game-store";
import { motion } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";

// ---------------------------------------------------------------------------
// Module visual constants
// ---------------------------------------------------------------------------

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

const TIER_COLORS: Record<string, string> = {
  COMMON: "border-slate-600",
  UNCOMMON: "border-green-500",
  RARE: "border-blue-500",
  EPIC: "border-purple-500",
  LEGENDARY: "border-amber-400",
};

const TIER_GLOW: Record<string, string> = {
  COMMON: "",
  UNCOMMON: "shadow-green-500/10",
  RARE: "shadow-blue-500/10",
  EPIC: "shadow-purple-500/20",
  LEGENDARY: "shadow-amber-400/30",
};

function effColor(eff: number): string {
  if (eff >= 80) return "bg-emerald-400";
  if (eff >= 50) return "bg-amber-400";
  return "bg-red-400";
}

function effLabel(eff: number): string {
  if (eff >= 80) return "Good";
  if (eff >= 50) return "Fair";
  return "Low";
}

// ---------------------------------------------------------------------------
// Module Card
// ---------------------------------------------------------------------------

interface ModuleCardProps {
  module: DashboardModule;
  selected?: boolean;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function ModuleCard({
  module,
  selected,
  onClick,
  onContextMenu,
  draggable,
  onDragStart,
}: ModuleCardProps) {
  const fb = useFeedback();
  const icon = MODULE_ICONS[module.type] ?? "📦";
  const label =
    MODULE_LABELS[module.type] ?? module.type.replace(/_/g, " ").toLowerCase();
  const tierBorder = TIER_COLORS[module.tier] ?? "border-slate-600";
  const tierGlow = TIER_GLOW[module.tier] ?? "";

  const a11yLabel = `${label}, ${module.tier.toLowerCase()} tier, level ${module.level}, ${module.efficiency}% efficiency${module.isActive ? "" : ", inactive"}`;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fb.click();
      onClick?.();
    }
  }

  return (
    <div draggable={draggable} onDragStart={onDragStart}>
      <motion.div
        layout
        layoutId={`module-${module.id}`}
        role="button"
        tabIndex={0}
        aria-label={a11yLabel}
        aria-pressed={selected}
        aria-disabled={!module.isActive}
        onClick={() => {
          fb.click();
          onClick?.();
        }}
        onKeyDown={handleKeyDown}
        onContextMenu={onContextMenu}
        onPointerEnter={() => fb.hover()}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-2 transition-all
          focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
          ${tierBorder} ${tierGlow}
          ${selected ? "bg-cyan-500/10 ring-2 ring-cyan-500/40" : "bg-slate-900/50 hover:bg-slate-800/50"}
          ${!module.isActive ? "opacity-40" : ""}
          ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ minWidth: 72, minHeight: 72 }}
      >
        {/* Icon */}
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>

        {/* Name */}
        <span className="mt-1 text-[10px] font-medium capitalize text-slate-300 leading-tight text-center">
          {module.type.replace(/_/g, " ").toLowerCase()}
        </span>

        {/* Tier badge */}
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-500">
          {module.tier}
        </span>

        {/* Efficiency indicator dot */}
        <div
          className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-slate-900 ${effColor(module.efficiency)}`}
          role="img"
          aria-label={`${module.efficiency}% efficiency (${effLabel(module.efficiency)})`}
        />

        {/* Level badge */}
        <div
          className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-slate-300"
          aria-label={`Level ${module.level}`}
        >
          {module.level}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty Grid Cell
// ---------------------------------------------------------------------------

interface EmptyCellProps {
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onClick?: () => void;
  highlight?: boolean;
}

export function EmptyGridCell({
  onDrop,
  onDragOver,
  onClick,
  highlight,
}: EmptyCellProps) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Empty slot — click to build a new module"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`flex items-center justify-center rounded-xl border-2 border-dashed transition-all
        focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${highlight ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/30"}
        cursor-pointer`}
      style={{ minWidth: 72, minHeight: 72 }}
    >
      <span className="text-lg text-slate-700" aria-hidden="true">
        +
      </span>
    </div>
  );
}
