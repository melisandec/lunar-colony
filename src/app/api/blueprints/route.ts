import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database";

/**
 * GET /api/blueprints?playerLevel=1
 * Returns all module blueprints, filtered by player level.
 */
export async function GET(req: NextRequest) {
  const playerLevel = parseInt(
    req.nextUrl.searchParams.get("playerLevel") ?? "1",
    10,
  );

  const blueprints = await prisma.moduleBlueprint.findMany({
    orderBy: [{ type: "asc" }, { unlockLevel: "asc" }],
    select: {
      id: true,
      type: true,
      tier: true,
      name: true,
      description: true,
      baseOutput: true,
      baseCost: true,
      upgradeCost: true,
      maxLevel: true,
      unlockLevel: true,
    },
  });

  const result = blueprints.map((bp) => ({
    ...bp,
    baseOutput: Number(bp.baseOutput),
    baseCost: Number(bp.baseCost),
    upgradeCost: Number(bp.upgradeCost),
    unlocked: playerLevel >= bp.unlockLevel,
  }));

  return NextResponse.json({ blueprints: result });
}
