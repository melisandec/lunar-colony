"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useReducedMotion } from "@/stores/accessibility-store";

/* ---------- types ---------- */

type ParticlePreset = "levelUp" | "achievement" | "upgrade" | "build";

interface ParticleExplosionProps {
  /** Increment to trigger explosion */
  trigger: number;
  preset?: ParticlePreset;
  className?: string;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  shape: "circle" | "star" | "square";
}

/* ---------- preset configs ---------- */

const PRESETS: Record<
  ParticlePreset,
  {
    count: number;
    colors: string[];
    maxDistance: number;
    maxSize: number;
    duration: number;
    shapes: Particle["shape"][];
  }
> = {
  levelUp: {
    count: 28,
    colors: [
      "#22d3ee", // cyan
      "#a78bfa", // violet
      "#fbbf24", // amber
      "#34d399", // emerald
      "#f472b6", // pink
      "#ffffff", // white
    ],
    maxDistance: 120,
    maxSize: 10,
    duration: 1.0,
    shapes: ["circle", "star", "square"],
  },
  achievement: {
    count: 35,
    colors: ["#fbbf24", "#f59e0b", "#ffffff", "#fde68a", "#d97706"],
    maxDistance: 140,
    maxSize: 12,
    duration: 1.2,
    shapes: ["star", "circle"],
  },
  upgrade: {
    count: 18,
    colors: ["#22d3ee", "#06b6d4", "#67e8f9", "#ffffff"],
    maxDistance: 80,
    maxSize: 7,
    duration: 0.8,
    shapes: ["circle", "square"],
  },
  build: {
    count: 12,
    colors: ["#94a3b8", "#64748b", "#e2e8f0", "#fbbf24"],
    maxDistance: 60,
    maxSize: 6,
    duration: 0.6,
    shapes: ["square", "circle"],
  },
};

/* ---------- helpers ---------- */

let particleId = 0;

function generateParticles(preset: ParticlePreset): Particle[] {
  const cfg = PRESETS[preset];
  return Array.from(
    { length: cfg.count },
    (): Particle => ({
      id: ++particleId,
      angle: Math.random() * 360,
      distance: 20 + Math.random() * cfg.maxDistance,
      size: 3 + Math.random() * cfg.maxSize,
      color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)]!,
      delay: Math.random() * 0.15,
      duration: cfg.duration * (0.6 + Math.random() * 0.4),
      shape: cfg.shapes[Math.floor(Math.random() * cfg.shapes.length)]!,
    }),
  );
}

function ParticleShape({
  shape,
  size,
  color,
}: {
  shape: Particle["shape"];
  size: number;
  color: string;
}) {
  if (shape === "star") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l2.4 7.2H22l-6 4.4 2.4 7.4L12 16.6 5.6 21l2.4-7.4-6-4.4h7.6z" />
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: 2,
          transform: `rotate(${Math.random() * 45}deg)`,
        }}
      />
    );
  }
  // circle
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: "50%",
      }}
    />
  );
}

/* ---------- component ---------- */

/**
 * ParticleExplosion — burst of particles from center of parent.
 * Parent must be `position: relative`.
 */
export function ParticleExplosion({
  trigger,
  preset = "levelUp",
  className = "",
}: ParticleExplosionProps) {
  const reduced = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawn = useCallback(() => {
    const p = generateParticles(preset);
    setParticles(p);
    const maxDur = PRESETS[preset].duration * 1000 + 300;
    setTimeout(() => setParticles([]), maxDur);
  }, [preset]);

  useEffect(() => {
    if (trigger > 0) spawn();
  }, [trigger, spawn]);

  // Reduced motion fallback: brief glow pulse
  const glowColor = useMemo(() => PRESETS[preset].colors[0], [preset]);

  if (reduced) {
    return (
      <AnimatePresence>
        {particles.length > 0 && (
          <motion.div
            className={`pointer-events-none absolute inset-0 rounded-2xl ${className}`}
            style={{ boxShadow: `0 0 30px ${glowColor}40` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const tx = Math.cos(rad) * p.distance;
          const ty = Math.sin(rad) * p.distance;
          return (
            <motion.div
              key={p.id}
              className="absolute left-1/2 top-1/2"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: tx,
                y: ty,
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0.3],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <ParticleShape shape={p.shape} size={p.size} color={p.color} />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Center flash */}
      <AnimatePresence>
        {particles.length > 0 && (
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 40,
              height: 40,
              background: `radial-gradient(circle, ${glowColor}80, transparent)`,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
