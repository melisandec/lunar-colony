"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ---------- types ---------- */

interface PriceTickerProps {
  /** Current price value */
  value: number;
  /** Previous price value (determines direction) */
  previousValue?: number;
  /** Format string — e.g. "$" prefix */
  prefix?: string;
  suffix?: string;
  /** Decimal places */
  decimals?: number;
  className?: string;
}

/* ---------- component ---------- */

/**
 * PriceTicker — animated number display with up/down color flash,
 * like a stock-market price ticker. Rolls digits on change.
 */
export function PriceTicker({
  value,
  previousValue,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: PriceTickerProps) {
  const reduced = useReducedMotion();
  const [direction, setDirection] = useState<"up" | "down" | "none">("none");
  const [displayValue, setDisplayValue] = useState(value);
  const prevRef = useRef(previousValue ?? value);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const prev = previousValue ?? prevRef.current;
    if (value > prev) setDirection("up");
    else if (value < prev) setDirection("down");
    else setDirection("none");

    prevRef.current = value;
    setDisplayValue(value);

    // Flash lasts 800ms
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setDirection("none"), 800);

    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [value, previousValue]);

  const dirColor =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
        ? "text-red-400"
        : "text-slate-200";

  const dirBg =
    direction === "up"
      ? "bg-emerald-500/10"
      : direction === "down"
        ? "bg-red-500/10"
        : "";

  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "";

  const formatted = displayValue.toFixed(decimals);

  if (reduced) {
    return (
      <span
        className={`font-mono font-semibold tabular-nums ${dirColor} ${className}`}
      >
        {prefix}
        {formatted}
        {suffix}
        {arrow && <span className="ml-1 text-[0.7em]">{arrow}</span>}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1 font-mono font-semibold tabular-nums transition-colors duration-300 ${dirColor} ${dirBg} ${className}`}
    >
      {prefix && <span>{prefix}</span>}

      {/* Animated digits */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={formatted}
          initial={{ y: direction === "up" ? 8 : -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction === "up" ? -8 : 8, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {formatted}
        </motion.span>
      </AnimatePresence>

      {suffix && <span>{suffix}</span>}

      {/* Direction arrow */}
      <AnimatePresence>
        {arrow && (
          <motion.span
            className="text-[0.65em]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            {arrow}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ---------- price change streak ---------- */

interface PriceStreakProps {
  /** Array of recent price changes (newest first) */
  changes: number[];
  className?: string;
}

/**
 * PriceStreak — Horizontal row of small bars showing recent price movement.
 * Each bar is green (up) or red (down) with height proportional to magnitude.
 */
export function PriceStreak({ changes, className = "" }: PriceStreakProps) {
  const reduced = useReducedMotion();
  const maxChange = Math.max(1, ...changes.map(Math.abs));

  return (
    <div
      className={`flex items-end gap-px ${className}`}
      aria-label={`Recent changes: ${changes.map((c) => (c >= 0 ? "+" : "") + c).join(", ")}`}
      role="img"
    >
      {changes.map((change, i) => {
        const height = Math.max(4, (Math.abs(change) / maxChange) * 20);
        const color = change >= 0 ? "bg-emerald-500" : "bg-red-500";
        return (
          <motion.div
            key={i}
            className={`w-1 rounded-full ${color}`}
            initial={reduced ? { height } : { height: 0, opacity: 0 }}
            animate={{ height, opacity: 1 }}
            transition={{
              duration: reduced ? 0 : 0.3,
              delay: reduced ? 0 : i * 0.03,
              ease: "easeOut",
            }}
            style={{ height }}
          />
        );
      })}
    </div>
  );
}
