/**
 * Shared utilities for Lunar Colony Tycoon
 */

// --- Frame Helpers ---

/** Frame image dimensions (1.91:1 ratio) */
export const FRAME_IMAGE = {
  WIDTH: 955,
  HEIGHT: 500,
  ASPECT_RATIO: "1.91:1" as const,
} as const;

/** Build a full URL from a relative path */
export function absoluteUrl(path: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Generate Frame HTML meta tags for a response.
 */
export function frameMetaTags(options: {
  imageUrl: string;
  postUrl: string;
  buttons?: Array<{
    label: string;
    action?: "post" | "post_redirect" | "link" | "mint";
    target?: string;
  }>;
  inputText?: string;
}): string {
  const tags: string[] = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${options.imageUrl}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="${FRAME_IMAGE.ASPECT_RATIO}" />`,
    `<meta property="fc:frame:post_url" content="${options.postUrl}" />`,
  ];

  if (options.inputText) {
    tags.push(
      `<meta property="fc:frame:input:text" content="${options.inputText}" />`,
    );
  }

  options.buttons?.forEach((btn, i) => {
    tags.push(
      `<meta property="fc:frame:button:${i + 1}" content="${btn.label}" />`,
    );
    if (btn.action) {
      tags.push(
        `<meta property="fc:frame:button:${i + 1}:action" content="${btn.action}" />`,
      );
    }
    if (btn.target) {
      tags.push(
        `<meta property="fc:frame:button:${i + 1}:target" content="${btn.target}" />`,
      );
    }
  });

  return tags.join("\n    ");
}

/**
 * Build a Frame HTML response (used by route handlers).
 */
export function frameHtmlResponse(
  options: Parameters<typeof frameMetaTags>[0],
): string {
  return `<!DOCTYPE html>
<html>
  <head>
    ${frameMetaTags(options)}
  </head>
  <body>Lunar Colony Tycoon</body>
</html>`;
}

// --- Game Constants ---

export const GAME_CONSTANTS = {
  /** Max modules per colony */
  MAX_MODULES: 20,
  /** Base $LUNAR production per tick */
  BASE_PRODUCTION_RATE: 10,
  /** Tick interval in milliseconds (5 minutes) */
  TICK_INTERVAL_MS: 5 * 60 * 1000,
  /** Cost multiplier for each new module */
  MODULE_COST_MULTIPLIER: 1.15,
  /** Starting $LUNAR for new players */
  STARTING_LUNAR: 500,
  /** Module types available */
  MODULE_TYPES: [
    "solar_panel",
    "mining_rig",
    "habitat",
    "research_lab",
    "water_extractor",
    "oxygen_generator",
    "storage_depot",
    "launch_pad",
  ] as const,
} as const;

export type ModuleType = (typeof GAME_CONSTANTS.MODULE_TYPES)[number];

// --- Formatting ---

/** Format large numbers for display (e.g., 1.5K, 2.3M) */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/** Format $LUNAR amount for display */
export function formatLunar(amount: number): string {
  return `${formatNumber(amount)} $LUNAR`;
}

// --- Time ---

/** Get seconds until next game tick */
export function secondsUntilNextTick(): number {
  const now = Date.now();
  return Math.ceil(
    (GAME_CONSTANTS.TICK_INTERVAL_MS -
      (now % GAME_CONSTANTS.TICK_INTERVAL_MS)) /
      1000,
  );
}
