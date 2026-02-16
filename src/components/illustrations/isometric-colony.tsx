"use client";

import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Isometric 2.5D Illustration System
// Hand-crafted SVG paths for lunar colony scenes — game-like, shareable
// ---------------------------------------------------------------------------

const ACCENT = "#00D4FF";
const LUNAR_GRAY = "#4B5563";
const LUNAR_LIGHT = "#6B7280";
const AMBER = "#FACC15";

export interface IsometricColonyProps {
  variant?: "hero" | "card" | "header" | "compact";
  animated?: boolean;
  className?: string;
}

const SIZES = {
  hero: { w: 360, h: 260 },
  card: { w: 220, h: 150 },
  header: { w: 300, h: 180 },
  compact: { w: 140, h: 100 },
};

export function IsometricColony({
  variant = "hero",
  animated = true,
  className = "",
}: IsometricColonyProps) {
  const { w, h } = SIZES[variant];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: "100%", maxWidth: w, aspectRatio: `${w}/${h}` }}
      aria-hidden
    >
      <svg
        viewBox="0 0 360 260"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{
          filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.5))",
        }}
      >
        <defs>
          <linearGradient id="iso-lunar-surface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={LUNAR_LIGHT} stopOpacity={0.5} />
            <stop offset="100%" stopColor={LUNAR_GRAY} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="iso-dome-glass" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.35} />
          </linearGradient>
          <linearGradient id="iso-solar-panel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.95} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
          </linearGradient>
          <radialGradient id="iso-dome-inner" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
          </radialGradient>
        </defs>

        {/* Lunar terrain */}
        <ellipse cx="180" cy="200" rx="220" ry="70" fill="url(#iso-lunar-surface)" />
        <ellipse cx="80" cy="195" rx="20" ry="6" fill="#374151" opacity={0.6} />
        <ellipse cx="280" cy="198" rx="14" ry="5" fill="#374151" opacity={0.5} />

        {/* Buildings — isometric blocks (drawn back to front) */}

        {/* Storage depot — back-left */}
        <g fill="#475569" stroke="#334155" strokeWidth="1.5">
          <polygon points="60,220 90,205 120,225 90,240" />
          <polygon points="90,205 120,225 120,195 90,175" />
          <polygon points="90,175 120,195 90,210 60,190" />
        </g>

        {/* Mining rig — back-right */}
        <g fill="#78716C" stroke="#57534E" strokeWidth="1.5">
          <polygon points="240,225 270,210 300,230 270,245" />
          <polygon points="270,210 300,230 300,200 270,180" />
          <polygon points="270,180 300,200 270,215 240,195" />
        </g>
        <ellipse cx="285" cy="212" rx="6" ry="3" fill={ACCENT} opacity={0.7} />

        {/* Habitat dome — center hero */}
        <g>
          <path
            d="M 140 230 Q 180 160 220 230 Z"
            fill="url(#iso-dome-glass)"
            stroke={ACCENT}
            strokeWidth="2"
            strokeOpacity={0.7}
          />
          <ellipse cx="180" cy="218" rx="42" ry="8" fill="#1E3A5F" opacity={0.6} />
          {animated && (
            <motion.ellipse
              cx="180"
              cy="195"
              rx="25"
              ry="6"
              fill={ACCENT}
              opacity={0.3}
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          )}
        </g>

        {/* Solar panel array — left */}
        <g transform="translate(40, 170)">
          <polygon
            points="0,0 35,-12 70,8 35,20"
            fill="url(#iso-solar-panel)"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          <polygon points="35,20 70,8 70,28 35,40" fill="#B45309" stroke="#92400E" strokeWidth="1" />
          {animated && (
            <motion.rect
              x="15"
              y="-5"
              width="40"
              height="10"
              rx="2"
              fill={AMBER}
              opacity={0.4}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </g>

        {/* Launch pad + rocket — right */}
        <g transform="translate(260, 165)">
          <polygon points="-20,35 0,5 20,35 0,55" fill="#1C2030" stroke="#64748B" strokeWidth="1.5" />
          <path
            d="M -6 55 L -4 -25 L 0 -40 L 4 -25 L 6 55 Z"
            fill="#94A3B8"
            stroke="#64748B"
            strokeWidth="1"
          />
          <ellipse cx="0" cy="-15" rx="3" ry="5" fill={ACCENT} opacity={0.9} />
          <path d="M -4 55 Q 0 72 4 55" fill="none" stroke="#FF6B35" strokeWidth="2" opacity={0.9} />
        </g>

        {/* Antenna */}
        <line x1="175" y1="210" x2="175" y2="175" stroke={ACCENT} strokeWidth="2" opacity={0.7} />
        <circle cx="175" cy="172" r="5" fill={ACCENT} opacity={0.6} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact variant for cards — simplified scene
// ---------------------------------------------------------------------------
export function IsometricColonyCompact({
  variant = "compact",
  animated = false,
  className = "",
}: IsometricColonyProps) {
  const { w, h } = SIZES[variant];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: "100%", maxWidth: w, aspectRatio: `${w}/${h}` }}
      aria-hidden
    >
      <svg viewBox="0 0 220 150" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="iso-compact-surface" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={LUNAR_LIGHT} stopOpacity={0.5} />
            <stop offset="100%" stopColor={LUNAR_GRAY} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="iso-compact-dome" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="iso-compact-solar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.9} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="115" rx="130" ry="45" fill="url(#iso-compact-surface)" />
        <path
          d="M 70 115 Q 110 70 150 115 Z"
          fill="url(#iso-compact-dome)"
          stroke={ACCENT}
          strokeWidth="1.5"
          strokeOpacity={0.6}
        />
        <ellipse cx="110" cy="105" rx="42" ry="6" fill="#1E3A5F" opacity={0.5} />
        <polygon
          points="20,95 55,80 90,95 55,110"
          fill="url(#iso-compact-solar)"
          stroke="#D97706"
          strokeWidth="1"
        />
        {animated && (
          <motion.ellipse
            cx="110"
            cy="95"
            rx="35"
            ry="6"
            fill={ACCENT}
            opacity={0.15}
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
}
