"use client";

/**
 * DonutChart — SVG donut/pie chart for resource distribution visualization.
 *
 * Use cases:
 * - Resource type distribution in colony overview
 * - Module type breakdown
 * - Market portfolio allocation
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  /** Outer diameter */
  size?: number;
  /** Ring thickness (0–1 of radius) */
  thickness?: number;
  /** Center label text */
  centerLabel?: string;
  /** Center value text */
  centerValue?: string;
  /** Animate on mount */
  animate?: boolean;
  /** CSS class */
  className?: string;
  /** Show legend below */
  showLegend?: boolean;
  /** Accessible label */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DonutChart({
  segments,
  size = 120,
  thickness = 0.3,
  centerLabel,
  centerValue,
  animate = true,
  className = "",
  showLegend = false,
  ariaLabel,
}: DonutChartProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  const total = useMemo(
    () => segments.reduce((s, seg) => s + seg.value, 0),
    [segments],
  );

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * (1 - thickness);
  const midR = (outerR + innerR) / 2;
  const arcWidth = outerR - innerR;

  const arcs = useMemo(() => {
    const result: Array<
      DonutSegment & { startAngle: number; endAngle: number; angle: number }
    > = [];
    let offset = 0;
    for (const seg of segments) {
      const angle = total > 0 ? (seg.value / total) * 360 : 0;
      const startAngle = offset;
      const endAngle = offset + Math.max(angle - 1, 0);
      result.push({ ...seg, startAngle, endAngle, angle });
      offset += angle;
    }
    return result;
  }, [segments, total]);

  const label =
    ariaLabel ??
    `Donut chart: ${segments.map((s) => `${s.label} ${((s.value / (total || 1)) * 100).toFixed(0)}%`).join(", ")}`;

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label}
      >
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={midR}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={arcWidth}
        />

        {/* Segments */}
        {arcs.map((arc, i) =>
          arc.angle > 0.5 ? (
            <motion.path
              key={arc.label}
              d={describeArc(cx, cy, midR, arc.startAngle, arc.endAngle)}
              fill="none"
              stroke={arc.color}
              strokeWidth={arcWidth}
              strokeLinecap="round"
              initial={
                shouldAnimate ? { pathLength: 0, opacity: 0 } : undefined
              }
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                ease: "easeOut",
              }}
            />
          ) : null,
        )}

        {/* Center text */}
        {centerValue && (
          <>
            <text
              x={cx}
              y={centerLabel ? cy - 4 : cy + 2}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-sm font-bold"
              style={{ fontSize: size * 0.15 }}
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x={cx}
                y={cy + size * 0.1}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-400"
                style={{ fontSize: size * 0.09 }}
              >
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: seg.color }}
              />
              <span className="text-slate-400">
                {seg.icon && `${seg.icon} `}
                {seg.label}
              </span>
              <span className="font-mono font-medium text-slate-300">
                {total > 0
                  ? `${((seg.value / total) * 100).toFixed(0)}%`
                  : "0%"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
