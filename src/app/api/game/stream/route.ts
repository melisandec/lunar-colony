import { NextRequest } from "next/server";

/**
 * SSE endpoint for real-time game state updates.
 *
 * Clients subscribe to receive:
 * - production tick notifications
 * - market price updates
 * - event start/end alerts
 *
 * GET /api/game/stream?fid=<playerId>
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", fid })}\n\n`,
        ),
      );

      // Send periodic updates (every 15s for market, 5min for production)
      let tick = 0;
      intervalId = setInterval(() => {
        tick++;
        try {
          const event = {
            type: tick % 20 === 0 ? "production_tick" : "heartbeat",
            timestamp: new Date().toISOString(),
            tick,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          // Client disconnected
          clearInterval(intervalId);
        }
      }, 15_000);
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
