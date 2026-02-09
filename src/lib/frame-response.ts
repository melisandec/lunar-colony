/**
 * Frame Response Builder
 *
 * Constructs Farcaster Frame-compliant HTML responses with proper
 * meta tags, button configuration, and image URLs.
 *
 * All Frame state is encoded in the postUrl query params —
 * no cookies or external session store needed.
 */

import { absoluteUrl, FRAME_IMAGE } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Screen =
  | "home"
  | "colony"
  | "market"
  | "alliance"
  | "build"
  | "result";

export interface FrameButton {
  label: string;
  action: "post" | "post_redirect" | "link" | "mint";
  target?: string;
}

export interface FrameResponse {
  /** Absolute image URL (generated via /api/frames/image route) */
  imageUrl: string;
  /** Up to 4 context-aware buttons */
  buttons: FrameButton[];
  /** POST endpoint for the next interaction */
  postUrl: string;
  /** Optional text input placeholder */
  inputText?: string;
  /** Screen identifier (encoded in postUrl for state tracking) */
  screen: Screen;
  /** Alt text describing the image content for accessibility */
  imageAlt?: string;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build the FrameResponse for a given screen + player context.
 */
export function buildFrameResponse(opts: {
  screen: Screen;
  fid: number;
  /** Extra query params forwarded to the image endpoint */
  imageParams?: Record<string, string | number>;
  /** Override default buttons for this screen */
  buttons?: FrameButton[];
  /** Override post target */
  postTarget?: string;
  /** Optional text-input placeholder */
  inputText?: string;
  /** Alt text for the image — auto-generated if not provided */
  imageAlt?: string;
}): FrameResponse {
  const {
    screen,
    fid,
    imageParams = {},
    buttons,
    postTarget,
    inputText,
    imageAlt,
  } = opts;

  // Image URL — points at the dynamic OG image endpoint
  const imgQuery = new URLSearchParams({
    screen,
    fid: String(fid),
    ...Object.fromEntries(
      Object.entries(imageParams).map(([k, v]) => [k, String(v)]),
    ),
  }).toString();

  const imageUrl = absoluteUrl(`/api/frames/image?${imgQuery}`);

  // Post URL — encodes current screen so the handler knows context
  const postUrl = absoluteUrl(
    postTarget ?? `/api/frames?screen=${screen}&fid=${fid}`,
  );

  // Default button layouts per screen
  const defaultButtons = getDefaultButtons(screen);

  return {
    imageUrl,
    buttons: buttons ?? defaultButtons,
    postUrl,
    inputText,
    screen,
    imageAlt: imageAlt ?? getDefaultImageAlt(screen),
  };
}

// ---------------------------------------------------------------------------
// Default button presets
// ---------------------------------------------------------------------------

function getDefaultButtons(screen: Screen): FrameButton[] {
  switch (screen) {
    case "home":
      return [
        { label: "⚡ Produce", action: "post" },
        { label: "🏗️ Colony", action: "post" },
        { label: "📈 Market", action: "post" },
        { label: "🤝 Alliance", action: "post" },
      ];

    case "colony":
      return [
        { label: "⚡ Produce", action: "post" },
        { label: "🔨 Build", action: "post" },
        { label: "📋 Modules", action: "post" },
        { label: "🏠 Home", action: "post" },
      ];

    case "build":
      return [
        { label: "⚡ Solar Panel", action: "post" },
        { label: "⛏️ Mining Rig", action: "post" },
        { label: "🏠 Habitat", action: "post" },
        { label: "🔙 Back", action: "post" },
      ];

    case "market":
      return [
        { label: "💰 Sell LUNAR", action: "post" },
        { label: "⛏️ Sell Regolith", action: "post" },
        { label: "📊 Prices", action: "post" },
        { label: "🏠 Home", action: "post" },
      ];

    case "alliance":
      return [
        { label: "👥 Members", action: "post" },
        { label: "💎 Contribute", action: "post" },
        { label: "🏆 Rankings", action: "post" },
        { label: "🏠 Home", action: "post" },
      ];

    case "result":
      return [
        { label: "🔨 Build More", action: "post" },
        { label: "🏠 Home", action: "post" },
      ];

    default:
      return [{ label: "🏠 Home", action: "post" }];
  }
}

// ---------------------------------------------------------------------------
// Default image alt text per screen
// ---------------------------------------------------------------------------

function getDefaultImageAlt(screen: Screen): string {
  switch (screen) {
    case "home":
      return "Lunar Colony Tycoon dashboard showing colony balance, production rate, and action buttons for produce, colony, market, and alliance.";
    case "colony":
      return "Colony overview showing module grid, active modules, production statistics, and build options.";
    case "build":
      return "Build menu showing available module types: Solar Panel, Mining Rig, Habitat, with costs and descriptions.";
    case "market":
      return "Market terminal showing current resource prices, trade options for LUNAR and Regolith.";
    case "alliance":
      return "Alliance panel showing member list, contribution totals, and ranking information.";
    case "result":
      return "Action result showing the outcome of your last operation with updated colony statistics.";
    default:
      return "Lunar Colony Tycoon game frame.";
  }
}

// ---------------------------------------------------------------------------
// HTML serializer
// ---------------------------------------------------------------------------

/**
 * Render a FrameResponse as Farcaster-compliant HTML (meta tags).
 */
export function frameResponseToHtml(response: FrameResponse): string {
  const tags: string[] = [
    `<meta property="fc:frame" content="vNext" />`,
    `<meta property="fc:frame:image" content="${response.imageUrl}" />`,
    `<meta property="fc:frame:image:aspect_ratio" content="${FRAME_IMAGE.ASPECT_RATIO}" />`,
    `<meta property="fc:frame:post_url" content="${response.postUrl}" />`,
    `<meta property="og:image" content="${response.imageUrl}" />`,
    `<meta property="og:image:alt" content="${(response.imageAlt ?? "Lunar Colony Tycoon game frame").replace(/"/g, "&quot;")}" />`,
  ];

  if (response.inputText) {
    tags.push(
      `<meta property="fc:frame:input:text" content="${response.inputText}" />`,
    );
  }

  response.buttons.slice(0, 4).forEach((btn, i) => {
    const idx = i + 1;
    tags.push(
      `<meta property="fc:frame:button:${idx}" content="${btn.label}" />`,
    );
    tags.push(
      `<meta property="fc:frame:button:${idx}:action" content="${btn.action}" />`,
    );
    if (btn.target) {
      tags.push(
        `<meta property="fc:frame:button:${idx}:target" content="${btn.target}" />`,
      );
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Lunar Colony Tycoon</title>
    ${tags.join("\n    ")}
  </head>
  <body>
    <h1>Lunar Colony Tycoon</h1>
    <p>${(response.imageAlt ?? "Lunar Colony Tycoon game frame").replace(/</g, "&lt;")}</p>
    <noscript>
      <p>This is a Farcaster Frame game. Open in a Frame-compatible client to play.</p>
    </noscript>
  </body>
</html>`;
}
