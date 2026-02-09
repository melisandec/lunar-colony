/**
 * Lunar Colony Tycoon — Animation Frame Sequences
 *
 * Since Farcaster Frames are static images, "animations" are achieved
 * by serving different image variants in rapid succession or across
 * user interactions.  Each animation function returns an array of
 * ImageResponse objects representing the keyframes.
 *
 * Animation sets:
 *   ProductionCycle   — 3-frame pulsing production indicator
 *   ModuleConstruction — 3-frame build sequence
 *   LunarEarning     — 3-frame $LUNAR pop-up
 *   LevelUp          — 3-frame celebration burst
 */

import { ImageResponse } from "@vercel/og";
import { FRAME, colors } from "./theme";
import { FrameCanvas, Section } from "./components";

const img = (jsx: React.ReactElement) =>
  new ImageResponse(jsx, { width: FRAME.WIDTH, height: FRAME.HEIGHT });

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION CYCLE (3 keyframes)
// Shows a pulsing energy effect around the production stat
// ═══════════════════════════════════════════════════════════════════════════

export function productionCycleFrames(production: number): ImageResponse[] {
  const phases = [
    { glow: 0.15, scale: "100%", label: "Producing…" },
    { glow: 0.35, scale: "105%", label: "⚡ Active" },
    { glow: 0.55, scale: "110%", label: "⚡⚡ Peak!" },
  ];

  return phases.map((phase, idx) =>
    img(
      <FrameCanvas gradient="production">
        <Section
          direction="column"
          align="center"
          justify="center"
          flex={1}
          gap={20}
        >
          {/* Pulsing glow ring */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 160,
              height: 160,
              borderRadius: 9999,
              background: `rgba(0,212,255,${phase.glow})`,
              border: `2px solid rgba(0,212,255,${phase.glow + 0.2})`,
              boxShadow: `0 0 ${20 + idx * 15}px rgba(0,212,255,${phase.glow})`,
            }}
          >
            <span style={{ display: "flex", fontSize: 64 }}>⚡</span>
          </div>

          <span
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: colors.accent,
            }}
          >
            +{production}/tick
          </span>
          <span
            style={{
              display: "flex",
              fontSize: 22,
              color: colors.text.secondary,
            }}
          >
            {phase.label}
          </span>

          {/* Frame counter dots */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
            }}
          >
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: d === idx ? colors.accent : colors.glass.medium,
                }}
              />
            ))}
          </div>
        </Section>
      </FrameCanvas>,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE CONSTRUCTION (3 keyframes)
// Blueprint → Building → Complete
// ═══════════════════════════════════════════════════════════════════════════

export function moduleConstructionFrames(moduleName: string): ImageResponse[] {
  const stages = [
    {
      icon: "📐",
      title: "BLUEPRINT",
      subtitle: `Preparing ${moduleName}…`,
      progressPct: 15,
      opacity: 0.5,
    },
    {
      icon: "🏗️",
      title: "CONSTRUCTING",
      subtitle: `Building ${moduleName}…`,
      progressPct: 60,
      opacity: 0.8,
    },
    {
      icon: "✅",
      title: "COMPLETE",
      subtitle: `${moduleName} online!`,
      progressPct: 100,
      opacity: 1,
    },
  ];

  return stages.map((stage, idx) =>
    img(
      <FrameCanvas gradient="build">
        <Section
          direction="column"
          align="center"
          justify="center"
          flex={1}
          gap={16}
        >
          <span
            style={{
              display: "flex",
              fontSize: 72,
              opacity: stage.opacity,
            }}
          >
            {stage.icon}
          </span>

          <span
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: idx === 2 ? colors.success : colors.text.primary,
            }}
          >
            {stage.title}
          </span>

          <span
            style={{
              display: "flex",
              fontSize: 22,
              color: colors.text.secondary,
              textTransform: "capitalize",
            }}
          >
            {stage.subtitle}
          </span>

          {/* Progress bar */}
          <div
            style={{
              display: "flex",
              width: 400,
              marginTop: 16,
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                height: 12,
                background: colors.glass.medium,
                borderRadius: 9999,
                overflow: "hidden",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: `${stage.progressPct}%`,
                  height: "100%",
                  background: idx === 2 ? colors.success : colors.accent,
                  borderRadius: 9999,
                  boxShadow: `0 0 10px ${idx === 2 ? colors.success : colors.accent}60`,
                }}
              />
            </div>
            <span
              style={{
                display: "flex",
                fontSize: 14,
                color: colors.text.muted,
                justifyContent: "center",
              }}
            >
              {stage.progressPct}%
            </span>
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: d <= idx ? colors.accent : colors.glass.medium,
                }}
              />
            ))}
          </div>
        </Section>
      </FrameCanvas>,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// $LUNAR EARNING POP-UP (3 keyframes)
// Small → Big → Settle
// ═══════════════════════════════════════════════════════════════════════════

export function lunarEarningFrames(amount: number): ImageResponse[] {
  const stages = [
    { numSize: 32, glowSize: 0, opacity: 0.4, subtitle: "" },
    {
      numSize: 56,
      glowSize: 40,
      opacity: 1,
      subtitle: "Production complete!",
    },
    { numSize: 44, glowSize: 20, opacity: 0.9, subtitle: "Added to balance" },
  ];

  return stages.map((s, idx) =>
    img(
      <FrameCanvas gradient="production">
        <Section
          direction="column"
          align="center"
          justify="center"
          flex={1}
          gap={12}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 9999,
              background: `rgba(0,212,255,${idx === 1 ? 0.2 : 0.08})`,
              boxShadow:
                s.glowSize > 0
                  ? `0 0 ${s.glowSize}px rgba(0,212,255,0.4)`
                  : "none",
            }}
          >
            <span style={{ display: "flex", fontSize: 52 }}>💰</span>
          </div>

          <span
            style={{
              display: "flex",
              fontSize: s.numSize,
              fontWeight: 700,
              color: colors.accent,
              opacity: s.opacity,
            }}
          >
            +{amount} $LUNAR
          </span>

          {s.subtitle && (
            <span
              style={{
                display: "flex",
                fontSize: 20,
                color: colors.text.secondary,
              }}
            >
              {s.subtitle}
            </span>
          )}

          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: d === idx ? colors.accent : colors.glass.medium,
                }}
              />
            ))}
          </div>
        </Section>
      </FrameCanvas>,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEVEL UP CELEBRATION (3 keyframes)
// Glow → Burst → Reveal new level
// ═══════════════════════════════════════════════════════════════════════════

export function levelUpFrames(
  oldLevel: number,
  newLevel: number,
): ImageResponse[] {
  const stages = [
    { phase: "glow", label: `Level ${oldLevel}`, icon: "⭐" },
    { phase: "burst", label: "LEVEL UP!", icon: "🎉" },
    { phase: "reveal", label: `Level ${newLevel}`, icon: "🚀" },
  ];

  return stages.map((s, idx) =>
    img(
      <FrameCanvas gradient="celebrate">
        <Section
          direction="column"
          align="center"
          justify="center"
          flex={1}
          gap={16}
        >
          {/* Radial burst on frame 2 */}
          {idx === 1 && (
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "radial-gradient(circle at center, rgba(250,204,21,0.15) 0%, transparent 60%)",
              }}
            />
          )}

          <span
            style={{
              display: "flex",
              fontSize: idx === 1 ? 80 : 64,
            }}
          >
            {s.icon}
          </span>

          <span
            style={{
              display: "flex",
              fontSize: idx === 1 ? 48 : 40,
              fontWeight: 700,
              color: idx === 1 ? "#FACC15" : colors.text.primary,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {s.label}
          </span>

          {idx === 2 && (
            <span
              style={{
                display: "flex",
                fontSize: 22,
                color: colors.text.secondary,
                marginTop: 8,
              }}
            >
              New modules and bonuses unlocked!
            </span>
          )}

          {/* Dots */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: d === idx ? "#FACC15" : colors.glass.medium,
                }}
              />
            ))}
          </div>
        </Section>
      </FrameCanvas>,
    ),
  );
}
