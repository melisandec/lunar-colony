"use client";

/**
 * Sparkline — Lightweight SVG mini-chart for inline trend visualization.
 *
 * Use cases:
 * - Production history in module cards
 * - Price trends in market resource list
 * - Efficiency trends in colony overview
 */

import { useMemo, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SparklinePoint {
  value: number;
  label?: string;
}

export interface SparklineProps {
  /** Data points (oldest first) */
  data: number[] | SparklinePoint[];
  /** Width in px */
  width?: number;
  /** Height in px */
  height?: number;
  /** Stroke color */
  color?: string;
  /** Show gradient fill under line */
  fill?: boolean;
  /** Fill color (defaults to color with opacity) */
  fillColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Show end dot */
  showDot?: boolean;
  /** Dot radius */
  dotRadius?: number;
  /** Show min/max reference lines */
  showRange?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** CSS class */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(data: number[] | SparklinePoint[]): number[] {
  return data.map((d) => (typeof d === "number" ? d : d.value));
}

function buildPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const stepX = usableW / (values.length - 1);

  return values
    .map((v, i) => {
      const x = padding + i * stepX;
      const y = padding + usableH - ((v - min) / range) * usableH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildAreaPath(
  values: number[],
  width: number,
  height: number,
  padding: number,
): string {
  const linePath = buildPath(values, width, height, padding);
  if (!linePath) return "";
  const usableW = width - padding * 2;
  const lastX = padding + usableW;
  const bottomY = height - padding;
  return `${linePath} L${lastX.toFixed(1)},${bottomY} L${padding},${bottomY} Z`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "#10b981",
  fill = true,
  fillColor,
  strokeWidth = 1.5,
  showDot = true,
  dotRadius = 2,
  showRange = false,
  animate = true,
  className = "",
  ariaLabel,
}: SparklineProps) {
  const reducedMotion = useReducedMotion();
  const values = useMemo(() => normalize(data), [data]);
  const stableId = useId();
  const gradientId = `spark-fill-${stableId}`;

  const padding = 2;
  const linePath = useMemo(
    () => buildPath(values, width, height, padding),
    [values, width, height],
  );
  const areaPath = useMemo(
    () => (fill ? buildAreaPath(values, width, height, padding) : ""),
    [fill, values, width, height],
  );

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const lastVal = values[values.length - 1]!;
  const lastX = padding + usableW;
  const lastY = padding + usableH - ((lastVal - min) / range) * usableH;

  const trend = lastVal >= values[0]! ? "up" : "down";
  const label =
    ariaLabel ??
    `Sparkline trending ${trend}, ${values.length} points, range ${min.toFixed(1)} to ${max.toFixed(1)}`;

  const shouldAnimate = animate && !reducedMotion;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={label}
    >
      {/* Gradient fill definition */}
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={fillColor ?? color}
              stopOpacity={0.3}
            />
            <stop
              offset="100%"
              stopColor={fillColor ?? color}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
      )}

      {/* Min / max reference lines */}
      {showRange && (
        <>
          <line
            x1={padding}
            y1={padding}
            x2={padding + usableW}
            y2={padding}
            stroke={color}
            strokeOpacity={0.15}
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={padding + usableW}
            y2={height - padding}
            stroke={color}
            strokeOpacity={0.15}
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
        </>
      )}

      {/* Area fill */}
      {fill && areaPath && (
        <motion.path
          d={areaPath}
          fill={`url(#${gradientId})`}
          initial={shouldAnimate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* End dot */}
      {showDot && (
        <motion.circle
          cx={lastX}
          cy={lastY}
          r={dotRadius}
          fill={color}
          initial={shouldAnimate ? { scale: 0 } : undefined}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.2 }}
        />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Compact variant for embedding in text lines
// ---------------------------------------------------------------------------

export function InlineSparkline({
  data,
  color,
  className = "",
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  return (
    <Sparkline
      data={data}
      width={48}
      height={16}
      color={color}
      fill={false}
      showDot={false}
      strokeWidth={1}
      animate={false}
      className={`inline-block align-middle ${className}`}
    />
  );
}
