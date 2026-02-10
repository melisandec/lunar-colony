import { NextRequest } from "next/server";
import prisma from "@/lib/database";

/**
 * GET /api/events/stream?fid=123
 * Server-Sent Events stream for real-time game updates.
 * Pushes: game events, price changes, achievement notifications.
 */
export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  if (!fid) {
    return new Response("fid required", { status: 400 });
  }

  const fidNum = parseInt(fid, 10);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      // Send initial connection event
      send("connected", { fid: fidNum, timestamp: new Date().toISOString() });

      // Poll for new events every 5 seconds
      let lastEventTime = new Date();

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          // Fetch player
          const player = await prisma.player.findUnique({
            where: { fid: fidNum },
            select: { id: true },
          });

          if (!player) return;

          // Get recent game events since last check
          const newEvents = await prisma.gameEvent.findMany({
            where: {
              playerId: player.id,
              createdAt: { gt: lastEventTime },
            },
            orderBy: { createdAt: "asc" },
            take: 10,
          });

          for (const event of newEvents) {
            send("game-event", {
              type: event.type,
              data: event.data,
              createdAt: event.createdAt.toISOString(),
            });
          }

          // Get global active events
          const activeEvents = await prisma.activeEvent.findMany({
            where: {
              status: "ACTIVE",
              endTime: { gt: new Date() },
            },
            select: {
              id: true,
              type: true,
              name: true,
              icon: true,
              endTime: true,
            },
          });

          if (activeEvents.length > 0) {
            send("active-events", { events: activeEvents });
          }

          // Get price changes
          const prices = await prisma.resourcePrice.findMany({
            select: {
              type: true,
              currentPrice: true,
              priceChange24h: true,
            },
          });
          send("prices", {
            prices: prices.map((p) => ({
              type: p.type,
              currentPrice: Number(p.currentPrice),
              change24h: Number(p.priceChange24h),
            })),
          });

          if (newEvents.length > 0) {
            lastEventTime = newEvents[newEvents.length - 1]!.createdAt;
          }

          // Heartbeat
          send("heartbeat", { timestamp: new Date().toISOString() });
        } catch (err) {
          console.error("SSE poll error:", err);
        }
      }, 5000);

      // Cleanup on abort
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
