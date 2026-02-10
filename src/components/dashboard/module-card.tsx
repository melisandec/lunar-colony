"use client";

import { type DashboardModule } from "@/stores/game-store";
import { motion } from "framer-motion";
import { useFeedback } from "@/hooks/use-feedback";
import { useIsMobile } from "@/hooks/use-device";
import { useAdaptiveAnimation } from "@/components/mobile";
import Image from "next/image";

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

/** Pixel-art images for modules that have them (64×64) */
const MODULE_IMAGES: Record<string, string> = {
  SOLAR_PANEL: "/modules/solar-panel.png",
  MINING_RIG: "/modules/mining-rig.png",
  HABITAT: "/modules/habitat.png",
  RESEARCH_LAB: "/modules/research-lab.png",
  LAUNCH_PAD: "/modules/launch-pad.png",
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
  COMMON: "border-slate-700/80",
  UNCOMMON: "border-green-500/60",
  RARE: "border-blue-500/60",
  EPIC: "border-purple-500/60",
  LEGENDARY: "border-amber-400/60",
};

const TIER_GLOW: Record<string, string> = {
  COMMON: "",
  UNCOMMON: "shadow-md shadow-green-500/10",
  RARE: "shadow-md shadow-blue-500/15",
  EPIC: "shadow-md shadow-purple-500/20",
  LEGENDARY: "shadow-lg shadow-amber-400/30",
};

const TIER_TEXT_COLOR: Record<string, string> = {
  COMMON: "text-slate-500",
  UNCOMMON: "text-green-400/80",
  RARE: "text-blue-400/80",
  EPIC: "text-purple-400/80",
  LEGENDARY: "text-amber-400/80",
};

/** Subtle background tint per module type */
const MODULE_BG: Record<string, string> = {
  SOLAR_PANEL: "from-amber-500/8 to-transparent",
  MINING_RIG: "from-stone-500/8 to-transparent",
  HABITAT: "from-emerald-500/8 to-transparent",
  RESEARCH_LAB: "from-blue-500/8 to-transparent",
  WATER_EXTRACTOR: "from-cyan-500/8 to-transparent",
  OXYGEN_GENERATOR: "from-rose-500/8 to-transparent",
  STORAGE_DEPOT: "from-orange-500/8 to-transparent",
  LAUNCH_PAD: "from-violet-500/8 to-transparent",
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
  const isMobile = useIsMobile();
  const { shouldAnimate, spring } = useAdaptiveAnimation();
  const icon = MODULE_ICONS[module.type] ?? "📦";
  const pixelArt = MODULE_IMAGES[module.type];
  const label =
    MODULE_LABELS[module.type] ?? module.type.replace(/_/g, " ").toLowerCase();
  const tierBorder = TIER_COLORS[module.tier] ?? "border-slate-700/80";
  const tierGlow = TIER_GLOW[module.tier] ?? "";
  const tierText = TIER_TEXT_COLOR[module.tier] ?? "text-slate-500";
  const typeBg = MODULE_BG[module.type] ?? "from-slate-500/5 to-transparent";

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
        layout={shouldAnimate}
        layoutId={shouldAnimate ? `module-${module.id}` : undefined}
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
        onPointerEnter={() => !isMobile && fb.hover()}
        whileHover={shouldAnimate ? { scale: 1.04 } : undefined}
        whileTap={shouldAnimate ? { scale: 0.96 } : undefined}
        transition={spring}
        className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border bg-gradient-to-b transition-all
          focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
          ${tierBorder} ${tierGlow} ${typeBg}
          ${selected ? "border-cyan-400/60 bg-cyan-500/10 ring-1 ring-cyan-400/30" : "hover:border-slate-600 hover:bg-slate-800/40"}
          ${!module.isActive ? "opacity-40 grayscale-[40%]" : ""}
          ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        {/* Icon — pixel art when available, emoji fallback */}
        {pixelArt ? (
          <Image
            src={pixelArt}
            alt={label}
            width={40}
            height={40}
            className="sm:h-8 sm:w-8"
            draggable={false}
            aria-hidden="true"
          />
        ) : (
          <span className="text-3xl sm:text-2xl" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Name */}
        <span className="mt-1.5 text-center text-[11px] font-medium leading-tight text-slate-200 sm:text-[10px]">
          {label}
        </span>

        {/* Tier badge */}
        <span
          className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${tierText}`}
        >
          {module.tier}
        </span>

        {/* Efficiency indicator — ring style */}
        <div
          className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-950 ${effColor(module.efficiency)}`}
          role="img"
          aria-label={`${module.efficiency}% efficiency (${effLabel(module.efficiency)})`}
        />

        {/* Level badge — pill style */}
        <div
          className="absolute -left-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-slate-800 px-1 text-[9px] font-bold tabular-nums text-slate-300 ring-1 ring-slate-700/60"
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
      className={`group flex aspect-square items-center justify-center rounded-2xl border border-dashed transition-all
        focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${highlight ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800/60 hover:border-slate-600 hover:bg-slate-900/40"}
        cursor-pointer`}
    >
      <span
        className={`text-base transition-all ${highlight ? "text-cyan-500/60 scale-110" : "text-slate-700 group-hover:text-slate-500 group-hover:scale-110"}`}
        aria-hidden="true"
      >
        +
      </span>
    </div>
  );
}
