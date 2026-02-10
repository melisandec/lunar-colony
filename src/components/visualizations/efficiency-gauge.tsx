"use client";

/**
 * EfficiencyGauge — SVG arc gauge showing module/colony efficiency.
 *
 * Color gradient: red (0%) → amber (50%) → emerald (100%)
 * Matches the 3-tier color system already used in module-card.tsx.
 */

import { useMemo, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EfficiencyGaugeProps {
  /** Efficiency value 0–100 */
  value: number;
  /** Gauge diameter */
  size?: number;
  /** Show percentage label inside */
  showLabel?: boolean;
  /** Optional label below value */
  label?: string;
  /** Arc sweep angle in degrees (default 240°) */
  sweep?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Animate on mount */
  animate?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function efficiencyColor(value: number): string {
  if (value >= 80) return "#10b981"; // emerald-500
  if (value >= 50) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

function efficiencyGlow(value: number): string {
  if (value >= 80) return "rgba(16,185,129,0.3)";
  if (value >= 50) return "rgba(245,158,11,0.3)";
  return "rgba(239,68,68,0.3)";
}

// ---------------------------------------------------------------------------
// SVG arc math
// ---------------------------------------------------------------------------

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToXY(cx, cy, r, endAngle);
  const end = polarToXY(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EfficiencyGauge({
  value,
  size = 80,
  showLabel = true,
  label,
  sweep = 240,
  strokeWidth = 6,
  animate = true,
  className = "",
}: EfficiencyGaugeProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const clamped = Math.max(0, Math.min(100, value));

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth * 2) / 2;

  const startAngle = (360 - sweep) / 2 + 90; // bottom-center start
  const endAngle = startAngle + sweep;

  // Background arc
  const bgArc = useMemo(
    () => arcPath(cx, cy, r, startAngle, endAngle),
    [cx, cy, r, startAngle, endAngle],
  );

  // Value arc
  const valueAngle = startAngle + (clamped / 100) * sweep;
  const valueArc = useMemo(
    () => (clamped > 0 ? arcPath(cx, cy, r, startAngle, valueAngle) : ""),
    [cx, cy, r, startAngle, valueAngle, clamped],
  );

  const color = efficiencyColor(clamped);
  const glow = efficiencyGlow(clamped);

  const stableId = useId();
  const filterId = `eff-glow-${stableId}`;

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={`Efficiency ${clamped}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Glow filter */}
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={bgArc}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.1}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        {valueArc && (
          <motion.path
            d={valueArc}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            initial={shouldAnimate ? { pathLength: 0 } : undefined}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 4px ${glow})` }}
          />
        )}

        {/* Center value */}
        {showLabel && (
          <text
            x={cx}
            y={label ? cy - 2 : cy + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white font-mono font-bold"
            style={{ fontSize: size * 0.22 }}
          >
            {Math.round(clamped)}%
          </text>
        )}

        {showLabel && label && (
          <text
            x={cx}
            y={cy + size * 0.15}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400"
            style={{ fontSize: size * 0.11 }}
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant for tight spaces (module cards, table rows)
// ---------------------------------------------------------------------------

export function MiniGauge({
  value,
  size = 32,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <EfficiencyGauge
      value={value}
      size={size}
      showLabel={false}
      strokeWidth={3}
      animate={false}
      className={className}
    />
  );
}
