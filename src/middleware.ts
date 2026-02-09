import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Farcaster Frame request validation and cron protection.
 *
 * - Frame POST requests to /api/frames are validated for Farcaster signatures
 * - Cron endpoints require a secret token
 * - All other requests pass through
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
      const headers = new Headers(request.headers);
      headers.set("x-frame-validated", "pending");

      return NextResponse.next({
        request: { headers },
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/frames/:path*", "/api/cron/:path*"],
};
