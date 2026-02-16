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
import { GameMetrics } from "@/lib/metrics";
import {
  validateFid,
  validateAllianceInput,
  isValidModuleType,
  isValidTier,
  validateTradeInput,
} from "@/lib/validation";
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
    const fid = validateFid(fidStr);
    if (fid === null) {
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
        if (!moduleType || !isValidModuleType(moduleType)) {
          return NextResponse.json(
            { error: "Valid moduleType required" },
            { status: 400 },
          );
        }
        const validatedTier = isValidTier(tier) ? tier : "COMMON";
        const result = await buildModule(
          player.id,
          moduleType as ModuleType,
          validatedTier,
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

        const coordX = Number(x);
        const coordY = Number(y);
        if (
          !Number.isInteger(coordX) ||
          !Number.isInteger(coordY) ||
          coordX < 0 ||
          coordX > 9 ||
          coordY < 0 ||
          coordY > 9
        ) {
          return NextResponse.json(
            { error: "x and y must be integers 0-9" },
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
          data: { coordinates: { x: coordX, y: coordY } },
        });

        return NextResponse.json({
          success: true,
          moduleId,
          x: coordX,
          y: coordY,
        });
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
        const { resource, side, quantity } = body;
        if (!resource || !side || quantity === undefined) {
          return NextResponse.json(
            { error: "resource, side, quantity required" },
            { status: 400 },
          );
        }

        // Validate via trade input helper (accepts object format)
        const inputStr = `${side} ${quantity} ${resource}`;
        const validated = validateTradeInput(inputStr);
        if (!validated) {
          return NextResponse.json(
            {
              error:
                "Invalid trade: use buy/sell, quantity 1-100000, valid resource",
            },
            { status: 400 },
          );
        }

        const marketEngine = (await import("@/lib/market-engine")).default;
        const result = await marketEngine.executeTrade(
          player.id,
          validated.resource,
          validated.side,
          validated.quantity,
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
        const validated = validateAllianceInput(body);
        if (!validated) {
          return NextResponse.json(
            {
              error:
                "Alliance name required: 2-30 chars, letters, numbers, spaces, hyphens",
            },
            { status: 400 },
          );
        }
        const createResult = await createAlliance(
          player.id,
          validated.name,
          validated.description,
        );
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
    GameMetrics.trackError(error, {
      route: "/api/dashboard/[fid]/action",
      context: "dashboard_action",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
