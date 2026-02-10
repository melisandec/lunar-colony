import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Mobile UA patterns for server-side detection
const MOBILE_UA = /iPhone|iPod|Android.*Mobile|Warpcast|Farcaster/i;

/**
 * Middleware for Farcaster Frame request validation, cron protection,
 * and mobile device detection.
 *
 * - Sets x-device-type header based on User-Agent
 * - Frame POST requests to /api/frames are validated for Farcaster signatures
 * - Cron endpoints require a secret token
 * - All other requests pass through
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get("user-agent") || "";
  const isMobile = MOBILE_UA.test(ua);

  // --- Add device detection header for downstream use ---
  const headers = new Headers(request.headers);
  headers.set("x-device-type", isMobile ? "mobile" : "desktop");

  // --- Protect cron endpoints ---
  if (pathname.startsWith("/api/cron")) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // --- Validate Farcaster Frame POST requests ---
  if (pathname.startsWith("/api/frames") && request.method === "POST") {
    try {
      // Clone the request to read the body without consuming it
      const body = await request.clone().json();

      // Basic structural validation of Frame message
      if (!body.trustedData?.messageBytes) {
        return NextResponse.json(
          { error: "Invalid Frame message: missing trustedData" },
          { status: 400 },
        );
      }

      // In production, validate the message signature via Neynar
      // For now, we pass through and validate in the route handler
      // where we have access to the Neynar client

      // Attach the parsed body for downstream handlers
      const frameHeaders = new Headers(request.headers);
      frameHeaders.set("x-frame-validated", "pending");
      frameHeaders.set("x-device-type", isMobile ? "mobile" : "desktop");

      return NextResponse.next({
        request: { headers: frameHeaders },
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
  }

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: ["/api/frames/:path*", "/api/cron/:path*", "/dashboard/:path*", "/"],
};
