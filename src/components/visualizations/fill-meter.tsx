"use client";

/**
 * FillMeter — Animated fill bars for resource levels.
 *
 * Use cases:
 * - Resource amounts relative to capacity
 * - Storage utilization
 * - Progress toward goals
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FillMeterProps {
  /** Current value */
  value: number;
  /** Maximum value */
  max: number;
  /** Bar color */
  color?: string;
  /** Show percentage label */
  showLabel?: boolean;
  /** Label format: "percent" | "fraction" | "value" */
  labelFormat?: "percent" | "fraction" | "value";
  /** Left label (resource name) */
  label?: string;
  /** Right label (value text override) */
  valueLabel?: string;
  /** Icon/emoji to show before label */
  icon?: string;
  /** Height of the bar in px */
  height?: number;
  /** Animate fill on mount */
  animate?: boolean;
  /** Show glow when fill > threshold */
  glowThreshold?: number;
  /** Show pulsing when nearly full (> 90%) */
  pulseWhenFull?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const RESOURCE_COLORS: Record<string, string> = {
  LUNAR: "#facc15",
  REGOLITH: "#f97316",
  WATER_ICE: "#3b82f6",
  HELIUM3: "#a855f7",
  RARE_EARTH: "#ef4444",
};

export function resourceColor(type: string): string {
  return RESOURCE_COLORS[type] ?? "#64748b";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FillMeter({
  value,
  max,
  color = "#10b981",
  showLabel = true,
  labelFormat = "percent",
  label,
  valueLabel,
  icon,
  height = 8,
  animate = true,
  glowThreshold = 0.8,
  pulseWhenFull = true,
  className = "",
}: FillMeterProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const isFull = pct > 0.9;
  const isGlowing = pct >= glowThreshold;

  const displayValue = useMemo(() => {
    if (valueLabel) return valueLabel;
    switch (labelFormat) {
      case "fraction":
        return `${value.toLocaleString()} / ${max.toLocaleString()}`;
      case "value":
        return value.toLocaleString();
      case "percent":
      default:
        return `${Math.round(pct * 100)}%`;
    }
  }, [value, max, pct, labelFormat, valueLabel]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Labels row */}
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-slate-300">
            {icon && <span>{icon}</span>}
            {label && <span>{label}</span>}
          </span>
          <span className="font-mono text-slate-400">{displayValue}</span>
        </div>
      )}

      {/* Bar */}
      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{
          height,
          background: "rgba(255,255,255,0.06)",
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ? `${label}: ${displayValue}` : displayValue}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: color,
            boxShadow: isGlowing ? `0 0 8px ${color}40` : "none",
          }}
          initial={shouldAnimate ? { width: "0%" } : undefined}
          animate={{
            width: `${pct * 100}%`,
            opacity: isFull && pulseWhenFull ? [1, 0.7, 1] : 1,
          }}
          transition={
            isFull && pulseWhenFull && !reducedMotion
              ? {
                  width: { duration: 0.6, ease: "easeOut" },
                  opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }
              : { duration: 0.6, ease: "easeOut" }
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ResourceFillMeter — Pre-styled for specific resource types
// ---------------------------------------------------------------------------

export function ResourceFillMeter({
  type,
  amount,
  capacity,
  className = "",
}: {
  type: string;
  amount: number;
  capacity: number;
  className?: string;
}) {
  const ICONS: Record<string, string> = {
    LUNAR: "💰",
    REGOLITH: "🪨",
    WATER_ICE: "🧊",
    HELIUM3: "⚛️",
    RARE_EARTH: "💎",
  };

  return (
    <FillMeter
      value={amount}
      max={capacity}
      color={resourceColor(type)}
      icon={ICONS[type]}
      label={type.replace("_", " ")}
      labelFormat="fraction"
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// StackedFillMeter — Multiple values in one bar
// ---------------------------------------------------------------------------

export interface StackedSegment {
  value: number;
  color: string;
  label: string;
}

export function StackedFillMeter({
  segments,
  max,
  height = 8,
  animate = true,
  showLegend = false,
  className = "",
}: {
  segments: StackedSegment[];
  max: number;
  height?: number;
  animate?: boolean;
  showLegend?: boolean;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        className="relative flex w-full overflow-hidden rounded-full"
        style={{ height, background: "rgba(255,255,255,0.06)" }}
        role="progressbar"
        aria-valuenow={total}
        aria-valuemax={max}
        aria-label="Stacked resource meter"
      >
        {segments.map((seg) => {
          const pct = max > 0 ? (seg.value / max) * 100 : 0;
          return (
            <motion.div
              key={seg.label}
              className="h-full"
              style={{ background: seg.color }}
              initial={shouldAnimate ? { width: "0%" } : undefined}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {segments.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: seg.color }}
              />
              <span className="text-slate-400">{seg.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
