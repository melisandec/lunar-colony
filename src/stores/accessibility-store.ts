"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Accessibility Preferences Store
//
// Persists user preferences for visual, motor, and cognitive accessibility.
// Components read these values to adapt rendering, motion, colors, and sizing.
// ---------------------------------------------------------------------------

export type ContrastMode = "normal" | "high";
export type ColorblindMode =
  | "none"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia";
export type TextScale = 1 | 1.15 | 1.3 | 1.5;

interface AccessibilityState {
  // ── Visual ──────────────────────────────────────────────────────────────
  /** High-contrast mode for improved readability */
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;

  /** Colorblind-safe palette selection */
  colorblindMode: ColorblindMode;
  setColorblindMode: (mode: ColorblindMode) => void;

  /** Text size scaling factor (1 = default) */
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;

  // ── Motor ───────────────────────────────────────────────────────────────
  /** Respect prefers-reduced-motion or user override */
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  /** Enlarge touch targets to 48px minimum */
  largeTouchTargets: boolean;
  setLargeTouchTargets: (v: boolean) => void;

  // ── Cognitive ───────────────────────────────────────────────────────────
  /** Show extended tooltips and helper text */
  verboseHelp: boolean;
  setVerboseHelp: (v: boolean) => void;

  /** Screen reader announcements queue */
  announcement: string;
  announce: (message: string) => void;

  /** Reset all accessibility settings to defaults */
  resetA11y: () => void;
}

const DEFAULTS = {
  contrastMode: "normal" as ContrastMode,
  colorblindMode: "none" as ColorblindMode,
  textScale: 1 as TextScale,
  reducedMotion: false,
  largeTouchTargets: false,
  verboseHelp: false,
  announcement: "",
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setContrastMode: (contrastMode) => set({ contrastMode }),
      setColorblindMode: (colorblindMode) => set({ colorblindMode }),
      setTextScale: (textScale) => set({ textScale }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setLargeTouchTargets: (largeTouchTargets) => set({ largeTouchTargets }),
      setVerboseHelp: (verboseHelp) => set({ verboseHelp }),

      announce: (message) => {
        // Clear then set to retrigger screen reader announcement
        set({ announcement: "" });
        requestAnimationFrame(() => set({ announcement: message }));
      },

      resetA11y: () => set(DEFAULTS),
    }),
    {
      name: "lunar-colony-a11y",
      partialize: (state) => ({
        contrastMode: state.contrastMode,
        colorblindMode: state.colorblindMode,
        textScale: state.textScale,
        reducedMotion: state.reducedMotion,
        largeTouchTargets: state.largeTouchTargets,
        verboseHelp: state.verboseHelp,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Colorblind-safe palette
//
// Replaces red/green signalling with blue/orange universally safe colors.
// Components import these and select based on colorblindMode.
// ---------------------------------------------------------------------------

export const CB_SAFE_COLORS = {
  /** Success / positive — blue instead of green */
  positive: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
    hex: "#60a5fa",
  },
  /** Warning / moderate — amber (unchanged, universally safe) */
  moderate: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
    hex: "#fbbf24",
  },
  /** Danger / negative — orange instead of red */
  negative: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    dot: "bg-orange-400",
    hex: "#fb923c",
  },
  /** Info / neutral */
  neutral: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    dot: "bg-cyan-400",
    hex: "#22d3ee",
  },
} as const;

/**
 * Resolve a semantic color (positive/moderate/negative) to the correct CSS
 * classes based on the user's colorblind preference and contrast mode.
 */
export function useA11yColor(
  semantic: "positive" | "moderate" | "negative" | "neutral",
) {
  const cbMode = useAccessibilityStore((s) => s.colorblindMode);
  const contrast = useAccessibilityStore((s) => s.contrastMode);

  if (cbMode !== "none") {
    return CB_SAFE_COLORS[semantic];
  }

  // Standard palette (matches existing design)
  const standard = {
    positive: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      dot: "bg-emerald-400",
      hex: "#34d399",
    },
    moderate: CB_SAFE_COLORS.moderate,
    negative: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      dot: "bg-red-400",
      hex: "#f87171",
    },
    neutral: CB_SAFE_COLORS.neutral,
  };

  const palette = standard[semantic];

  // High contrast overrides
  if (contrast === "high") {
    return {
      ...palette,
      text: palette.text.replace("-400", "-300"),
    };
  }

  return palette;
}

// ---------------------------------------------------------------------------
// Motion helper — returns animation props disabled when reduced motion active
// ---------------------------------------------------------------------------

export function useReducedMotion(): boolean {
  const userPref = useAccessibilityStore((s) => s.reducedMotion);

  // Also check the OS-level preference
  if (typeof window !== "undefined") {
    const osPref = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return userPref || osPref;
  }
  return userPref;
}

/**
 * Wrap framer-motion transition props. When reduced motion is on,
 * returns instant transitions.
 */
export function useMotionSafe<T extends Record<string, unknown>>(
  full: T,
): T | { duration: 0 } {
  const reduced = useReducedMotion();
  if (reduced) return { duration: 0 } as unknown as T;
  return full;
}
