"use client";

/**
 * Status indicator components for game state communication.
 *
 * - MoraleIndicator   — emoji scale for crew morale (😴→😊→🎉)
 * - SeverityBadge     — importance-based badge with color coding
 * - StatusDot         — animated status dot (active, warning, critical, idle)
 * - TrendArrow        — directional trend indicator with color
 * - AlertPulse        — pulsing attention indicator for critical states
 */

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// MoraleIndicator
// ---------------------------------------------------------------------------

const MORALE_SCALE = [
  { min: 0, emoji: "😴", label: "Exhausted", color: "#ef4444" },
  { min: 20, emoji: "😟", label: "Low", color: "#f97316" },
  { min: 40, emoji: "😐", label: "Neutral", color: "#eab308" },
  { min: 60, emoji: "🙂", label: "Content", color: "#22c55e" },
  { min: 80, emoji: "😊", label: "Happy", color: "#10b981" },
  { min: 95, emoji: "🎉", label: "Ecstatic", color: "#06b6d4" },
];

function getMorale(value: number) {
  let result = MORALE_SCALE[0]!;
  for (const level of MORALE_SCALE) {
    if (value >= level.min) result = level;
  }
  return result;
}

export interface MoraleIndicatorProps {
  /** Morale value 0–100 */
  value: number;
  /** Show text label */
  showLabel?: boolean;
  /** Size: "sm" | "md" | "lg" */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MoraleIndicator({
  value,
  showLabel = false,
  size = "md",
  className = "",
}: MoraleIndicatorProps) {
  const morale = getMorale(Math.max(0, Math.min(100, value)));
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={`Morale: ${morale.label} (${value}%)`}
    >
      <span className={sizeClasses[size]}>{morale.emoji}</span>
      {showLabel && (
        <span className="text-xs" style={{ color: morale.color }}>
          {morale.label}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusDot — animated colored dot
// ---------------------------------------------------------------------------

export type StatusLevel =
  | "active"
  | "warning"
  | "critical"
  | "idle"
  | "offline";

const STATUS_COLORS: Record<StatusLevel, string> = {
  active: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
  idle: "#64748b",
  offline: "#374151",
};

export interface StatusDotProps {
  status: StatusLevel;
  /** Size in px */
  size?: number;
  /** Show pulse ring for active/critical */
  pulse?: boolean;
  /** Show label text */
  label?: string;
  className?: string;
}

export function StatusDot({
  status,
  size = 8,
  pulse = true,
  label,
  className = "",
}: StatusDotProps) {
  const reducedMotion = useReducedMotion();
  const color = STATUS_COLORS[status];
  const shouldPulse =
    pulse && !reducedMotion && (status === "active" || status === "critical");

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={label ?? `Status: ${status}`}
    >
      <span
        className="relative inline-flex"
        style={{ width: size, height: size }}
      >
        {/* Pulse ring */}
        {shouldPulse && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: color }}
            animate={{ scale: [1, 2], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* Dot */}
        <span
          className="relative inline-block h-full w-full rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 4px ${color}60`,
          }}
        />
      </span>
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SeverityBadge — importance-based badge
// ---------------------------------------------------------------------------

export type Severity = "critical" | "warning" | "info" | "success" | "neutral";

const SEVERITY_STYLES: Record<
  Severity,
  { bg: string; text: string; border: string; icon: string }
> = {
  critical: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: "⚠️",
  },
  warning: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
    icon: "⚡",
  },
  info: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
    icon: "ℹ️",
  },
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: "✅",
  },
  neutral: {
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    border: "border-slate-500/30",
    icon: "•",
  },
};

export interface SeverityBadgeProps {
  severity: Severity;
  children: React.ReactNode;
  /** Show icon */
  showIcon?: boolean;
  /** Animate entry */
  animate?: boolean;
  className?: string;
}

export function SeverityBadge({
  severity,
  children,
  showIcon = true,
  animate = true,
  className = "",
}: SeverityBadgeProps) {
  const reducedMotion = useReducedMotion();
  const style = SEVERITY_STYLES[severity];

  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {showIcon && <span className="text-[0.7em]">{style.icon}</span>}
      {children}
    </span>
  );

  if (animate && !reducedMotion) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {badge}
      </motion.span>
    );
  }

  return badge;
}

// ---------------------------------------------------------------------------
// TrendArrow — directional trend indicator
// ---------------------------------------------------------------------------

export interface TrendArrowProps {
  /** Positive = up, negative = down, 0 = flat */
  direction: number;
  /** Show percentage change */
  value?: number;
  /** Size */
  size?: "sm" | "md";
  className?: string;
}

export function TrendArrow({
  direction,
  value,
  size = "sm",
  className = "",
}: TrendArrowProps) {
  const isUp = direction > 0;
  const isDown = direction < 0;
  const color = isUp
    ? "text-emerald-400"
    : isDown
      ? "text-red-400"
      : "text-slate-500";
  const arrow = isUp ? "↑" : isDown ? "↓" : "→";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono ${textSize} ${color} ${className}`}
    >
      <span>{arrow}</span>
      {value !== undefined && <span>{Math.abs(value).toFixed(1)}%</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// AlertPulse — pulsing border/glow for critical states
// ---------------------------------------------------------------------------

export interface AlertPulseProps {
  /** Whether the alert is active */
  active: boolean;
  /** Pulse color */
  color?: string;
  /** Children to wrap */
  children: React.ReactNode;
  className?: string;
}

export function AlertPulse({
  active,
  color = "#ef4444",
  children,
  className = "",
}: AlertPulseProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence>
        {active && !reducedMotion && (
          <motion.div
            className="pointer-events-none absolute -inset-px rounded-lg"
            style={{
              boxShadow: `0 0 12px ${color}40, inset 0 0 12px ${color}10`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
