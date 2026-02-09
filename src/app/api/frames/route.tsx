import { NextRequest, NextResponse } from "next/server";
import { neynar } from "@/lib/api-clients/neynar";
import { GameState } from "@/lib/game-state";
import {
  buildFrameResponse,
  frameResponseToHtml,
  type Screen,
} from "@/lib/frame-response";
import { absoluteUrl } from "@/lib/utils";

// ---------------------------------------------------------------------------
// In-memory validation cache (5-minute TTL, ~1 000 entries max)
// Saves Neynar free-tier quota (1k req/day)
// ---------------------------------------------------------------------------

interface CachedValidation {
  fid: number;
  buttonIndex: number;
  inputText?: string;
  expiresAt: number;
}

const validationCache = new Map<string, CachedValidation>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

function getCachedValidation(messageBytes: string): CachedValidation | null {
  const entry = validationCache.get(messageBytes);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    validationCache.delete(messageBytes);
    return null;
  }
  return entry;
}

function setCachedValidation(messageBytes: string, data: CachedValidation) {
  // Evict oldest entries if cache is full
  if (validationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = validationCache.keys().next().value;
    if (firstKey) validationCache.delete(firstKey);
  }
  validationCache.set(messageBytes, {
    ...data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ---------------------------------------------------------------------------
// Validate incoming frame message
// ---------------------------------------------------------------------------

async function validateFrameMessage(body: Record<string, unknown>): Promise<{
  fid: number;
  buttonIndex: number;
  inputText?: string;
}> {
  const trustedData = body.trustedData as { messageBytes?: string } | undefined;
  const untrustedData = body.untrustedData as
    | {
        fid?: number;
        buttonIndex?: number;
        inputText?: string;
      }
    | undefined;

  // --- Production: verify with Neynar (cached) ---
  if (process.env.NODE_ENV === "production" && trustedData?.messageBytes) {
    const cached = getCachedValidation(trustedData.messageBytes);
    if (cached) {
      return {
        fid: cached.fid,
        buttonIndex: cached.buttonIndex,
        inputText: cached.inputText,
      };
    }

    const result = await neynar.validateFrameMessage(trustedData.messageBytes);
    if (!result.valid) {
      throw new Error("INVALID_SIGNATURE");
    }

    const validated = {
      fid: result.action.fid,
      buttonIndex: result.action.buttonIndex,
      inputText: result.action.inputText,
    };

    setCachedValidation(trustedData.messageBytes, {
      ...validated,
      expiresAt: 0, // will be set by setCachedValidation
    });

    return validated;
  }

  // --- Development: trust untrusted data ---
  return {
    fid: untrustedData?.fid ?? 1,
    buttonIndex: untrustedData?.buttonIndex ?? 1,
    inputText: untrustedData?.inputText,
  };
}

// ---------------------------------------------------------------------------
// GET /api/frames — initial Frame landing page
// ---------------------------------------------------------------------------

export async function GET() {
  const response = buildFrameResponse({
    screen: "home",
    fid: 0,
    imageParams: { screen: "landing" }, // Override to show landing image
    buttons: [
      { label: "⚡ Produce", action: "post" },
      { label: "🏗️ Colony", action: "post" },
      { label: "📈 Market", action: "post" },
      { label: "🤝 Alliance", action: "post" },
    ],
  });

  // Override image to landing
  response.imageUrl = absoluteUrl("/api/frames/image?screen=landing");

  const html = frameResponseToHtml(response);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// ---------------------------------------------------------------------------
// POST /api/frames — main Frame interaction handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate
    const body = await req.json();
    let validated: { fid: number; buttonIndex: number; inputText?: string };

    try {
      validated = await validateFrameMessage(body);
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_SIGNATURE") {
        return NextResponse.json(
          { error: "Invalid Frame message" },
          { status: 401 },
        );
      }
      // Rate limited — return a friendly Frame response
      return friendlyErrorFrame("Rate limited — try again in a moment");
    }

    const { fid, buttonIndex, inputText } = validated;

    // 2. Determine current screen from postUrl query params
    const url = new URL(req.url);
    const currentScreen = (url.searchParams.get("screen") ?? "home") as Screen;

    // 3. Load or create player state (first interaction = auto-create)
    const gameState = await GameState.load(fid);

    // 4. Dispatch action through state machine
    const frameResponse = await gameState.handleAction({
      fid,
      buttonIndex,
      inputText,
      currentScreen,
    });

    // 5. Serialize and return
    const html = frameResponseToHtml(frameResponse);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    console.error("Frame POST error:", error);
    return friendlyErrorFrame("Something went wrong — tap to retry");
  }
}

// ---------------------------------------------------------------------------
// Error fallback — returns a valid Frame so the user isn't stuck
// ---------------------------------------------------------------------------

function friendlyErrorFrame(message: string): NextResponse {
  const response = buildFrameResponse({
    screen: "home",
    fid: 0,
    imageParams: { screen: "landing", error: message },
    buttons: [{ label: "🔄 Retry", action: "post" }],
  });

  const html = frameResponseToHtml(response);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
