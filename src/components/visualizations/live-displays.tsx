"use client";

/**
 * Live data display components — countdown timers, animated counters,
 * and real-time value displays.
 *
 * - LiveCounter         — animated number that smoothly transitions
 * - CountdownDisplay    — visual countdown timer with progress ring
 * - TickCountdown       — countdown to next production tick
 * - EventCountdown      — countdown to game event end
 * - AnimatedBalance     — $LUNAR balance with coin animation on change
 * - MarketTicker        — scrolling market price updates
 */

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  useAnimatedValue,
  useCountdown,
  useTickCountdown,
} from "@/hooks/use-realtime";

// ---------------------------------------------------------------------------
// LiveCounter — animated number display
// ---------------------------------------------------------------------------

export interface LiveCounterProps {
  /** Target value */
  value: number;
  /** Animation duration ms */
  duration?: number;
  /** Decimal places */
  decimals?: number;
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., " LUNAR") */
  suffix?: string;
  /** Format with locale separators */
  locale?: boolean;
  /** Text size class */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Accent color */
  color?: string;
  className?: string;
}

const SIZE_CLASSES = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export function LiveCounter({
  value,
  duration = 600,
  decimals = 0,
  prefix,
  suffix,
  locale = true,
  size = "md",
  color,
  className = "",
}: LiveCounterProps) {
  const animated = useAnimatedValue({ value, duration, decimals });

  const formatted = useMemo(() => {
    if (locale) {
      return animated.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return decimals > 0 ? animated.toFixed(decimals) : String(animated);
  }, [animated, locale, decimals]);

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 font-mono font-bold tabular-nums ${SIZE_CLASSES[size]} ${className}`}
      style={color ? { color } : undefined}
    >
      {prefix && (
        <span className="text-[0.75em] font-normal opacity-70">{prefix}</span>
      )}
      {formatted}
      {suffix && (
        <span className="text-[0.75em] font-normal opacity-70">{suffix}</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CountdownDisplay — visual countdown with optional progress ring
// ---------------------------------------------------------------------------

export interface CountdownDisplayProps {
  /** Target time (Date, ISO string, or timestamp) */
  targetTime: Date | string | number;
  /** Start time (for progress calculation) */
  startTime?: Date | string | number;
  /** Show progress ring */
  showProgress?: boolean;
  /** Ring size */
  size?: number;
  /** Ring color */
  color?: string;
  /** Label below time */
  label?: string;
  /** Callback when expired */
  onExpired?: () => void;
  /** Show urgency colors (red when < 60s) */
  urgency?: boolean;
  className?: string;
}

export function CountdownDisplay({
  targetTime,
  startTime,
  showProgress = true,
  size = 64,
  color = "#10b981",
  label,
  urgency = true,
  className = "",
}: CountdownDisplayProps) {
  const countdown = useCountdown(targetTime, startTime);
  const reducedMotion = useReducedMotion();

  const activeColor =
    urgency && countdown.totalSeconds < 60
      ? "#ef4444"
      : urgency && countdown.totalSeconds < 300
        ? "#f59e0b"
        : color;

  if (countdown.expired) {
    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <span className="text-xs font-medium text-emerald-400">Complete!</span>
        {label && <span className="text-xs text-slate-500">{label}</span>}
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - countdown.progress);

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      role="timer"
      aria-label={`${label ?? "Countdown"}: ${countdown.formatted} remaining`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        {showProgress && (
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="absolute inset-0"
          >
            {/* Background ring */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={3}
            />
            {/* Progress arc */}
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={activeColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: reducedMotion
                  ? "none"
                  : "stroke-dashoffset 1s linear",
                filter: `drop-shadow(0 0 3px ${activeColor}40)`,
              }}
            />
          </svg>
        )}

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold tabular-nums"
            style={{
              fontSize: size * 0.2,
              color: activeColor,
            }}
          >
            {countdown.formatted}
          </span>
        </div>
      </div>

      {label && <span className="mt-1 text-xs text-slate-500">{label}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TickCountdown — countdown to next game production tick
// ---------------------------------------------------------------------------

export function TickCountdown({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const tick = useTickCountdown();

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="timer"
      aria-label={`Next tick in ${tick.formatted}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 3}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.08}
            strokeWidth={2}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 3}
            fill="none"
            stroke="#06b6d4"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (size / 2 - 3)}
            strokeDashoffset={
              2 * Math.PI * (size / 2 - 3) * (1 - tick.totalSeconds / 300)
            }
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono font-bold tabular-nums text-cyan-400"
            style={{ fontSize: size * 0.22 }}
          >
            {tick.formatted}
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-300">Next Tick</span>
        <span className="text-xs text-slate-500">Production cycle</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventCountdown — game event timer with icon and name
// ---------------------------------------------------------------------------

export interface EventCountdownProps {
  name: string;
  icon: string;
  endTime: Date | string | number;
  startTime?: Date | string | number;
  color?: string;
  className?: string;
}

export function EventCountdown({
  name,
  icon,
  endTime,
  startTime,
  color = "#a855f7",
  className = "",
}: EventCountdownProps) {
  const countdown = useCountdown(endTime, startTime);

  if (countdown.expired) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 ${className}`}
    >
      <span className="text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-slate-300">
          {name}
        </div>
        <div className="flex items-center gap-1">
          <span
            className="font-mono text-sm font-bold tabular-nums"
            style={{ color }}
          >
            {countdown.formatted}
          </span>
          <span className="text-xs text-slate-500">left</span>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="h-1 w-12 overflow-hidden rounded-full bg-slate-700">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          animate={{ width: `${countdown.progress * 100}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarketTicker — scrolling market price tape
// ---------------------------------------------------------------------------

export interface MarketTickerItem {
  symbol: string;
  price: number;
  change: number;
  icon?: string;
}

export interface MarketTickerProps {
  items: MarketTickerItem[];
  /** Scroll speed in px/s */
  speed?: number;
  className?: string;
}

export function MarketTicker({
  items,
  speed = 40,
  className = "",
}: MarketTickerProps) {
  const reducedMotion = useReducedMotion();

  // Double items so the marquee can loop
  const doubled = useMemo(() => [...items, ...items], [items]);
  const totalWidth = items.length * 160; // Approximate item width
  const duration = totalWidth / speed;

  return (
    <div
      className={`overflow-hidden border-y border-slate-700/30 bg-slate-900/50 py-1 ${className}`}
      aria-label="Market prices"
      role="marquee"
    >
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={reducedMotion ? undefined : { x: [0, -totalWidth] }}
        transition={
          reducedMotion
            ? undefined
            : {
                duration,
                repeat: Infinity,
                ease: "linear",
              }
        }
      >
        {doubled.map((item, i) => {
          const isUp = item.change >= 0;
          return (
            <span
              key={`${item.symbol}-${i}`}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              {item.icon && <span>{item.icon}</span>}
              <span className="font-medium text-slate-300">{item.symbol}</span>
              <span className="font-mono text-white">
                {item.price.toFixed(2)}
              </span>
              <span
                className={`font-mono ${isUp ? "text-emerald-400" : "text-red-400"}`}
              >
                {isUp ? "+" : ""}
                {item.change.toFixed(1)}%
              </span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}
