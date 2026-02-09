"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ---------- types ---------- */

interface ConstructionAnimationProps {
  /** true while construction is in progress */
  active: boolean;
  /** Optional label shown during construction */
  label?: string;
  className?: string;
}

/* ---------- helpers ---------- */

// Scaffold bars that "build up"
const BARS = [
  { x: "15%", delay: 0 },
  { x: "35%", delay: 0.15 },
  { x: "55%", delay: 0.3 },
  { x: "75%", delay: 0.45 },
];

// Animated sparks / welding spots
const SPARKS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 20 + Math.random() * 60,
  delay: Math.random() * 1.5,
  repeatDelay: 1.2 + Math.random() * 0.8,
}));

/* ---------- component ---------- */

/**
 * ConstructionAnimation — Overlay for modules being built/upgraded.
 * Shows scaffolding bars rising + welding sparks.
 * Parent must be `position: relative`.
 */
export function ConstructionAnimation({
  active,
  label = "Building…",
  className = "",
}: ConstructionAnimationProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <AnimatePresence>
        {active && (
          <motion.div
            className={`absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-950/60 ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            <span className="text-xs font-medium text-cyan-400">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className={`absolute inset-0 z-10 overflow-hidden rounded-2xl ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-hidden="true"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-slate-950/50" />

          {/* Scaffolding bars — rise from bottom */}
          {BARS.map((bar, i) => (
            <motion.div
              key={i}
              className="absolute bottom-0 w-1 rounded-full bg-cyan-500/40"
              style={{ left: bar.x }}
              initial={{ height: "0%" }}
              animate={{ height: "100%" }}
              transition={{
                duration: 0.8,
                delay: bar.delay,
                ease: [0.22, 1, 0.36, 1],
                repeat: Infinity,
                repeatType: "reverse",
                repeatDelay: 0.5,
              }}
            />
          ))}

          {/* Welding sparks */}
          {SPARKS.map((spark) => (
            <motion.div
              key={spark.id}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-400"
              style={{ left: `${spark.x}%`, top: `${spark.y}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0],
              }}
              transition={{
                duration: 0.4,
                delay: spark.delay,
                repeat: Infinity,
                repeatDelay: spark.repeatDelay,
              }}
            />
          ))}

          {/* Scan line — horizontal sweep */}
          <motion.div
            className="absolute left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-cyan-400 backdrop-blur-sm"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {label}
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
