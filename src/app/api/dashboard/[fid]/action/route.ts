import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreatePlayer,
  collectEarnings,
  buildModule,
  upgradeModule,
  recruitCrew,
  assignCrew,
  toggleModule,
  repairModule,
  demolishModule,
  claimDailyReward,
  createAlliance,
  joinAlliance,
  leaveAlliance,
  createPriceAlert,
  getPlayerAlerts,
  markAlertRead,
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
        const { moduleType, tier } = body;
        if (!moduleType) {
          return NextResponse.json(
            { error: "moduleType required" },
            { status: 400 },
          );
        }
        const result = await buildModule(
          player.id,
          moduleType as ModuleType,
          tier ?? "COMMON",
        );
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

      case "upgrade": {
        const { moduleId } = body;
        if (!moduleId) {
          return NextResponse.json(
            { error: "moduleId required" },
            { status: 400 },
          );
        }
        const upgradeResult = await upgradeModule(player.id, moduleId);
        if (!upgradeResult.success) {
          return NextResponse.json(
            { error: upgradeResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(upgradeResult);
      }

      case "assign": {
        const { crewId, moduleId: targetModuleId } = body;
        if (!crewId) {
          return NextResponse.json(
            { error: "crewId required" },
            { status: 400 },
          );
        }
        const assignResult = await assignCrew(
          player.id,
          crewId,
          targetModuleId ?? null,
        );
        if (!assignResult.success) {
          return NextResponse.json(
            { error: assignResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(assignResult);
      }

      case "recruit": {
        const recruitResult = await recruitCrew(player.id);
        if (!recruitResult.success) {
          return NextResponse.json(
            { error: recruitResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(recruitResult);
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

      case "toggle": {
        const { moduleId } = body;
        if (!moduleId) {
          return NextResponse.json(
            { error: "moduleId required" },
            { status: 400 },
          );
        }
        const toggleResult = await toggleModule(player.id, moduleId);
        if (!toggleResult.success) {
          return NextResponse.json(
            { error: toggleResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(toggleResult);
      }

      case "repair": {
        const { moduleId } = body;
        if (!moduleId) {
          return NextResponse.json(
            { error: "moduleId required" },
            { status: 400 },
          );
        }
        const repairResult = await repairModule(player.id, moduleId);
        if (!repairResult.success) {
          return NextResponse.json(
            { error: repairResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(repairResult);
      }

      case "demolish": {
        const { moduleId } = body;
        if (!moduleId) {
          return NextResponse.json(
            { error: "moduleId required" },
            { status: 400 },
          );
        }
        const demolishResult = await demolishModule(player.id, moduleId);
        if (!demolishResult.success) {
          return NextResponse.json(
            { error: demolishResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(demolishResult);
      }

      case "daily-reward": {
        const dailyResult = await claimDailyReward(player.id);
        if (!dailyResult.success) {
          return NextResponse.json(
            { error: dailyResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(dailyResult);
      }

      case "create-alliance": {
        const { name, description } = body;
        if (!name) {
          return NextResponse.json(
            { error: "Alliance name required" },
            { status: 400 },
          );
        }
        const createResult = await createAlliance(player.id, name, description);
        if (!createResult.success) {
          return NextResponse.json(
            { error: createResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(createResult);
      }

      case "join-alliance": {
        const { allianceId } = body;
        if (!allianceId) {
          return NextResponse.json(
            { error: "allianceId required" },
            { status: 400 },
          );
        }
        const joinResult = await joinAlliance(player.id, allianceId);
        if (!joinResult.success) {
          return NextResponse.json(
            { error: joinResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(joinResult);
      }

      case "leave-alliance": {
        const leaveResult = await leaveAlliance(player.id);
        if (!leaveResult.success) {
          return NextResponse.json(
            { error: leaveResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(leaveResult);
      }

      case "create-alert": {
        const { resource, targetPrice, direction } = body;
        if (!resource || !targetPrice || !direction) {
          return NextResponse.json(
            { error: "resource, targetPrice, direction required" },
            { status: 400 },
          );
        }
        const alertResult = await createPriceAlert(
          player.id,
          resource,
          targetPrice,
          direction,
        );
        if (!alertResult.success) {
          return NextResponse.json(
            { error: alertResult.error },
            { status: 400 },
          );
        }
        return NextResponse.json(alertResult);
      }

      case "get-alerts": {
        const alerts = await getPlayerAlerts(player.id);
        return NextResponse.json({ alerts });
      }

      case "mark-alert-read": {
        const { alertId } = body;
        if (!alertId) {
          return NextResponse.json(
            { error: "alertId required" },
            { status: 400 },
          );
        }
        const markResult = await markAlertRead(player.id, alertId);
        return NextResponse.json(markResult);
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
