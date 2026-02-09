import { PrismaClient } from "@prisma/client";

/**
 * Seed script for development data.
 * Run with: npx prisma db seed
 */

const prisma = new PrismaClient();

async function main() {
  console.log("🌙 Seeding Lunar Colony Tycoon database...\n");

  // --- Create test players with colonies ---
  const players = [
    {
      fid: 1,
      username: "alice_lunar",
      lunarBalance: 5000,
      totalEarned: 15000,
      colony: {
        name: "Tranquility Base",
        level: 3,
        modules: [
          {
            type: "solar_panel",
            level: 2,
            position: 0,
            productionRate: 20,
            isActive: true,
          },
          {
            type: "mining_rig",
            level: 1,
            position: 1,
            productionRate: 25,
            isActive: true,
          },
          {
            type: "habitat",
            level: 1,
            position: 2,
            productionRate: 5,
            isActive: true,
          },
          {
            type: "water_extractor",
            level: 1,
            position: 3,
            productionRate: 20,
            isActive: true,
          },
        ],
      },
    },
    {
      fid: 2,
      username: "bob_moon",
      lunarBalance: 2500,
      totalEarned: 8000,
      colony: {
        name: "Copernicus Outpost",
        level: 2,
        modules: [
          {
            type: "solar_panel",
            level: 1,
            position: 0,
            productionRate: 10,
            isActive: true,
          },
          {
            type: "mining_rig",
            level: 1,
            position: 1,
            productionRate: 25,
            isActive: true,
          },
        ],
      },
    },
    {
      fid: 3,
      username: "charlie_space",
      lunarBalance: 800,
      totalEarned: 1200,
      colony: {
        name: "Tycho Station",
        level: 1,
        modules: [
          {
            type: "solar_panel",
            level: 1,
            position: 0,
            productionRate: 10,
            isActive: true,
          },
        ],
      },
    },
  ];

  for (const p of players) {
    const player = await prisma.player.upsert({
      where: { fid: p.fid },
      update: {},
      create: {
        fid: p.fid,
        username: p.username,
        lunarBalance: p.lunarBalance,
        totalEarned: p.totalEarned,
        colony: {
          create: {
            name: p.colony.name,
            level: p.colony.level,
            modules: {
              create: p.colony.modules,
            },
          },
        },
      },
    });
    console.log(`  ✅ Player: ${player.username} (FID: ${player.fid})`);
  }

  // --- Create leaderboard entries ---
  const leaderboardData = [
    {
      fid: 1,
      username: "alice_lunar",
      lunarBalance: 5000,
      totalEarned: 15000,
      moduleCount: 4,
      colonyLevel: 3,
      rank: 1,
      period: "alltime",
    },
    {
      fid: 2,
      username: "bob_moon",
      lunarBalance: 2500,
      totalEarned: 8000,
      moduleCount: 2,
      colonyLevel: 2,
      rank: 2,
      period: "alltime",
    },
    {
      fid: 3,
      username: "charlie_space",
      lunarBalance: 800,
      totalEarned: 1200,
      moduleCount: 1,
      colonyLevel: 1,
      rank: 3,
      period: "alltime",
    },
  ];

  for (const entry of leaderboardData) {
    await prisma.leaderboardEntry.upsert({
      where: {
        fid_period: { fid: entry.fid, period: entry.period },
      },
      update: entry,
      create: entry,
    });
  }
  console.log(`  ✅ Leaderboard: ${leaderboardData.length} entries`);

  // --- Create sample game events ---
  const events = [
    { type: "build", playerId: "", data: { module: "solar_panel", cost: 100 } },
    { type: "collect", playerId: "", data: { amount: 250 } },
    { type: "build", playerId: "", data: { module: "mining_rig", cost: 250 } },
  ];

  // Get alice's player ID for events
  const alice = await prisma.player.findUnique({ where: { fid: 1 } });
  if (alice) {
    for (const event of events) {
      await prisma.gameEvent.create({
        data: { ...event, playerId: alice.id },
      });
    }
    console.log(`  ✅ Game events: ${events.length} events`);
  }

  console.log("\n🚀 Seed complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
