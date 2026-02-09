import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreatePlayer,
  collectEarnings,
  buildModule,
} from "@/lib/game-engine";
import prisma from "@/lib/database";
import type { ModuleType } from "@/lib/utils";

/**
 * POST /api/dashboard/[fid]/action
 * Handles dashboard actions: collect, build, reposition, trade.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ fid: string }> },
) {
  try {
    const { fid: fidStr } = await params;
    const fid = parseInt(fidStr, 10);
    if (isNaN(fid) || fid <= 0) {
      return NextResponse.json({ error: "Invalid FID" }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;
    const player = await getOrCreatePlayer(fid);

    switch (action) {
      case "collect": {
        const result = await collectEarnings(player.id);
        return NextResponse.json(result);
      }

      case "build": {
        const { moduleType } = body;
        if (!moduleType) {
          return NextResponse.json(
            { error: "moduleType required" },
            { status: 400 },
          );
        }
        const result = await buildModule(player.id, moduleType as ModuleType);
        return NextResponse.json(result);
      }

      case "reposition": {
        const { moduleId, x, y } = body;
        if (!moduleId || x === undefined || y === undefined) {
          return NextResponse.json(
            { error: "moduleId, x, y required" },
            { status: 400 },
          );
        }

        const mod = await prisma.module.findFirst({
          where: { id: moduleId, playerId: player.id, deletedAt: null },
        });
        if (!mod) {
          return NextResponse.json(
            { error: "Module not found" },
            { status: 404 },
          );
        }

        await prisma.module.update({
          where: { id: moduleId },
          data: { coordinates: { x, y } },
        });

        return NextResponse.json({ success: true, moduleId, x, y });
      }

      case "trade": {
        const marketEngine = (await import("@/lib/market-engine")).default;
        const result = await marketEngine.executeTrade(
          player.id,
          body.resource,
          body.side,
          body.quantity,
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Dashboard action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
