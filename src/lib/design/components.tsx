/**
 * Lunar Colony Tycoon — OG Image Component Library
 *
 * Reusable React-like components for building Frame images with
 * @vercel/og's `ImageResponse`.  All components use inline styles
 * (Satori requirement) and reference the central design tokens.
 *
 * Components:
 *   Layout       — FrameCanvas, SplitLayout, Header, Footer, Section, Divider, Panel
 *   Data display — StatBadge, StatRow, ResourceIndicator, ModuleCard, ModuleGridCell,
 *                  PriceRow, Sparkline, DepthBar, InfoSidebar
 *   Feedback     — ProgressBar, StatusBanner, ToastBanner
 *   Decoration   — GlowBorder, LunarLogo, BalanceDisplay, LevelBadge
 */

import {
  colors,
  typography,
  spacing,
  radii,
  tierColors,
  resourceMeta,
  moduleMeta,
  gradients,
  FRAME,
  type TierKey,
  type ResourceKey,
  type GradientKey,
} from "./theme";

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Root canvas — sets dimensions, gradient background and standard padding.
 */
export function FrameCanvas({
  gradient = "home",
  children,
  padding = spacing.xl,
}: {
  gradient?: GradientKey;
  children: React.ReactNode;
  padding?: number;
}) {
  return (
    <div
      style={{
        width: FRAME.WIDTH,
        height: FRAME.HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: gradients[gradient],
        fontFamily: typography.fontFamily,
        color: colors.text.primary,
        padding,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle star-dust overlay */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "radial-gradient(1px 1px at 100px 50px, rgba(255,255,255,0.3) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 400px 120px, rgba(255,255,255,0.2) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 650px 300px, rgba(255,255,255,0.25) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 200px 400px, rgba(255,255,255,0.15) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 800px 80px, rgba(255,255,255,0.2) 0%, transparent 100%), " +
            "radial-gradient(2px 2px at 550px 220px, rgba(0,212,255,0.15) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 50px 280px, rgba(255,255,255,0.2) 0%, transparent 100%), " +
            "radial-gradient(1px 1px at 750px 420px, rgba(255,255,255,0.15) 0%, transparent 100%)",
        }}
      />
      {/* Content above the star overlay */}
      {children}
    </div>
  );
}

/**
 * Standard screen header with title + optional right-side badges.
 */
export function Header({
  icon,
  title,
  children,
}: {
  icon?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          ...typography.title,
          color: colors.text.primary,
        }}
      >
        {icon && <span style={{ display: "flex" }}>{icon}</span>}
        <span style={{ display: "flex" }}>{title}</span>
      </div>
      {children && (
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Footer hint text (button legend).
 */
export function Footer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        ...typography.caption,
        color: colors.text.muted,
        marginTop: "auto",
        paddingTop: spacing.sm,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Flex section with optional gap.
 */
export function Section({
  direction = "row",
  gap = spacing.md,
  flex = 0,
  wrap = false,
  align,
  justify,
  mt,
  children,
}: {
  direction?: "row" | "column";
  gap?: number;
  flex?: number;
  wrap?: boolean;
  align?: string;
  justify?: string;
  mt?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        gap,
        flex,
        flexWrap: wrap ? "wrap" : "nowrap",
        alignItems: align ?? "stretch",
        justifyContent: justify ?? "flex-start",
        marginTop: mt ?? 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Thin horizontal divider.
 */
export function Divider() {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: 1,
        background: colors.glass.light,
        margin: `${spacing.sm}px 0`,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Two-column split layout: main content (left) + sidebar (right).
 * Uses a glass divider between panels.
 */
export function SplitLayout({
  mainWidth = "63%",
  sideWidth = "35%",
  children,
}: {
  mainWidth?: string;
  sideWidth?: string;
  children: [React.ReactNode, React.ReactNode];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        flex: 1,
        gap: spacing.sm,
      }}
    >
      {/* Main panel */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: mainWidth,
          flex: 1,
        }}
      >
        {children[0]}
      </div>
      {/* Vertical glass divider */}
      <div
        style={{
          display: "flex",
          width: 1,
          background: `linear-gradient(to bottom, transparent, ${colors.glass.medium}, transparent)`,
        }}
      />
      {/* Sidebar panel */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: sideWidth,
        }}
      >
        {children[1]}
      </div>
    </div>
  );
}

/**
 * Glass-morphism card panel with optional title.
 * Wraps a section of content with a frosted-glass look.
 */
export function Panel({
  title,
  children,
  flex,
  padding,
}: {
  title?: string;
  children: React.ReactNode;
  flex?: number;
  padding?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: colors.glass.card,
        borderRadius: radii.lg,
        border: `1px solid ${colors.glass.light}`,
        padding: padding ?? spacing.sm,
        gap: spacing.xs,
        ...(flex !== undefined ? { flex } : {}),
      }}
    >
      {title && (
        <span
          style={{
            display: "flex",
            ...typography.caption,
            color: colors.text.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {title}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * Small visual cell for a module grid.
 * Shows the module icon + tier-coloured border + efficiency indicator ring.
 * If `empty` is true, renders a dashed placeholder.
 */
export function ModuleGridCell({
  moduleType,
  tier,
  efficiency,
  isActive,
  empty,
  selected,
}: {
  moduleType?: string;
  tier?: TierKey;
  efficiency?: number;
  isActive?: boolean;
  empty?: boolean;
  selected?: boolean;
}) {
  if (empty) {
    return (
      <div
        style={{
          display: "flex",
          width: 44,
          height: 44,
          borderRadius: radii.md,
          border: `1px dashed ${colors.glass.light}`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ display: "flex", fontSize: 14, opacity: 0.3 }}>+</span>
      </div>
    );
  }

  const meta = moduleType
    ? moduleMeta[moduleType as keyof typeof moduleMeta]
    : undefined;
  const tierColor = tier ? tierColors[tier] : tierColors.COMMON;
  const effPct = efficiency ?? 100;
  // Map efficiency to colour: ≥80 green, ≥50 yellow, else red
  const effColor =
    effPct >= 80
      ? colors.success
      : effPct >= 50
        ? colors.warning
        : colors.error;

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 44,
        height: 44,
        borderRadius: radii.md,
        border: `2px solid ${selected ? colors.accent : tierColor.border}`,
        background: selected ? `${colors.accent}18` : tierColor.bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: isActive === false ? 0.45 : 1,
      }}
    >
      <span style={{ display: "flex", fontSize: 20 }}>
        {meta?.icon ?? "📦"}
      </span>
      {/* Tiny efficiency dot — bottom-right */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 8,
          height: 8,
          borderRadius: 4,
          background: effColor,
          border: `1px solid ${colors.surface.base}`,
        }}
      />
    </div>
  );
}

/**
 * Horizontal bar-chart sparkline for 24-hour price history.
 * Uses stacked divs (Satori has no SVG support in @vercel/og).
 * `data` is an array of normalised 0-1 values.
 */
export function Sparkline({
  data,
  color = colors.accent,
  height = 48,
  barWidth = 3,
  gap = 1,
}: {
  data: number[];
  color?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        height,
        gap,
      }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: barWidth,
            height: Math.max(2, Math.round(v * height)),
            borderRadius: 1,
            background: i === data.length - 1 ? colors.text.primary : color,
            opacity: 0.55 + v * 0.45,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Market depth bar: paired buy (green) / sell (red) visual.
 * `buyPct` and `sellPct` are 0-1 normalised to the max depth.
 */
export function DepthBar({
  buyPct,
  sellPct,
  buyLabel,
  sellLabel,
  height = 18,
}: {
  buyPct: number;
  sellPct: number;
  buyLabel?: string;
  sellLabel?: string;
  height?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%",
      }}
    >
      {/* Buy side */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <div
          style={{
            display: "flex",
            height,
            width: `${Math.max(4, buyPct * 100)}%`,
            background: `linear-gradient(to right, ${colors.success}44, ${colors.success})`,
            borderRadius: radii.sm,
          }}
        />
        {buyLabel && (
          <span
            style={{
              display: "flex",
              ...typography.caption,
              color: colors.success,
              whiteSpace: "nowrap",
            }}
          >
            {buyLabel}
          </span>
        )}
      </div>
      {/* Sell side */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
        }}
      >
        <div
          style={{
            display: "flex",
            height,
            width: `${Math.max(4, sellPct * 100)}%`,
            background: `linear-gradient(to right, ${colors.error}44, ${colors.error})`,
            borderRadius: radii.sm,
          }}
        />
        {sellLabel && (
          <span
            style={{
              display: "flex",
              ...typography.caption,
              color: colors.error,
              whiteSpace: "nowrap",
            }}
          >
            {sellLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Sidebar-style vertical stack of StatRow items.
 * Wraps rows inside a glass Panel.
 */
export function InfoSidebar({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel title={title} flex={1}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing.xs,
        }}
      >
        {children}
      </div>
    </Panel>
  );
}

/**
 * Horizontal label → value row with optional trend icon.
 * Designed for use inside InfoSidebar.
 */
export function StatRow({
  label,
  value,
  icon,
  trend,
  valueColor,
}: {
  label: string;
  value: string | number;
  icon?: string;
  trend?: "up" | "down" | "flat";
  valueColor?: string;
}) {
  const trendIcon = trend === "up" ? "▲" : trend === "down" ? "▼" : "";
  const trendColor =
    trend === "up"
      ? colors.success
      : trend === "down"
        ? colors.error
        : colors.text.muted;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${spacing.xs / 2}px 0`,
      }}
    >
      <span
        style={{
          display: "flex",
          ...typography.caption,
          color: colors.text.muted,
          gap: 4,
        }}
      >
        {icon && <span style={{ display: "flex" }}>{icon}</span>}
        {label}
      </span>
      <span
        style={{
          display: "flex",
          ...typography.mono,
          fontSize: 13,
          color: valueColor ?? colors.text.primary,
          gap: 3,
        }}
      >
        {value}
        {trendIcon && (
          <span style={{ display: "flex", fontSize: 9, color: trendColor }}>
            {trendIcon}
          </span>
        )}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compact stat badge — icon, value, label stacked vertically.
 * Used for level, streak, rank, balance, production etc.
 */
export function StatBadge({
  icon,
  value,
  label,
  accentColor,
  size = "md",
}: {
  icon: string;
  value: string;
  label: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
}) {
  const accent = accentColor ?? colors.accent;
  const isAccented = !!accentColor;
  const sizes = {
    sm: { icon: 22, value: 18, label: 12, px: 12, py: 10, minW: 100 },
    md: { icon: 28, value: 24, label: 14, px: 20, py: 14, minW: 140 },
    lg: { icon: 36, value: 32, label: 16, px: 28, py: 18, minW: 180 },
  };
  const s = sizes[size];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: isAccented ? `${accent}18` : colors.glass.light,
        border: `1px solid ${isAccented ? `${accent}50` : colors.glass.medium}`,
        borderRadius: radii.lg,
        padding: `${s.py}px ${s.px}px`,
        minWidth: s.minW,
        flex: 1,
      }}
    >
      <span style={{ display: "flex", fontSize: s.icon }}>{icon}</span>
      <span
        style={{
          display: "flex",
          fontSize: s.value,
          fontWeight: 700,
          marginTop: spacing.xs,
          color: isAccented ? accent : colors.text.primary,
        }}
      >
        {value}
      </span>
      <span
        style={{
          display: "flex",
          fontSize: s.label,
          color: colors.text.muted,
          marginTop: 2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Inline tag/pill badge (e.g. "Lv.5", "Rank #12").
 */
export function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: 18,
        fontWeight: 600,
        color: color ?? colors.text.primary,
        background: bg ?? colors.glass.medium,
        padding: `${spacing.xs}px ${spacing.md}px`,
        borderRadius: radii.sm,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Resource indicator — icon + amount, optional trend arrow.
 */
export function ResourceIndicator({
  resource,
  amount,
  trend,
  showLabel = false,
}: {
  resource: ResourceKey;
  amount: string;
  trend?: "up" | "down" | "stable";
  showLabel?: boolean;
}) {
  const meta = resourceMeta[resource];
  const trendColor =
    trend === "up"
      ? colors.success
      : trend === "down"
        ? colors.error
        : colors.text.muted;
  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: `${spacing.xs}px ${spacing.md}px`,
        background: colors.glass.light,
        borderRadius: radii.md,
      }}
    >
      <span style={{ display: "flex", fontSize: 20 }}>{meta.icon}</span>
      {showLabel && (
        <span
          style={{
            display: "flex",
            fontSize: 16,
            color: colors.text.secondary,
          }}
        >
          {meta.label}
        </span>
      )}
      <span
        style={{
          display: "flex",
          ...typography.mono,
          fontSize: 20,
          color: meta.color,
        }}
      >
        {amount}
      </span>
      {trendArrow && (
        <span style={{ display: "flex", fontSize: 14, color: trendColor }}>
          {trendArrow}
        </span>
      )}
    </div>
  );
}

/**
 * Module card with tier-coloured left border.
 */
export function ModuleCard({
  moduleType,
  tier = "COMMON",
  count,
  output,
  compact = false,
}: {
  moduleType: string;
  tier?: TierKey;
  count?: number;
  output?: string;
  compact?: boolean;
}) {
  const meta = moduleMeta[moduleType] ?? {
    icon: "🔧",
    color: "#9CA3AF",
    label: moduleType.replace(/_/g, " "),
  };
  const tc = tierColors[tier];

  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing.sm,
          background: tc.bg,
          borderLeft: `3px solid ${tc.border}`,
          padding: `${spacing.sm}px ${spacing.md}px`,
          borderRadius: radii.sm,
          fontSize: 18,
        }}
      >
        <span style={{ display: "flex" }}>{meta.icon}</span>
        <span
          style={{
            display: "flex",
            textTransform: "capitalize",
            fontWeight: 600,
          }}
        >
          {meta.label}
        </span>
        {count !== undefined && (
          <span
            style={{
              display: "flex",
              background: colors.glass.medium,
              padding: `2px ${spacing.sm}px`,
              borderRadius: radii.sm,
              fontSize: 14,
            }}
          >
            ×{count}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        background: tc.bg,
        borderLeft: `4px solid ${tc.border}`,
        padding: `${spacing.md}px ${spacing.lg}px`,
        borderRadius: radii.md,
        flex: 1,
      }}
    >
      <span style={{ display: "flex", fontSize: 32 }}>{meta.icon}</span>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <span
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            textTransform: "capitalize",
          }}
        >
          {meta.label}
        </span>
        <div style={{ display: "flex", gap: spacing.sm, marginTop: 2 }}>
          <span
            style={{
              display: "flex",
              fontSize: 13,
              color: tc.border,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {tc.label}
          </span>
          {output && (
            <span
              style={{
                display: "flex",
                fontSize: 13,
                color: colors.text.muted,
              }}
            >
              {output}
            </span>
          )}
        </div>
      </div>
      {count !== undefined && (
        <span
          style={{
            display: "flex",
            ...typography.mono,
            fontSize: 22,
            color: colors.text.secondary,
          }}
        >
          ×{count}
        </span>
      )}
    </div>
  );
}

/**
 * Market price row — resource + price + change %.
 */
export function PriceRow({
  resource,
  price,
  changePercent,
  trend,
}: {
  resource: ResourceKey;
  price: string;
  changePercent: string;
  trend: "up" | "down" | "stable";
}) {
  const meta = resourceMeta[resource];
  const trendBorder =
    trend === "up"
      ? `1px solid ${colors.glow.success}`
      : trend === "down"
        ? `1px solid ${colors.glow.error}`
        : `1px solid ${colors.glass.light}`;
  const changeColor =
    trend === "up"
      ? colors.success
      : trend === "down"
        ? colors.error
        : colors.text.muted;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: `${spacing.md}px ${spacing.lg}px`,
        background: colors.glass.light,
        border: trendBorder,
        borderRadius: radii.md,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <span style={{ display: "flex", fontSize: 26 }}>{meta.icon}</span>
        <span
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {meta.label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.lg }}>
        <span
          style={{
            display: "flex",
            ...typography.mono,
            fontSize: 22,
          }}
        >
          {price} $L
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 18,
            color: changeColor,
            minWidth: 70,
            justifyContent: "flex-end",
            fontWeight: 600,
          }}
        >
          {changePercent}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Horizontal progress bar with label.
 */
export function ProgressBar({
  label,
  value,
  max = 100,
  color,
  showPercent = true,
  height = 14,
}: {
  label?: string;
  value: number;
  max?: number;
  color?: string;
  showPercent?: boolean;
  height?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = color ?? colors.accent;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: spacing.xs,
        width: "100%",
      }}
    >
      {(label || showPercent) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 14,
            color: colors.text.secondary,
          }}
        >
          {label && <span style={{ display: "flex" }}>{label}</span>}
          {showPercent && <span style={{ display: "flex" }}>{pct}%</span>}
        </div>
      )}
      {/* Track */}
      <div
        style={{
          display: "flex",
          height,
          background: colors.glass.medium,
          borderRadius: radii.pill,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* Fill */}
        <div
          style={{
            display: "flex",
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            borderRadius: radii.pill,
            boxShadow: `0 0 8px ${barColor}60`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Alert banner (event, collection, error).
 */
export function StatusBanner({
  variant = "info",
  icon,
  children,
}: {
  variant?: "info" | "success" | "warning" | "error";
  icon?: string;
  children: React.ReactNode;
}) {
  const variantMap = {
    info: {
      bg: `${colors.accent}18`,
      border: `${colors.accent}45`,
      color: colors.accent,
    },
    success: {
      bg: `${colors.success}18`,
      border: `${colors.success}45`,
      color: colors.success,
    },
    warning: {
      bg: `${colors.warning}18`,
      border: `${colors.warning}45`,
      color: colors.warning,
    },
    error: {
      bg: `${colors.error}18`,
      border: `${colors.error}45`,
      color: colors.error,
    },
  };

  const v = variantMap[variant];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: `${spacing.sm}px ${spacing.lg}px`,
        background: v.bg,
        border: `1px solid ${v.border}`,
        borderRadius: radii.md,
        fontSize: 20,
        color: v.color,
      }}
    >
      {icon && <span style={{ display: "flex" }}>{icon}</span>}
      <span style={{ display: "flex" }}>{children}</span>
    </div>
  );
}

/**
 * Small toast-style popup (for +$LUNAR earned, level up, etc.)
 */
export function ToastBanner({
  icon,
  message,
  color,
}: {
  icon: string;
  message: string;
  color?: string;
}) {
  const c = color ?? colors.accent;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: `${spacing.sm}px ${spacing.md}px`,
        background: `${c}20`,
        border: `1px solid ${c}50`,
        borderRadius: radii.lg,
        fontSize: 22,
        color: c,
        fontWeight: 600,
      }}
    >
      <span style={{ display: "flex" }}>{icon}</span>
      <span style={{ display: "flex" }}>{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DECORATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Glow border overlay — rendered as a subtle inset box-shadow effect.
 * Wrap content inside this for a neon glow effect.
 */
export function GlowBorder({
  color = colors.accent,
  children,
  borderRadius = radii.lg,
}: {
  color?: string;
  children: React.ReactNode;
  borderRadius?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${color}50`,
        borderRadius,
        boxShadow: `0 0 20px ${color}25, inset 0 0 20px ${color}08`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Lunar Colony logo treatment (moon emoji + stylised text).
 */
export function LunarLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { icon: 28, text: 24 },
    md: { icon: 42, text: 36 },
    lg: { icon: 64, text: 52 },
  };
  const s = sizes[size];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <span style={{ display: "flex", fontSize: s.icon }}>🌙</span>
      <span
        style={{
          display: "flex",
          fontSize: s.text,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          background: `linear-gradient(135deg, ${colors.text.primary} 0%, ${colors.accent} 100%)`,
          backgroundClip: "text",
          color: colors.text.primary,
        }}
      >
        LUNAR COLONY
      </span>
    </div>
  );
}

/**
 * Balance display with $LUNAR branding.
 */
export function BalanceDisplay({
  amount,
  size = "md",
}: {
  amount: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { fontSize: 16 },
    md: { fontSize: 20 },
    lg: { fontSize: 28 },
  };
  return (
    <Badge color={colors.accent} bg={`${colors.accent}18`}>
      <span
        style={{
          display: "flex",
          fontSize: sizes[size].fontSize,
          fontWeight: 600,
        }}
      >
        💰 {amount} $LUNAR
      </span>
    </Badge>
  );
}

/**
 * Level badge with glow.
 */
export function LevelBadge({ level }: { level: number | string }) {
  return (
    <Badge>
      <span style={{ display: "flex" }}>Lv.{level}</span>
    </Badge>
  );
}
