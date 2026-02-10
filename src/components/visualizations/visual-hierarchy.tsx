"use client";

/**
 * Visual hierarchy utilities — importance-based component wrappers
 * that apply appropriate sizing, colors, animations, and attention levels.
 *
 * Use these to ensure consistent visual weight across the dashboard based
 * on the urgency/importance of the information.
 */

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

// ---------------------------------------------------------------------------
// Importance level system
// ---------------------------------------------------------------------------

export type ImportanceLevel =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "ambient";

interface ImportanceConfig {
  /** Container styles */
  container: string;
  /** Text scale class */
  textScale: string;
  /** Border style */
  border: string;
  /** Glow/shadow */
  glow: string;
  /** Animation variants */
  variants: Variants;
}

const IMPORTANCE_MAP: Record<ImportanceLevel, ImportanceConfig> = {
  critical: {
    container: "bg-red-500/10 backdrop-blur-sm",
    textScale: "text-base font-bold",
    border: "border border-red-500/40",
    glow: "shadow-lg shadow-red-500/10",
    variants: {
      initial: { scale: 0.95, opacity: 0 },
      animate: {
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" },
      },
    },
  },
  high: {
    container: "bg-amber-500/8",
    textScale: "text-sm font-semibold",
    border: "border border-amber-500/25",
    glow: "shadow-md shadow-amber-500/5",
    variants: {
      initial: { y: 8, opacity: 0 },
      animate: {
        y: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: "easeOut" },
      },
    },
  },
  medium: {
    container: "bg-slate-800/50",
    textScale: "text-sm font-medium",
    border: "border border-slate-700/50",
    glow: "",
    variants: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: 0.2 },
      },
    },
  },
  low: {
    container: "bg-slate-800/30",
    textScale: "text-xs font-normal",
    border: "border border-slate-700/30",
    glow: "",
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.15 } },
    },
  },
  ambient: {
    container: "bg-transparent",
    textScale: "text-xs font-light text-slate-500",
    border: "",
    glow: "",
    variants: {
      initial: { opacity: 0 },
      animate: { opacity: 0.7, transition: { duration: 0.2 } },
    },
  },
};

// ---------------------------------------------------------------------------
// ImportanceContainer — wrapper applying visual hierarchy
// ---------------------------------------------------------------------------

export interface ImportanceContainerProps {
  level: ImportanceLevel;
  children: React.ReactNode;
  /** Suppress animation */
  noAnimation?: boolean;
  /** Additional class */
  className?: string;
  /** Whether to render as a card (rounded + padding) or inline */
  variant?: "card" | "inline" | "banner";
  /** Click handler */
  onClick?: () => void;
}

export function ImportanceContainer({
  level,
  children,
  noAnimation = false,
  className = "",
  variant = "card",
  onClick,
}: ImportanceContainerProps) {
  const reducedMotion = useReducedMotion();
  const config = IMPORTANCE_MAP[level];

  const variantStyles = {
    card: "rounded-lg p-3",
    inline: "rounded px-2 py-1",
    banner: "rounded-lg px-4 py-2",
  };

  const combinedClass = [
    config.container,
    config.textScale,
    config.border,
    config.glow,
    variantStyles[variant],
    onClick ? "cursor-pointer hover:brightness-110 transition-all" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (noAnimation || reducedMotion) {
    return (
      <div className={combinedClass} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={combinedClass}
      variants={config.variants}
      initial="initial"
      animate="animate"
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StatCard — standardized stat display with visual hierarchy
// ---------------------------------------------------------------------------

export interface StatCardProps {
  /** Stat title */
  title: string;
  /** Main value */
  value: string | number;
  /** Optional subtitle / secondary value */
  subtitle?: string;
  /** Optional icon */
  icon?: string;
  /** Importance level determines visual weight */
  importance?: ImportanceLevel;
  /** Accent color for the value */
  accentColor?: string;
  /** Trend indicator */
  trend?: { direction: number; value?: number };
  /** Optional right-side content */
  trailing?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  importance = "medium",
  accentColor,
  trend,
  trailing,
  className = "",
  onClick,
}: StatCardProps) {
  return (
    <ImportanceContainer
      level={importance}
      className={`flex items-center gap-3 ${className}`}
      onClick={onClick}
    >
      {icon && <span className="text-xl">{icon}</span>}

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-slate-400">{title}</div>
        <div
          className="font-mono text-lg font-bold text-white"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {value}
        </div>
        {subtitle && (
          <div className="truncate text-xs text-slate-500">{subtitle}</div>
        )}
      </div>

      {trend && (
        <span
          className={`text-xs font-mono ${trend.direction > 0 ? "text-emerald-400" : trend.direction < 0 ? "text-red-400" : "text-slate-500"}`}
        >
          {trend.direction > 0 ? "↑" : trend.direction < 0 ? "↓" : "→"}
          {trend.value !== undefined && ` ${Math.abs(trend.value).toFixed(1)}%`}
        </span>
      )}

      {trailing}
    </ImportanceContainer>
  );
}

// ---------------------------------------------------------------------------
// DataSection — grouped section with title and importance-based styling
// ---------------------------------------------------------------------------

export interface DataSectionProps {
  title: string;
  importance?: ImportanceLevel;
  children: React.ReactNode;
  /** Optional action button in header */
  action?: React.ReactNode;
  className?: string;
}

export function DataSection({
  title,
  importance = "medium",
  children,
  action,
  className = "",
}: DataSectionProps) {
  const config = IMPORTANCE_MAP[importance];

  return (
    <section className={`${className}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`${config.textScale} text-slate-200`}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
