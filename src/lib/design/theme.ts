/**
 * Lunar Colony Tycoon — Design Tokens
 *
 * Central source of truth for all visual constants used in
 * @vercel/og Frame image generation.  Every color, font-size,
 * spacing value and tier mapping lives here so the rest of the
 * component library stays declarative and consistent.
 */

// ---------------------------------------------------------------------------
// Color palette (Moon-inspired)
// ---------------------------------------------------------------------------

export const colors = {
  /** Core palette */
  primary: "#0A0E17", // deep space black
  secondary: "#2A2D3A", // lunar gray
  accent: "#00D4FF", // electric blue ($LUNAR brand)
  success: "#2ECC71", // oxygen green
  warning: "#FF6B35", // solar flare orange
  error: "#E74C3C", // mars red

  /** Surface / background shades */
  surface: {
    dark: "#0F1219",
    base: "#151923",
    raised: "#1C2030",
    overlay: "#232840",
  },

  /** Text */
  text: {
    primary: "#FFFFFF",
    secondary: "rgba(255,255,255,0.72)",
    muted: "rgba(255,255,255,0.45)",
    disabled: "rgba(255,255,255,0.25)",
  },

  /** Semantic overlays (use for glassmorphism-style cards) */
  glass: {
    light: "rgba(255,255,255,0.06)",
    medium: "rgba(255,255,255,0.10)",
    heavy: "rgba(255,255,255,0.16)",
    card: "rgba(255,255,255,0.04)",
  },

  /** Status glow colours (for borders / accents) */
  glow: {
    accent: "rgba(0,212,255,0.35)",
    success: "rgba(46,204,113,0.35)",
    warning: "rgba(255,107,53,0.35)",
    error: "rgba(231,76,60,0.35)",
  },
} as const;

// ---------------------------------------------------------------------------
// Tier colours (module rarity borders)
// ---------------------------------------------------------------------------

export const tierColors = {
  COMMON: { border: "#6B7280", bg: "rgba(107,114,128,0.15)", label: "Common" },
  UNCOMMON: {
    border: "#2ECC71",
    bg: "rgba(46,204,113,0.12)",
    label: "Uncommon",
  },
  RARE: { border: "#00D4FF", bg: "rgba(0,212,255,0.12)", label: "Rare" },
  EPIC: { border: "#A855F7", bg: "rgba(168,85,247,0.12)", label: "Epic" },
  LEGENDARY: {
    border: "#FACC15",
    bg: "rgba(250,204,21,0.15)",
    label: "Legendary",
  },
} as const;

export type TierKey = keyof typeof tierColors;

// ---------------------------------------------------------------------------
// Resource icon / colour map
// ---------------------------------------------------------------------------

export const resourceMeta = {
  LUNAR: { icon: "💰", color: "#00D4FF", label: "$LUNAR" },
  REGOLITH: { icon: "🪨", color: "#9CA3AF", label: "Regolith" },
  WATER_ICE: { icon: "🧊", color: "#60A5FA", label: "Water Ice" },
  HELIUM3: { icon: "⚛️", color: "#C084FC", label: "Helium-3" },
  RARE_EARTH: { icon: "💎", color: "#FACC15", label: "Rare Earth" },
} as const;

export type ResourceKey = keyof typeof resourceMeta;

// ---------------------------------------------------------------------------
// Module icon / colour map
// ---------------------------------------------------------------------------

export const moduleMeta: Record<
  string,
  { icon: string; image?: string; color: string; label: string }
> = {
  SOLAR_PANEL: {
    icon: "⚡",
    image: "/modules/solar-panel.png",
    color: "#FACC15",
    label: "Solar Panel",
  },
  MINING_RIG: {
    icon: "⛏️",
    image: "/modules/mining-rig.png",
    color: "#F97316",
    label: "Mining Rig",
  },
  HABITAT: {
    icon: "🏠",
    image: "/modules/habitat.png",
    color: "#60A5FA",
    label: "Habitat",
  },
  RESEARCH_LAB: {
    icon: "🔬",
    image: "/modules/research-lab.png",
    color: "#A855F7",
    label: "Research Lab",
  },
  WATER_EXTRACTOR: { icon: "💧", color: "#38BDF8", label: "Water Extractor" },
  OXYGEN_GENERATOR: { icon: "🫁", color: "#2ECC71", label: "O₂ Generator" },
  STORAGE_DEPOT: { icon: "📦", color: "#9CA3AF", label: "Storage Depot" },
  LAUNCH_PAD: {
    icon: "🚀",
    image: "/modules/launch-pad.png",
    color: "#EF4444",
    label: "Launch Pad",
  },
};

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily: "Inter, system-ui, sans-serif",
  monoFamily: "'Roboto Mono', 'Courier New', monospace",

  /** Title text — all-caps, bold */
  title: {
    fontSize: 42,
    fontWeight: 700 as const,
    letterSpacing: "-0.02em",
    textTransform: "uppercase" as const,
  },

  /** Subtitle / section headers */
  subtitle: {
    fontSize: 28,
    fontWeight: 600 as const,
  },

  /** Body text */
  body: {
    fontSize: 24,
    fontWeight: 400 as const,
    lineHeight: 1.4,
  },

  /** Small captions / labels */
  caption: {
    fontSize: 16,
    fontWeight: 400 as const,
    opacity: 0.6,
  },

  /** Monospace numbers for balances, prices */
  mono: {
    fontSize: 26,
    fontWeight: 600 as const,
    fontFamily: "'Roboto Mono', 'Courier New', monospace",
  },

  /** Large hero numbers (balance, level) */
  heroNumber: {
    fontSize: 48,
    fontWeight: 700 as const,
    fontFamily: "'Roboto Mono', 'Courier New', monospace",
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing scale (px)
// ---------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ---------------------------------------------------------------------------
// Border radius
// ---------------------------------------------------------------------------

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 9999,
} as const;

// ---------------------------------------------------------------------------
// Screen-specific gradients
// ---------------------------------------------------------------------------

export const gradients = {
  /** Default / home */
  home: `linear-gradient(145deg, ${colors.primary} 0%, #141832 50%, ${colors.secondary} 100%)`,
  /** Colony management */
  colony: `linear-gradient(145deg, #0A0E17 0%, #0F2440 50%, #0A1628 100%)`,
  /** Build / construction */
  build: `linear-gradient(145deg, #0A0E17 0%, #1B2838 50%, #0F1923 100%)`,
  /** Market / trading */
  market: `linear-gradient(145deg, #0A0E17 0%, #1A0A3A 50%, #0D0520 100%)`,
  /** Alliance */
  alliance: `linear-gradient(145deg, #0A0E17 0%, #0F2840 50%, #0A1628 100%)`,
  /** Success result */
  success: `linear-gradient(145deg, #0A0E17 0%, #0B3D1A 50%, #0A1612 100%)`,
  /** Error result */
  error: `linear-gradient(145deg, #0A0E17 0%, #3D0B0B 50%, #1A0A0A 100%)`,
  /** Landing / splash */
  landing: `linear-gradient(145deg, #0A0E17 0%, #161B3A 50%, #0A0E17 100%)`,
  /** Production animation */
  production: `linear-gradient(145deg, #0A0E17 0%, #0A2A18 50%, #0A0E17 100%)`,
  /** Level-up celebration */
  celebrate: `linear-gradient(145deg, #1A0A3A 0%, #0A0E17 40%, #1A3A0A 100%)`,
} as const;

export type GradientKey = keyof typeof gradients;

// ---------------------------------------------------------------------------
// Frame image dimensions (re-export for convenience)
// ---------------------------------------------------------------------------

export const FRAME = {
  WIDTH: 955,
  HEIGHT: 500,
  ASPECT_RATIO: "1.91:1",
} as const;
