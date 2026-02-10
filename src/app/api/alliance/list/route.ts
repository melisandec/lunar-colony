import { NextResponse } from "next/server";
import prisma from "@/lib/database";

/**
 * GET /api/alliance/list
 * Returns all open alliances that players can join.
 */
export async function GET() {
  const alliances = await prisma.alliance.findMany({
    where: { deletedAt: null },
    orderBy: { memberCount: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      description: true,
      level: true,
      memberCount: true,
      maxMembers: true,
    },
  });

  return NextResponse.json({
    alliances: alliances.map((a) => ({
      ...a,
    })),
  });
}
