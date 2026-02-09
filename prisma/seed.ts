import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Comprehensive seed script for Lunar Colony Tycoon.
 *
 * Seeds:
 *   1. GameConfig — live-tunable balance values
 *   2. ResourcePrice — initial market prices for 5 resource types
 *   3. ModuleBlueprint — module definitions across all types × tiers
 *   4. Achievements — starter achievement definitions
 *   5. Test Players — 3 players with modules, resources, crew, & transactions
 *   6. LeaderboardSnapshot — initial ranking
 *
 * Run: npx prisma db seed
 */

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 1. Game Configuration
// ---------------------------------------------------------------------------

const gameConfigs: Prisma.GameConfigCreateInput[] = [
  // -- General --
  {
    key: "tick_interval_ms",
    value: 300000,
    category: "general",
    description: "Production tick interval (5 min)",
  },
  {
    key: "max_modules_per_player",
    value: 20,
    category: "general",
    description: "Max modules a player can build",
  },
  {
    key: "starting_lunar",
    value: 500,
    category: "general",
    description: "Starting $LUNAR for new players",
  },
  {
    key: "daily_reward_base",
    value: 50,
    category: "general",
    description: "Base daily login reward",
  },
  {
    key: "daily_streak_multiplier",
    value: 1.1,
    category: "general",
    description: "Multiplier per streak day",
  },
  {
    key: "max_daily_streak",
    value: 30,
    category: "general",
    description: "Max streak days (caps bonus)",
  },

  // -- Economy --
  {
    key: "module_cost_multiplier",
    value: 1.15,
    category: "economy",
    description: "Cost scaling per additional module",
  },
  {
    key: "upgrade_cost_multiplier",
    value: 1.5,
    category: "economy",
    description: "Cost scaling per level",
  },
  {
    key: "trade_fee_percent",
    value: 5,
    category: "economy",
    description: "Marketplace trade fee (%)",
  },
  {
    key: "price_volatility",
    value: 0.05,
    category: "economy",
    description: "Max price swing per tick (5%)",
  },
  {
    key: "diminishing_returns_start",
    value: 100,
    category: "economy",
    description: "Module age in cycles before efficiency drops",
  },
  {
    key: "diminishing_returns_rate",
    value: 0.1,
    category: "economy",
    description: "Efficiency loss % per cycle after threshold",
  },
  {
    key: "min_efficiency",
    value: 50,
    category: "economy",
    description: "Floor efficiency % (never lower)",
  },

  // -- Modules --
  {
    key: "module_base_efficiency",
    value: 100,
    category: "modules",
    description: "Starting efficiency for new modules",
  },
  {
    key: "max_module_level",
    value: 10,
    category: "modules",
    description: "Max level per module",
  },

  // -- Crew --
  {
    key: "max_crew_per_player",
    value: 5,
    category: "crew",
    description: "Max crew members",
  },
  {
    key: "crew_hire_cost",
    value: 200,
    category: "crew",
    description: "Base cost to hire crew",
  },
  {
    key: "crew_xp_per_cycle",
    value: 1,
    category: "crew",
    description: "XP gained per production cycle",
  },
  {
    key: "crew_specialty_bonus",
    value: 15,
    category: "crew",
    description: "% bonus when assigned to matching module",
  },

  // -- Alliance --
  {
    key: "alliance_create_cost",
    value: 1000,
    category: "alliance",
    description: "Cost to create an alliance",
  },
  {
    key: "alliance_max_members",
    value: 10,
    category: "alliance",
    description: "Default max members",
  },
  {
    key: "alliance_dividend_percent",
    value: 5,
    category: "alliance",
    description: "% of production to alliance treasury",
  },

  // -- XP / Leveling --
  {
    key: "xp_per_module_build",
    value: 50,
    category: "leveling",
    description: "XP for building a module",
  },
  {
    key: "xp_per_upgrade",
    value: 25,
    category: "leveling",
    description: "XP for upgrading a module",
  },
  {
    key: "xp_per_collection",
    value: 10,
    category: "leveling",
    description: "XP for collecting resources",
  },
  {
    key: "xp_level_formula",
    value: { base: 100, exponent: 1.5 },
    category: "leveling",
    description: "XP needed: base * level^exponent",
  },
];

// ---------------------------------------------------------------------------
// 2. Resource Prices
// ---------------------------------------------------------------------------

const resourcePrices: Prisma.ResourcePriceCreateInput[] = [
  {
    type: "LUNAR",
    basePrice: 1.0,
    currentPrice: 1.0,
    supply: 1000000,
    demand: 500000,
    volatility: 0.02,
    minPrice: 0.9,
    maxPrice: 1.1,
    seasonalPhase: 0,
  },
  {
    type: "REGOLITH",
    basePrice: 2.5,
    currentPrice: 2.5,
    supply: 800000,
    demand: 400000,
    volatility: 0.08,
    minPrice: 0.5,
    maxPrice: 10.0,
    seasonalPhase: 0,
  },
  {
    type: "WATER_ICE",
    basePrice: 8.75,
    currentPrice: 8.75,
    supply: 200000,
    demand: 300000,
    volatility: 0.12,
    minPrice: 2.0,
    maxPrice: 30.0,
    seasonalPhase: 0,
  },
  {
    type: "HELIUM3",
    basePrice: 45.0,
    currentPrice: 45.0,
    supply: 50000,
    demand: 80000,
    volatility: 0.18,
    minPrice: 10.0,
    maxPrice: 200.0,
    seasonalPhase: 0,
  },
  {
    type: "RARE_EARTH",
    basePrice: 120.0,
    currentPrice: 120.0,
    supply: 10000,
    demand: 15000,
    volatility: 0.25,
    minPrice: 30.0,
    maxPrice: 500.0,
    seasonalPhase: 0,
  },
];

// ---------------------------------------------------------------------------
// 3. Module Blueprints (type × tier matrix)
// ---------------------------------------------------------------------------

interface BlueprintDef {
  type: Prisma.ModuleBlueprintCreateInput["type"];
  name: string;
  description: string;
  tiers: {
    tier: Prisma.ModuleBlueprintCreateInput["tier"];
    baseOutput: number;
    baseCost: number;
    upgradeCost: number;
    maxLevel: number;
    unlockLevel: number;
  }[];
}

const blueprintDefs: BlueprintDef[] = [
  {
    type: "SOLAR_PANEL",
    name: "Solar Panel",
    description: "Generates energy from sunlight. Foundation of every colony.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 10,
        baseCost: 100,
        upgradeCost: 50,
        maxLevel: 10,
        unlockLevel: 1,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 18,
        baseCost: 250,
        upgradeCost: 125,
        maxLevel: 10,
        unlockLevel: 3,
      },
      {
        tier: "RARE",
        baseOutput: 30,
        baseCost: 600,
        upgradeCost: 300,
        maxLevel: 10,
        unlockLevel: 6,
      },
      {
        tier: "EPIC",
        baseOutput: 50,
        baseCost: 1500,
        upgradeCost: 750,
        maxLevel: 10,
        unlockLevel: 10,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 100,
        baseCost: 5000,
        upgradeCost: 2500,
        maxLevel: 10,
        unlockLevel: 15,
      },
    ],
  },
  {
    type: "MINING_RIG",
    name: "Mining Rig",
    description: "Extracts regolith and rare minerals from the lunar surface.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 25,
        baseCost: 250,
        upgradeCost: 125,
        maxLevel: 10,
        unlockLevel: 1,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 42,
        baseCost: 600,
        upgradeCost: 300,
        maxLevel: 10,
        unlockLevel: 3,
      },
      {
        tier: "RARE",
        baseOutput: 70,
        baseCost: 1400,
        upgradeCost: 700,
        maxLevel: 10,
        unlockLevel: 7,
      },
      {
        tier: "EPIC",
        baseOutput: 115,
        baseCost: 3500,
        upgradeCost: 1750,
        maxLevel: 10,
        unlockLevel: 12,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 200,
        baseCost: 10000,
        upgradeCost: 5000,
        maxLevel: 10,
        unlockLevel: 18,
      },
    ],
  },
  {
    type: "HABITAT",
    name: "Habitat",
    description: "Houses crew members. Increases colony capacity and morale.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 5,
        baseCost: 200,
        upgradeCost: 100,
        maxLevel: 10,
        unlockLevel: 1,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 10,
        baseCost: 500,
        upgradeCost: 250,
        maxLevel: 10,
        unlockLevel: 4,
      },
      {
        tier: "RARE",
        baseOutput: 18,
        baseCost: 1200,
        upgradeCost: 600,
        maxLevel: 10,
        unlockLevel: 8,
      },
      {
        tier: "EPIC",
        baseOutput: 30,
        baseCost: 3000,
        upgradeCost: 1500,
        maxLevel: 10,
        unlockLevel: 13,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 55,
        baseCost: 8000,
        upgradeCost: 4000,
        maxLevel: 10,
        unlockLevel: 19,
      },
    ],
  },
  {
    type: "RESEARCH_LAB",
    name: "Research Lab",
    description: "Conducts experiments. Boosts XP gain and unlocks tech.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 15,
        baseCost: 500,
        upgradeCost: 250,
        maxLevel: 10,
        unlockLevel: 2,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 28,
        baseCost: 1200,
        upgradeCost: 600,
        maxLevel: 10,
        unlockLevel: 5,
      },
      {
        tier: "RARE",
        baseOutput: 48,
        baseCost: 2800,
        upgradeCost: 1400,
        maxLevel: 10,
        unlockLevel: 9,
      },
      {
        tier: "EPIC",
        baseOutput: 80,
        baseCost: 7000,
        upgradeCost: 3500,
        maxLevel: 10,
        unlockLevel: 14,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 150,
        baseCost: 20000,
        upgradeCost: 10000,
        maxLevel: 10,
        unlockLevel: 20,
      },
    ],
  },
  {
    type: "WATER_EXTRACTOR",
    name: "Water Extractor",
    description: "Mines water-ice from permanently shadowed craters.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 20,
        baseCost: 300,
        upgradeCost: 150,
        maxLevel: 10,
        unlockLevel: 2,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 36,
        baseCost: 720,
        upgradeCost: 360,
        maxLevel: 10,
        unlockLevel: 4,
      },
      {
        tier: "RARE",
        baseOutput: 60,
        baseCost: 1700,
        upgradeCost: 850,
        maxLevel: 10,
        unlockLevel: 8,
      },
      {
        tier: "EPIC",
        baseOutput: 100,
        baseCost: 4200,
        upgradeCost: 2100,
        maxLevel: 10,
        unlockLevel: 13,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 180,
        baseCost: 12000,
        upgradeCost: 6000,
        maxLevel: 10,
        unlockLevel: 18,
      },
    ],
  },
  {
    type: "OXYGEN_GENERATOR",
    name: "Oxygen Generator",
    description: "Electrolysis of water-ice into breathable oxygen.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 18,
        baseCost: 350,
        upgradeCost: 175,
        maxLevel: 10,
        unlockLevel: 2,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 32,
        baseCost: 840,
        upgradeCost: 420,
        maxLevel: 10,
        unlockLevel: 5,
      },
      {
        tier: "RARE",
        baseOutput: 55,
        baseCost: 2000,
        upgradeCost: 1000,
        maxLevel: 10,
        unlockLevel: 9,
      },
      {
        tier: "EPIC",
        baseOutput: 90,
        baseCost: 5000,
        upgradeCost: 2500,
        maxLevel: 10,
        unlockLevel: 14,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 160,
        baseCost: 14000,
        upgradeCost: 7000,
        maxLevel: 10,
        unlockLevel: 19,
      },
    ],
  },
  {
    type: "STORAGE_DEPOT",
    name: "Storage Depot",
    description: "Stores resources. Increases max capacity and trade volume.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 8,
        baseCost: 150,
        upgradeCost: 75,
        maxLevel: 10,
        unlockLevel: 1,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 15,
        baseCost: 360,
        upgradeCost: 180,
        maxLevel: 10,
        unlockLevel: 3,
      },
      {
        tier: "RARE",
        baseOutput: 25,
        baseCost: 850,
        upgradeCost: 425,
        maxLevel: 10,
        unlockLevel: 7,
      },
      {
        tier: "EPIC",
        baseOutput: 42,
        baseCost: 2100,
        upgradeCost: 1050,
        maxLevel: 10,
        unlockLevel: 11,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 75,
        baseCost: 6000,
        upgradeCost: 3000,
        maxLevel: 10,
        unlockLevel: 16,
      },
    ],
  },
  {
    type: "LAUNCH_PAD",
    name: "Launch Pad",
    description: "Enables trade routes. Highest output, highest cost.",
    tiers: [
      {
        tier: "COMMON",
        baseOutput: 50,
        baseCost: 1000,
        upgradeCost: 500,
        maxLevel: 10,
        unlockLevel: 5,
      },
      {
        tier: "UNCOMMON",
        baseOutput: 85,
        baseCost: 2400,
        upgradeCost: 1200,
        maxLevel: 10,
        unlockLevel: 8,
      },
      {
        tier: "RARE",
        baseOutput: 140,
        baseCost: 5600,
        upgradeCost: 2800,
        maxLevel: 10,
        unlockLevel: 12,
      },
      {
        tier: "EPIC",
        baseOutput: 230,
        baseCost: 14000,
        upgradeCost: 7000,
        maxLevel: 10,
        unlockLevel: 16,
      },
      {
        tier: "LEGENDARY",
        baseOutput: 400,
        baseCost: 40000,
        upgradeCost: 20000,
        maxLevel: 10,
        unlockLevel: 20,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// 4. Achievements
// ---------------------------------------------------------------------------

const achievements: Prisma.AchievementCreateInput[] = [
  // -- Building --
  {
    key: "first_module",
    name: "Foundation",
    description: "Build your first module",
    category: "BUILDING",
    xpReward: 50,
    lunarReward: 100,
    threshold: 1,
    sortOrder: 1,
  },
  {
    key: "five_modules",
    name: "Growing Colony",
    description: "Build 5 modules",
    category: "BUILDING",
    xpReward: 150,
    lunarReward: 300,
    threshold: 5,
    sortOrder: 2,
  },
  {
    key: "ten_modules",
    name: "Lunar Architect",
    description: "Build 10 modules",
    category: "BUILDING",
    xpReward: 500,
    lunarReward: 1000,
    threshold: 10,
    sortOrder: 3,
  },
  {
    key: "max_modules",
    name: "Master Builder",
    description: "Reach max module capacity (20)",
    category: "BUILDING",
    xpReward: 2000,
    lunarReward: 5000,
    threshold: 20,
    sortOrder: 4,
  },
  {
    key: "first_upgrade",
    name: "Efficiency Expert",
    description: "Upgrade a module for the first time",
    category: "BUILDING",
    xpReward: 75,
    lunarReward: 150,
    threshold: 1,
    sortOrder: 5,
  },
  {
    key: "rare_module",
    name: "Rare Find",
    description: "Build a RARE tier module",
    category: "BUILDING",
    xpReward: 300,
    lunarReward: 500,
    threshold: 1,
    sortOrder: 6,
  },
  {
    key: "epic_module",
    name: "Epic Achievement",
    description: "Build an EPIC tier module",
    category: "BUILDING",
    xpReward: 1000,
    lunarReward: 2000,
    threshold: 1,
    sortOrder: 7,
  },
  {
    key: "legendary_module",
    name: "Legendary Builder",
    description: "Build a LEGENDARY tier module",
    category: "BUILDING",
    xpReward: 5000,
    lunarReward: 10000,
    threshold: 1,
    sortOrder: 8,
  },

  // -- Production --
  {
    key: "first_collection",
    name: "First Paycheck",
    description: "Collect resources for the first time",
    category: "PRODUCTION",
    xpReward: 25,
    lunarReward: 50,
    threshold: 1,
    sortOrder: 10,
  },
  {
    key: "earn_1k",
    name: "Thousandaire",
    description: "Earn 1,000 $LUNAR total",
    category: "PRODUCTION",
    xpReward: 100,
    lunarReward: 200,
    threshold: 1000,
    sortOrder: 11,
  },
  {
    key: "earn_10k",
    name: "Lunar Mogul",
    description: "Earn 10,000 $LUNAR total",
    category: "PRODUCTION",
    xpReward: 500,
    lunarReward: 1000,
    threshold: 10000,
    sortOrder: 12,
  },
  {
    key: "earn_100k",
    name: "Tycoon",
    description: "Earn 100,000 $LUNAR total",
    category: "PRODUCTION",
    xpReward: 2500,
    lunarReward: 5000,
    threshold: 100000,
    sortOrder: 13,
  },
  {
    key: "earn_1m",
    name: "Lunar Billionaire",
    description: "Earn 1,000,000 $LUNAR total",
    category: "PRODUCTION",
    xpReward: 10000,
    lunarReward: 25000,
    threshold: 1000000,
    sortOrder: 14,
  },

  // -- Social --
  {
    key: "join_alliance",
    name: "Team Player",
    description: "Join an alliance",
    category: "SOCIAL",
    xpReward: 100,
    lunarReward: 200,
    threshold: 1,
    sortOrder: 20,
  },
  {
    key: "create_alliance",
    name: "Founding Father",
    description: "Create an alliance",
    category: "SOCIAL",
    xpReward: 250,
    lunarReward: 500,
    threshold: 1,
    sortOrder: 21,
  },

  // -- Exploration --
  {
    key: "all_module_types",
    name: "Diversified",
    description: "Build one of every module type",
    category: "EXPLORATION",
    xpReward: 500,
    lunarReward: 1000,
    threshold: 8,
    sortOrder: 30,
  },
  {
    key: "all_resources",
    name: "Resource Baron",
    description: "Mine all 5 resource types",
    category: "EXPLORATION",
    xpReward: 300,
    lunarReward: 750,
    threshold: 5,
    sortOrder: 31,
  },

  // -- Milestones --
  {
    key: "level_5",
    name: "Established",
    description: "Reach player level 5",
    category: "MILESTONE",
    xpReward: 200,
    lunarReward: 500,
    threshold: 5,
    sortOrder: 40,
  },
  {
    key: "level_10",
    name: "Veteran",
    description: "Reach player level 10",
    category: "MILESTONE",
    xpReward: 1000,
    lunarReward: 2500,
    threshold: 10,
    sortOrder: 41,
  },
  {
    key: "level_20",
    name: "Moon Legend",
    description: "Reach player level 20",
    category: "MILESTONE",
    xpReward: 5000,
    lunarReward: 10000,
    threshold: 20,
    sortOrder: 42,
  },
  {
    key: "streak_7",
    name: "Weekly Regular",
    description: "Maintain a 7-day login streak",
    category: "MILESTONE",
    xpReward: 200,
    lunarReward: 500,
    threshold: 7,
    sortOrder: 43,
  },
  {
    key: "streak_30",
    name: "Lunar Loyalist",
    description: "Maintain a 30-day login streak",
    category: "MILESTONE",
    xpReward: 2000,
    lunarReward: 5000,
    threshold: 30,
    sortOrder: 44,
  },
  {
    key: "first_crew",
    name: "Crew Commander",
    description: "Hire your first crew member",
    category: "MILESTONE",
    xpReward: 100,
    lunarReward: 200,
    threshold: 1,
    sortOrder: 45,
  },
];

// ---------------------------------------------------------------------------
// 5. Test Players
// ---------------------------------------------------------------------------

async function seedPlayers() {
  const now = new Date();

  // --- Alice: advanced player ---
  const alice = await prisma.player.upsert({
    where: { fid: 1 },
    update: {},
    create: {
      fid: 1,
      username: "alice_lunar",
      lunarBalance: 5000,
      level: 5,
      xp: 1200,
      totalEarnings: 15000,
      moduleCount: 4,
      crewCount: 1,
      efficiency: 95,
      dailyStreak: 7,
      lastDailyAt: now,
      lastActive: now,
      modules: {
        create: [
          {
            type: "SOLAR_PANEL",
            tier: "UNCOMMON",
            level: 2,
            coordinates: { x: 0, y: 0 },
            baseOutput: 18,
            efficiency: 95,
            ageInCycles: 50,
          },
          {
            type: "MINING_RIG",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 1, y: 0 },
            baseOutput: 25,
            efficiency: 100,
          },
          {
            type: "HABITAT",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 0, y: 1 },
            baseOutput: 5,
            efficiency: 100,
          },
          {
            type: "WATER_EXTRACTOR",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 1, y: 1 },
            baseOutput: 20,
            efficiency: 100,
          },
        ],
      },
      crew: {
        create: [
          {
            name: "Dr. Luna",
            role: "scientist",
            level: 2,
            xp: 50,
            specialty: "RESEARCH_LAB",
            efficiencyBonus: 5,
            outputBonus: 10,
            assignedModuleId: null,
          },
        ],
      },
      resources: {
        create: [
          { type: "LUNAR", amount: 5000, totalMined: 15000 },
          { type: "REGOLITH", amount: 200, totalMined: 800 },
          { type: "WATER_ICE", amount: 50, totalMined: 150 },
          { type: "HELIUM3", amount: 5, totalMined: 10 },
          { type: "RARE_EARTH", amount: 1, totalMined: 2 },
        ],
      },
    },
  });
  console.log(`  Player: ${alice.username} (FID: ${alice.fid})`);

  // --- Bob: mid-tier player ---
  const bob = await prisma.player.upsert({
    where: { fid: 2 },
    update: {},
    create: {
      fid: 2,
      username: "bob_moon",
      lunarBalance: 2500,
      level: 3,
      xp: 450,
      totalEarnings: 8000,
      moduleCount: 2,
      crewCount: 0,
      efficiency: 100,
      dailyStreak: 2,
      lastDailyAt: now,
      lastActive: now,
      modules: {
        create: [
          {
            type: "SOLAR_PANEL",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 0, y: 0 },
            baseOutput: 10,
            efficiency: 100,
          },
          {
            type: "MINING_RIG",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 1, y: 0 },
            baseOutput: 25,
            efficiency: 100,
          },
        ],
      },
      resources: {
        create: [
          { type: "LUNAR", amount: 2500, totalMined: 8000 },
          { type: "REGOLITH", amount: 100, totalMined: 300 },
          { type: "WATER_ICE", amount: 10, totalMined: 25 },
        ],
      },
    },
  });
  console.log(`  Player: ${bob.username} (FID: ${bob.fid})`);

  // --- Charlie: brand new player ---
  const charlie = await prisma.player.upsert({
    where: { fid: 3 },
    update: {},
    create: {
      fid: 3,
      username: "charlie_space",
      lunarBalance: 500,
      level: 1,
      xp: 0,
      totalEarnings: 0,
      moduleCount: 1,
      crewCount: 0,
      efficiency: 100,
      lastActive: now,
      modules: {
        create: [
          {
            type: "SOLAR_PANEL",
            tier: "COMMON",
            level: 1,
            coordinates: { x: 0, y: 0 },
            baseOutput: 10,
            efficiency: 100,
          },
        ],
      },
      resources: {
        create: [{ type: "LUNAR", amount: 500, totalMined: 500 }],
      },
    },
  });
  console.log(`  Player: ${charlie.username} (FID: ${charlie.fid})`);

  // -- Alice's transactions --
  await prisma.transaction.createMany({
    data: [
      {
        playerId: alice.id,
        type: "PRODUCTION",
        resource: "LUNAR",
        amount: 500,
        balanceAfter: 1500,
        description: "Collected production earnings",
      },
      {
        playerId: alice.id,
        type: "BUILD",
        resource: "LUNAR",
        amount: -250,
        balanceAfter: 1250,
        description: "Built Mining Rig (COMMON)",
      },
      {
        playerId: alice.id,
        type: "BUILD",
        resource: "LUNAR",
        amount: -200,
        balanceAfter: 1050,
        description: "Built Habitat (COMMON)",
      },
      {
        playerId: alice.id,
        type: "DAILY_REWARD",
        resource: "LUNAR",
        amount: 50,
        balanceAfter: 1100,
        description: "Daily login reward (streak: 7)",
      },
      {
        playerId: alice.id,
        type: "PRODUCTION",
        resource: "LUNAR",
        amount: 3900,
        balanceAfter: 5000,
        description: "Collected production earnings",
      },
    ],
  });

  // -- Alice's achievements --
  const firstModuleAch = await prisma.achievement.findUnique({
    where: { key: "first_module" },
  });
  const fiveModulesAch = await prisma.achievement.findUnique({
    where: { key: "five_modules" },
  });
  const firstCollectionAch = await prisma.achievement.findUnique({
    where: { key: "first_collection" },
  });

  if (firstModuleAch) {
    await prisma.playerAchievement.upsert({
      where: {
        playerId_achievementId: {
          playerId: alice.id,
          achievementId: firstModuleAch.id,
        },
      },
      update: {},
      create: {
        playerId: alice.id,
        achievementId: firstModuleAch.id,
        progress: 1,
      },
    });
  }
  if (fiveModulesAch) {
    await prisma.playerAchievement.upsert({
      where: {
        playerId_achievementId: {
          playerId: alice.id,
          achievementId: fiveModulesAch.id,
        },
      },
      update: {},
      create: {
        playerId: alice.id,
        achievementId: fiveModulesAch.id,
        progress: 4,
      }, // In progress
    });
  }
  if (firstCollectionAch) {
    await prisma.playerAchievement.upsert({
      where: {
        playerId_achievementId: {
          playerId: alice.id,
          achievementId: firstCollectionAch.id,
        },
      },
      update: {},
      create: {
        playerId: alice.id,
        achievementId: firstCollectionAch.id,
        progress: 1,
      },
    });
  }

  return { alice, bob, charlie };
}

// ---------------------------------------------------------------------------
// 6. Leaderboard Snapshots
// ---------------------------------------------------------------------------

async function seedLeaderboard() {
  const entries: Prisma.LeaderboardSnapshotCreateInput[] = [
    {
      fid: 1,
      username: "alice_lunar",
      period: "ALLTIME",
      rank: 1,
      lunarBalance: 5000,
      totalEarnings: 15000,
      moduleCount: 4,
      level: 5,
      efficiency: 95,
    },
    {
      fid: 2,
      username: "bob_moon",
      period: "ALLTIME",
      rank: 2,
      lunarBalance: 2500,
      totalEarnings: 8000,
      moduleCount: 2,
      level: 3,
      efficiency: 100,
    },
    {
      fid: 3,
      username: "charlie_space",
      period: "ALLTIME",
      rank: 3,
      lunarBalance: 500,
      totalEarnings: 0,
      moduleCount: 1,
      level: 1,
      efficiency: 100,
    },
  ];

  for (const entry of entries) {
    await prisma.leaderboardSnapshot.upsert({
      where: { fid_period: { fid: entry.fid, period: entry.period } },
      update: entry,
      create: entry,
    });
  }
  console.log(`  Leaderboard: ${entries.length} entries`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌙 Seeding Lunar Colony Tycoon database...\n");

  // 1. Game Config
  console.log("📋 Game Configuration:");
  for (const config of gameConfigs) {
    await prisma.gameConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        description: config.description,
        category: config.category,
      },
      create: config,
    });
  }
  console.log(`  ${gameConfigs.length} config entries\n`);

  // 2. Resource Prices
  console.log("💎 Resource Prices:");
  for (const price of resourcePrices) {
    await prisma.resourcePrice.upsert({
      where: { type: price.type },
      update: price,
      create: price,
    });
  }
  console.log(`  ${resourcePrices.length} resources\n`);

  // 3. Module Blueprints
  console.log("🏗️  Module Blueprints:");
  let blueprintCount = 0;
  for (const def of blueprintDefs) {
    for (const t of def.tiers) {
      await prisma.moduleBlueprint.upsert({
        where: { type_tier: { type: def.type, tier: t.tier } },
        update: {
          baseOutput: t.baseOutput,
          baseCost: t.baseCost,
          upgradeCost: t.upgradeCost,
          maxLevel: t.maxLevel,
          unlockLevel: t.unlockLevel,
        },
        create: {
          type: def.type,
          tier: t.tier,
          name: `${def.name} (${t.tier})`,
          description: def.description,
          baseOutput: t.baseOutput,
          baseCost: t.baseCost,
          upgradeCost: t.upgradeCost,
          maxLevel: t.maxLevel,
          unlockLevel: t.unlockLevel,
          sortOrder: blueprintCount,
        },
      });
      blueprintCount++;
    }
  }
  console.log(
    `  ${blueprintCount} blueprints (${blueprintDefs.length} types x 5 tiers)\n`,
  );

  // 4. Achievements
  console.log("🏆 Achievements:");
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { key: ach.key },
      update: {
        name: ach.name,
        description: ach.description,
        xpReward: ach.xpReward,
        lunarReward: ach.lunarReward,
        threshold: ach.threshold,
      },
      create: ach,
    });
  }
  console.log(`  ${achievements.length} achievements\n`);

  // 5. Test Players
  console.log("👤 Test Players:");
  await seedPlayers();
  console.log("");

  // 6. Leaderboard
  console.log("📊 Leaderboard:");
  await seedLeaderboard();

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
