import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database";

/**
 * GET /api/alliance?fid=123
 * Returns the player's current alliance (if any) with members.
 */
export async function GET(req: NextRequest) {
  const fid = req.nextUrl.searchParams.get("fid");
  if (!fid) {
    return NextResponse.json({ error: "fid required" }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { fid: parseInt(fid, 10) },
    include: {
      allianceMember: {
        include: {
          alliance: {
            include: {
              members: {
                include: {
                  player: {
                    select: {
                      username: true,
                      level: true,
                      totalEarnings: true,
                    },
                  },
                },
                orderBy: { joinedAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!player || !player.allianceMember) {
    return NextResponse.json(null, { status: 404 });
  }

  const alliance = player.allianceMember.alliance;

  return NextResponse.json({
    id: alliance.id,
    name: alliance.name,
    description: alliance.description,
    level: alliance.level,
    totalLunar: Number(alliance.totalLunar),
    memberCount: alliance.memberCount,
    maxMembers: alliance.maxMembers,
    members: alliance.members.map((m) => ({
      id: m.id,
      playerId: m.playerId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      player: {
        username: m.player.username,
        level: m.player.level,
        totalEarnings: Number(m.player.totalEarnings),
      },
    })),
  });
}
