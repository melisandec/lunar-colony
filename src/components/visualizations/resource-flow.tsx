"use client";

/**
 * ResourceFlow — Canvas-based particle animation showing resource production
 * flowing from modules to the colony center.
 *
 * Renders floating particles along paths between producer nodes and a
 * central collection point. Particle density and speed scale with
 * production rate. Respects reduced motion and performance tier.
 */

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FlowNode {
  /** Unique ID for the node */
  id: string;
  /** Position as fraction of canvas (0–1) */
  x: number;
  y: number;
  /** Production rate (particles per second) */
  rate: number;
  /** Particle color */
  color: string;
  /** Node label */
  label?: string;
}

export interface ResourceFlowProps {
  /** Producer nodes */
  nodes: FlowNode[];
  /** Target collection point (default: center) */
  target?: { x: number; y: number };
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Maximum particles (performance cap) */
  maxParticles?: number;
  /** Base particle size */
  particleSize?: number;
  /** Show node labels */
  showLabels?: boolean;
  /** Show flow lines */
  showPaths?: boolean;
  /** Performance tier from usePerformanceTier */
  performanceTier?: "high" | "medium" | "low";
  className?: string;
}

// ---------------------------------------------------------------------------
// Particle simulation
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  /** Progress along path 0–1 */
  t: number;
  /** Speed factor */
  speed: number;
  /** Start node */
  nodeId: string;
  color: string;
  size: number;
  opacity: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResourceFlow({
  nodes,
  target = { x: 0.5, y: 0.5 },
  width = 400,
  height = 300,
  maxParticles = 200,
  particleSize = 2.5,
  showLabels = false,
  showPaths = true,
  performanceTier = "high",
  className = "",
}: ResourceFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const reducedMotion = useReducedMotion();

  // Performance-based limits
  const effectiveMaxParticles =
    performanceTier === "low"
      ? Math.min(maxParticles, 30)
      : performanceTier === "medium"
        ? Math.min(maxParticles, 80)
        : maxParticles;

  const spawnParticle = useCallback(
    (node: FlowNode): Particle => ({
      x: node.x * width,
      y: node.y * height,
      t: 0,
      speed: 0.3 + Math.random() * 0.4,
      nodeId: node.id,
      color: node.color,
      size: particleSize * (0.7 + Math.random() * 0.6),
      opacity: 0.6 + Math.random() * 0.4,
    }),
    [width, height, particleSize],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, dt: number) => {
      const targetX = target.x * width;
      const targetY = target.y * height;

      ctx.clearRect(0, 0, width, height);

      // Draw flow paths (subtle curved lines)
      if (showPaths) {
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        for (const node of nodes) {
          const sx = node.x * width;
          const sy = node.y * height;
          const cpx = (sx + targetX) / 2;
          const cpy = Math.min(sy, targetY) - 20;

          ctx.strokeStyle = `${node.color}18`;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(cpx, cpy, targetX, targetY);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // Draw node labels
      if (showLabels) {
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        for (const node of nodes) {
          if (node.label) {
            ctx.fillStyle = `${node.color}80`;
            ctx.fillText(node.label, node.x * width, node.y * height - 10);
          }
        }
      }

      // Spawn new particles based on rate
      for (const node of nodes) {
        const spawnChance = node.rate * dt;
        if (
          Math.random() < spawnChance &&
          particlesRef.current.length < effectiveMaxParticles
        ) {
          particlesRef.current.push(spawnParticle(node));
        }
      }

      // Update and draw particles
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        const node = nodes.find((n) => n.id === p.nodeId);
        if (!node) continue;

        // Advance along curve
        p.t += p.speed * dt;
        if (p.t >= 1) continue; // Remove completed particles

        // Quadratic bezier position
        const sx = node.x * width;
        const sy = node.y * height;
        const cpx = (sx + targetX) / 2;
        const cpy = Math.min(sy, targetY) - 20;
        const t = p.t;
        const mt = 1 - t;

        p.x = mt * mt * sx + 2 * mt * t * cpx + t * t * targetX;
        p.y = mt * mt * sy + 2 * mt * t * cpy + t * t * targetY;

        // Fade in/out
        const fadeIn = Math.min(p.t / 0.1, 1);
        const fadeOut = Math.min((1 - p.t) / 0.2, 1);
        const alpha = p.opacity * fadeIn * fadeOut;

        // Draw particle with glow
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        alive.push(p);
      }

      particlesRef.current = alive;
      ctx.globalAlpha = 1;

      // Draw target node (collection point)
      ctx.fillStyle = "#facc1540";
      ctx.beginPath();
      ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
      ctx.fill();
    },
    [
      nodes,
      target,
      width,
      height,
      showPaths,
      showLabels,
      effectiveMaxParticles,
      spawnParticle,
    ],
  );

  useEffect(() => {
    if (reducedMotion || performanceTier === "low") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle device pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    lastTimeRef.current = performance.now();

    function loop(now: number) {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      draw(ctx!, dt);
      animFrameRef.current = requestAnimationFrame(loop);
    }

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      particlesRef.current = [];
    };
  }, [reducedMotion, performanceTier, width, height, draw]);

  // Static fallback for reduced motion / low perf
  if (reducedMotion || performanceTier === "low") {
    return (
      <div
        className={`relative ${className}`}
        style={{ width, height }}
        role="img"
        aria-label="Resource production flow"
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute h-2 w-2 rounded-full"
            style={{
              left: `${node.x * 100}%`,
              top: `${node.y * 100}%`,
              background: node.color,
              boxShadow: `0 0 6px ${node.color}40`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
        <div
          className="absolute h-3 w-3 rounded-full bg-amber-400"
          style={{
            left: `${target.x * 100}%`,
            top: `${target.y * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
      role="img"
      aria-label="Resource production flow animation"
    />
  );
}
