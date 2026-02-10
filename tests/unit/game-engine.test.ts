/**
 * Game Engine — Unit Tests
 *
 * Tests the core game-engine functions added during the audit:
 *   - toggleModule, repairModule, demolishModule
 *   - grantXP (with level-up)
 *   - claimDailyReward (with streak logic)
 *   - checkAchievements
 *   - createAlliance, joinAlliance, leaveAlliance
 *   - createPriceAlert, getPlayerAlerts, markAlertRead
 *   - getGameConfig (with caching)
 *   - calculateUpgradeCost, upgradeModule
 *   - recruitCrew, assignCrew
 *   - buildModule with blueprint tiers
 *   - syncPlayerSummary
 *   - calculateColonyState
 */

import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";

// Mock database/queries (upsertPlayerSummary used by syncPlayerSummary)
jest.mock("@/lib/database/queries", () => ({
  __esModule: true,
  upsertPlayerSummary: jest.fn().mockResolvedValue(undefined),
  getPlayerFrameState: jest.fn().mockResolvedValue(null),
  refreshLeaderboard: jest.fn().mockResolvedValue(undefined),
  getLeaderboard: jest.fn().mockResolvedValue([]),
  getPlayerRank: jest.fn().mockResolvedValue(null),
}));

// Mock metrics (GameMetrics is fire-and-forget logging)
jest.mock("@/lib/metrics", () => ({
  __esModule: true,
  GameMetrics: {
    trackPlayerAction: jest.fn(),
    trackProduction: jest.fn(),
    trackTrade: jest.fn(),
    trackCron: jest.fn(),
    trackEvent: jest.fn(),
    trackError: jest.fn(),
    trackHealth: jest.fn(),
    trackAlert: jest.fn(),
  },
}));

// Import engine after mocks are set up
const gameEngine =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/game-engine/index") as typeof import("@/lib/game-engine/index");

const {
  toggleModule,
  repairModule,
  demolishModule,
  grantXP,
  claimDailyReward,
  checkAchievements,
  createAlliance,
  joinAlliance,
  leaveAlliance,
  createPriceAlert,
  getPlayerAlerts,
  markAlertRead,
  getGameConfig,
  calculateUpgradeCost,
  upgradeModule,
  recruitCrew,
  assignCrew,
  buildModule,
  syncPlayerSummary,
  calculateColonyState,
  collectEarnings,
} = gameEngine;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: "player_1",
    fid: 12345,
    username: "testuser",
    level: 1,
    xp: 0,
    lunarBalance: 1000,
    totalEarnings: 500,
    moduleCount: 2,
    crewCount: 0,
    dailyStreak: 0,
    lastDailyAt: null,
    version: 1,
    deletedAt: null,
    lastActive: new Date(),
    modules: [],
    allianceMember: null,
    ...overrides,
  };
}

function makeModule(overrides: Record<string, unknown> = {}) {
  return {
    id: "mod_1",
    playerId: "player_1",
    type: "SOLAR_PANEL",
    tier: "COMMON",
    level: 1,
    coordinates: { x: 0, y: 0 },
    baseOutput: 10,
    bonusOutput: 0,
    efficiency: 100,
    isActive: true,
    ageInCycles: 0,
    version: 1,
    deletedAt: null,
    lastCollectedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock();
});

// =========================================================================
// toggleModule
// =========================================================================

describe("toggleModule", () => {
  test("toggles active to inactive", async () => {
    const mod = makeModule({ isActive: true });
    prismaMock.module.findFirst.mockResolvedValue(mod);
    prismaMock.module.update.mockResolvedValue({ ...mod, isActive: false });

    const result = await toggleModule("player_1", "mod_1");

    expect(result.success).toBe(true);
    expect(result.isActive).toBe(false);
    expect(prismaMock.module.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "mod_1", version: 1 },
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });

  test("toggles inactive to active", async () => {
    const mod = makeModule({ isActive: false });
    prismaMock.module.findFirst.mockResolvedValue(mod);
    prismaMock.module.update.mockResolvedValue({ ...mod, isActive: true });

    const result = await toggleModule("player_1", "mod_1");

    expect(result.success).toBe(true);
    expect(result.isActive).toBe(true);
  });

  test("returns error when module not found", async () => {
    prismaMock.module.findFirst.mockResolvedValue(null);

    const result = await toggleModule("player_1", "nonexistent");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// =========================================================================
// repairModule
// =========================================================================

describe("repairModule", () => {
  test("repairs module to 100% efficiency", async () => {
    const player = makePlayer({ lunarBalance: 500 });
    const mod = makeModule({ efficiency: 60 });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.module.findFirst.mockResolvedValue(mod);

    const result = await repairModule("player_1", "mod_1");

    expect(result.success).toBe(true);
    // damage = 40%, cost = 40 * 5 = 200
    expect(result.cost).toBe(200);
    expect(result.newEfficiency).toBe(100);
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    const result = await repairModule("nonexistent", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  test("fails when module not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(makePlayer());
    prismaMock.module.findFirst.mockResolvedValue(null);

    const result = await repairModule("player_1", "nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  test("fails when already at full efficiency", async () => {
    prismaMock.player.findUnique.mockResolvedValue(makePlayer());
    prismaMock.module.findFirst.mockResolvedValue(
      makeModule({ efficiency: 100 }),
    );

    const result = await repairModule("player_1", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full efficiency/i);
  });

  test("fails when insufficient balance", async () => {
    prismaMock.player.findUnique.mockResolvedValue(
      makePlayer({ lunarBalance: 5 }),
    );
    prismaMock.module.findFirst.mockResolvedValue(
      makeModule({ efficiency: 10 }),
    );

    const result = await repairModule("player_1", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not enough/i);
  });
});

// =========================================================================
// demolishModule
// =========================================================================

describe("demolishModule", () => {
  test("soft-deletes module and grants refund", async () => {
    const player = makePlayer();
    const mod = makeModule({ type: "SOLAR_PANEL" });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.module.findFirst.mockResolvedValue(mod);

    const result = await demolishModule("player_1", "mod_1");

    expect(result.success).toBe(true);
    // SOLAR_PANEL base cost = 100, 25% refund = 25
    expect(result.refund).toBe(25);
    expect(prismaMock.crewMember.updateMany).toHaveBeenCalled();
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    const result = await demolishModule("nonexistent", "mod_1");
    expect(result.success).toBe(false);
  });

  test("fails when module not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(makePlayer());
    prismaMock.module.findFirst.mockResolvedValue(null);

    const result = await demolishModule("player_1", "nonexistent");
    expect(result.success).toBe(false);
  });
});

// =========================================================================
// grantXP
// =========================================================================

describe("grantXP", () => {
  test("grants XP without level-up", async () => {
    const player = makePlayer({ xp: 0, level: 1 });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await grantXP("player_1", 10, "test");

    expect(result.newXP).toBe(10);
    expect(result.newLevel).toBe(1);
    expect(result.leveledUp).toBe(false);
  });

  test("levels up when XP exceeds threshold", async () => {
    // Level 1 needs 100 XP (100 * 1^1.5 = 100)
    const player = makePlayer({ xp: 90, level: 1 });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await grantXP("player_1", 20, "test");

    // 90 + 20 = 110, threshold = 100 -> level up, remainder = 10
    expect(result.newLevel).toBe(2);
    expect(result.leveledUp).toBe(true);
    expect(result.newXP).toBe(10);
  });

  test("handles multi-level-ups", async () => {
    // Level 1 needs 100 XP, level 2 needs ~283 XP
    const player = makePlayer({ xp: 0, level: 1 });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await grantXP("player_1", 500, "mega_boost");

    expect(result.newLevel).toBeGreaterThan(2);
    expect(result.leveledUp).toBe(true);
  });

  test("returns defaults when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    const result = await grantXP("nonexistent", 10, "test");
    expect(result.newXP).toBe(0);
    expect(result.newLevel).toBe(1);
    expect(result.leveledUp).toBe(false);
  });
});

// =========================================================================
// claimDailyReward
// =========================================================================

describe("claimDailyReward", () => {
  test("grants first daily reward with streak 1", async () => {
    const player = makePlayer({
      lastDailyAt: null,
      dailyStreak: 0,
    });
    prismaMock.player.findUnique
      .mockResolvedValueOnce(player) // first lookup
      .mockResolvedValueOnce(player); // reload after streak check

    const result = await claimDailyReward("player_1");

    expect(result.success).toBe(true);
    expect(result.reward).toBe(50); // base reward
    expect(result.streak).toBe(1);
    expect(result.xpGained).toBe(12); // 10 + 1*2
  });

  test("fails if already claimed today", async () => {
    const today = new Date();
    const player = makePlayer({ lastDailyAt: today });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await claimDailyReward("player_1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already claimed/i);
  });

  test("continues streak when claimed yesterday", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const player = makePlayer({
      lastDailyAt: yesterday,
      dailyStreak: 5,
    });
    prismaMock.player.findUnique
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(player);

    const result = await claimDailyReward("player_1");

    expect(result.success).toBe(true);
    expect(result.streak).toBe(6);
    expect(result.reward).toBeGreaterThan(50); // streak multiplier
  });

  test("resets streak when gap of more than 1 day", async () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 3);
    const player = makePlayer({
      lastDailyAt: twoDaysAgo,
      dailyStreak: 10,
    });
    const resetPlayer = makePlayer({ ...player, dailyStreak: 0 });
    prismaMock.player.findUnique
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(resetPlayer);

    const result = await claimDailyReward("player_1");

    expect(result.success).toBe(true);
    expect(result.streak).toBe(1); // reset
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await claimDailyReward("nonexistent");
    expect(result.success).toBe(false);
  });
});

// =========================================================================
// checkAchievements
// =========================================================================

describe("checkAchievements", () => {
  test("returns empty when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);

    const result = await checkAchievements("nonexistent");
    expect(result.newAchievements).toEqual([]);
  });

  test("returns empty when no new achievements", async () => {
    const player = makePlayer({ moduleCount: 0, level: 1, totalEarnings: 0 });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.playerAchievement.findMany.mockResolvedValue([]);

    const result = await checkAchievements("player_1");
    expect(result.newAchievements).toEqual([]);
  });

  test("grants achievement when conditions met", async () => {
    const player = makePlayer({
      moduleCount: 5,
      level: 5,
      totalEarnings: 2000,
      crewCount: 1,
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.playerAchievement.findMany.mockResolvedValue([]);

    // Mock achievement lookups — return an achievement for each key
    prismaMock.achievement.findUnique.mockImplementation(
      async ({ where }: { where: { key: string } }) => ({
        id: `ach_${where.key}`,
        key: where.key,
        name: `Achievement: ${where.key}`,
        threshold: 1,
        xpReward: 50,
        lunarReward: 100,
      }),
    );

    const result = await checkAchievements("player_1");

    // Should unlock multiple achievements
    expect(result.newAchievements.length).toBeGreaterThan(0);
    expect(result.newAchievements[0]).toHaveProperty("key");
    expect(result.newAchievements[0]).toHaveProperty("xpReward");
  });
});

// =========================================================================
// Alliance system
// =========================================================================

describe("createAlliance", () => {
  test("creates alliance when player has enough balance", async () => {
    const player = makePlayer({
      lunarBalance: 2000,
      allianceMember: null,
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.alliance.findUnique.mockResolvedValue(null); // name not taken
    prismaMock.alliance.create.mockResolvedValue({
      id: "alliance_new",
      name: "TestAlliance",
    });

    const result = await createAlliance("player_1", "TestAlliance", "A test");

    expect(result.success).toBe(true);
    expect(result.allianceId).toBeDefined();
  });

  test("fails when already in an alliance", async () => {
    const player = makePlayer({
      lunarBalance: 2000,
      allianceMember: { id: "member_1" },
    });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await createAlliance("player_1", "TestAlliance");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already in/i);
  });

  test("fails when insufficient balance", async () => {
    const player = makePlayer({
      lunarBalance: 100,
      allianceMember: null,
    });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await createAlliance("player_1", "TestAlliance");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not enough/i);
  });

  test("fails when name already taken", async () => {
    const player = makePlayer({
      lunarBalance: 2000,
      allianceMember: null,
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.alliance.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createAlliance("player_1", "TakenName");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already taken/i);
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await createAlliance("nonexistent", "Test");
    expect(result.success).toBe(false);
  });
});

describe("joinAlliance", () => {
  test("joins an open alliance", async () => {
    const player = makePlayer({ allianceMember: null });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.alliance.findUnique.mockResolvedValue({
      id: "alliance_1",
      name: "TestAlliance",
      memberCount: 3,
      maxMembers: 10,
      deletedAt: null,
    });

    const result = await joinAlliance("player_1", "alliance_1");
    expect(result.success).toBe(true);
  });

  test("fails when already in an alliance", async () => {
    const player = makePlayer({ allianceMember: { id: "m_1" } });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await joinAlliance("player_1", "alliance_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already in/i);
  });

  test("fails when alliance is full", async () => {
    const player = makePlayer({ allianceMember: null });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.alliance.findUnique.mockResolvedValue({
      id: "alliance_1",
      name: "Full",
      memberCount: 10,
      maxMembers: 10,
      deletedAt: null,
    });

    const result = await joinAlliance("player_1", "alliance_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full/i);
  });

  test("fails when alliance not found", async () => {
    const player = makePlayer({ allianceMember: null });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.alliance.findUnique.mockResolvedValue(null);

    const result = await joinAlliance("player_1", "nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await joinAlliance("nonexistent", "alliance_1");
    expect(result.success).toBe(false);
  });
});

describe("leaveAlliance", () => {
  test("leaves alliance as member", async () => {
    prismaMock.allianceMember.findUnique.mockResolvedValue({
      id: "member_1",
      playerId: "player_1",
      allianceId: "alliance_1",
      role: "MEMBER",
      alliance: { id: "alliance_1", memberCount: 5 },
    });

    const result = await leaveAlliance("player_1");
    expect(result.success).toBe(true);
  });

  test("fails when leader with other members", async () => {
    prismaMock.allianceMember.findUnique.mockResolvedValue({
      id: "member_1",
      playerId: "player_1",
      allianceId: "alliance_1",
      role: "LEADER",
      alliance: { id: "alliance_1", memberCount: 3 },
    });

    const result = await leaveAlliance("player_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/leader/i);
  });

  test("disbands alliance when last member leaves", async () => {
    prismaMock.allianceMember.findUnique.mockResolvedValue({
      id: "member_1",
      playerId: "player_1",
      allianceId: "alliance_1",
      role: "LEADER",
      alliance: { id: "alliance_1", memberCount: 1 },
    });

    const result = await leaveAlliance("player_1");
    expect(result.success).toBe(true);
  });

  test("fails when not in an alliance", async () => {
    prismaMock.allianceMember.findUnique.mockResolvedValue(null);
    const result = await leaveAlliance("player_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not in/i);
  });
});

// =========================================================================
// Price Alerts
// =========================================================================

describe("createPriceAlert", () => {
  test("creates alert for a valid resource", async () => {
    prismaMock.resourcePrice.findUnique.mockResolvedValue({
      type: "REGOLITH",
      currentPrice: 2.5,
    });
    prismaMock.priceAlert.create.mockResolvedValue({ id: "alert_new" });

    const result = await createPriceAlert("player_1", "REGOLITH", 5.0, "above");

    expect(result.success).toBe(true);
    expect(result.alertId).toBeDefined();
  });

  test("fails for unknown resource", async () => {
    prismaMock.resourcePrice.findUnique.mockResolvedValue(null);

    const result = await createPriceAlert(
      "player_1",
      "FAKE_RESOURCE",
      5.0,
      "above",
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown/i);
  });
});

describe("getPlayerAlerts", () => {
  test("returns alerts for player", async () => {
    const alerts = [
      {
        id: "alert_1",
        resource: "REGOLITH",
        direction: "above",
        isRead: false,
      },
    ];
    prismaMock.priceAlert.findMany.mockResolvedValue(alerts);

    const result = await getPlayerAlerts("player_1");
    expect(result).toEqual(alerts);
    expect(prismaMock.priceAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playerId: "player_1" },
      }),
    );
  });
});

describe("markAlertRead", () => {
  test("marks alert as read", async () => {
    const result = await markAlertRead("player_1", "alert_1");
    expect(result.success).toBe(true);
    expect(prismaMock.priceAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert_1", playerId: "player_1" },
        data: { isRead: true },
      }),
    );
  });
});

// =========================================================================
// getGameConfig
// =========================================================================

describe("getGameConfig", () => {
  test("returns value from DB", async () => {
    prismaMock.gameConfig.findUnique.mockResolvedValue({
      key: "test_key",
      value: 42,
    });

    const result = await getGameConfig("test_key", 0);
    expect(result).toBe(42);
  });

  test("returns default when key not found", async () => {
    prismaMock.gameConfig.findUnique.mockResolvedValue(null);

    const result = await getGameConfig("missing_key", "default_val");
    expect(result).toBe("default_val");
  });

  test("caches value on repeated calls", async () => {
    prismaMock.gameConfig.findUnique.mockResolvedValue({
      key: "cached_key",
      value: 99,
    });

    await getGameConfig("cached_key", 0);
    await getGameConfig("cached_key", 0);

    // Should only query DB once (cached after first call)
    expect(prismaMock.gameConfig.findUnique).toHaveBeenCalledTimes(1);
  });
});

// =========================================================================
// calculateUpgradeCost
// =========================================================================

describe("calculateUpgradeCost", () => {
  test("returns base cost at level 1", () => {
    // SOLAR_PANEL upgrade base = 50
    const cost = calculateUpgradeCost("SOLAR_PANEL", 1);
    expect(cost).toBe(50);
  });

  test("increases with level (1.5x curve)", () => {
    const cost1 = calculateUpgradeCost("MINING_RIG", 1);
    const cost3 = calculateUpgradeCost("MINING_RIG", 3);
    const cost5 = calculateUpgradeCost("MINING_RIG", 5);

    expect(cost3).toBeGreaterThan(cost1);
    expect(cost5).toBeGreaterThan(cost3);
  });

  test("formula: base × 1.5^(level-1) floored", () => {
    // RESEARCH_LAB base = 250
    const cost = calculateUpgradeCost("RESEARCH_LAB", 3);
    const expected = Math.floor(250 * Math.pow(1.5, 2));
    expect(cost).toBe(expected);
  });
});

// =========================================================================
// upgradeModule
// =========================================================================

describe("upgradeModule", () => {
  test("upgrades module by one level", async () => {
    const player = makePlayer({ lunarBalance: 5000 });
    const mod = makeModule({ level: 1, type: "SOLAR_PANEL", baseOutput: 10 });
    prismaMock.player.findUnique.mockResolvedValue({
      ...player,
      modules: [mod],
    });
    prismaMock.module.update.mockResolvedValue({
      ...mod,
      level: 2,
      baseOutput: 11.5,
    });

    const result = await upgradeModule("player_1", "mod_1");

    expect(result.success).toBe(true);
    expect(result.cost).toBe(50); // base upgrade cost for SOLAR_PANEL
  });

  test("fails at max level", async () => {
    const player = makePlayer({ lunarBalance: 5000 });
    const mod = makeModule({ level: 10 });
    prismaMock.player.findUnique.mockResolvedValue({
      ...player,
      modules: [mod],
    });

    const result = await upgradeModule("player_1", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/max level/i);
  });

  test("fails with insufficient balance", async () => {
    const player = makePlayer({ lunarBalance: 1 });
    const mod = makeModule({ level: 5, type: "LAUNCH_PAD" });
    prismaMock.player.findUnique.mockResolvedValue({
      ...player,
      modules: [mod],
    });

    const result = await upgradeModule("player_1", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not enough/i);
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await upgradeModule("nonexistent", "mod_1");
    expect(result.success).toBe(false);
  });

  test("fails when module not found", async () => {
    const player = makePlayer();
    prismaMock.player.findUnique.mockResolvedValue({
      ...player,
      modules: [],
    });
    const result = await upgradeModule("player_1", "nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// =========================================================================
// recruitCrew
// =========================================================================

describe("recruitCrew", () => {
  test("recruits a crew member", async () => {
    const player = makePlayer({ lunarBalance: 1000 });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.crewMember.count.mockResolvedValue(0);
    prismaMock.crewMember.create.mockResolvedValue({
      id: "crew_1",
      name: "Kai Voss",
      role: "engineer",
      specialty: "SOLAR_PANEL",
      level: 1,
      efficiencyBonus: 5,
      outputBonus: 10,
    });

    const result = await recruitCrew("player_1");

    expect(result.success).toBe(true);
    expect(result.cost).toBe(200);
    expect(result.crew).toBeDefined();
    expect(result.crew!.name).toBeDefined();
  });

  test("fails when crew is full", async () => {
    prismaMock.player.findUnique.mockResolvedValue(makePlayer());
    prismaMock.crewMember.count.mockResolvedValue(5);

    const result = await recruitCrew("player_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/full/i);
  });

  test("fails with insufficient balance", async () => {
    prismaMock.player.findUnique.mockResolvedValue(
      makePlayer({ lunarBalance: 10 }),
    );
    prismaMock.crewMember.count.mockResolvedValue(0);

    const result = await recruitCrew("player_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not enough/i);
  });

  test("fails when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await recruitCrew("nonexistent");
    expect(result.success).toBe(false);
  });
});

// =========================================================================
// assignCrew
// =========================================================================

describe("assignCrew", () => {
  test("assigns crew to module", async () => {
    prismaMock.crewMember.findFirst
      .mockResolvedValueOnce({
        id: "crew_1",
        playerId: "player_1",
        specialty: "SOLAR_PANEL",
        outputBonus: 10,
        efficiencyBonus: 5,
        assignedModuleId: null,
        isActive: true,
      })
      .mockResolvedValueOnce(null); // no existing assignment
    prismaMock.module.findFirst.mockResolvedValue(
      makeModule({ type: "SOLAR_PANEL" }),
    );

    const result = await assignCrew("player_1", "crew_1", "mod_1");
    expect(result.success).toBe(true);
  });

  test("unassigns crew when moduleId is null", async () => {
    prismaMock.crewMember.findFirst.mockResolvedValue({
      id: "crew_1",
      playerId: "player_1",
      assignedModuleId: "mod_1",
      isActive: true,
      specialty: null,
      outputBonus: 10,
      efficiencyBonus: 5,
    });

    const result = await assignCrew("player_1", "crew_1", null);
    expect(result.success).toBe(true);
  });

  test("fails when crew not found", async () => {
    prismaMock.crewMember.findFirst.mockResolvedValue(null);

    const result = await assignCrew("player_1", "nonexistent", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  test("fails when module not found", async () => {
    prismaMock.crewMember.findFirst.mockResolvedValue({
      id: "crew_1",
      playerId: "player_1",
      isActive: true,
      specialty: null,
      outputBonus: 10,
      efficiencyBonus: 5,
      assignedModuleId: null,
    });
    prismaMock.module.findFirst.mockResolvedValue(null);

    const result = await assignCrew("player_1", "crew_1", "nonexistent");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  test("fails when module already has crew assigned", async () => {
    prismaMock.crewMember.findFirst
      .mockResolvedValueOnce({
        id: "crew_1",
        playerId: "player_1",
        isActive: true,
        specialty: null,
        outputBonus: 10,
        efficiencyBonus: 5,
        assignedModuleId: null,
      })
      .mockResolvedValueOnce({
        id: "crew_2",
        name: "Other Crew",
      }); // existing assignment
    prismaMock.module.findFirst.mockResolvedValue(makeModule());

    const result = await assignCrew("player_1", "crew_1", "mod_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already assigned/i);
  });
});

// =========================================================================
// buildModule with tiers
// =========================================================================

describe("buildModule with tiers", () => {
  test("builds COMMON tier with fallback costs", async () => {
    const player = makePlayer({
      lunarBalance: 5000,
      modules: [],
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.moduleBlueprint.findUnique.mockResolvedValue(null); // no blueprint
    prismaMock.module.create.mockResolvedValue(makeModule());

    const result = await buildModule("player_1", "SOLAR_PANEL", "COMMON");
    expect(result.success).toBe(true);
  });

  test("builds with blueprint data when available", async () => {
    const player = makePlayer({
      lunarBalance: 5000,
      level: 5,
      modules: [],
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.moduleBlueprint.findUnique.mockResolvedValue({
      type: "SOLAR_PANEL",
      tier: "RARE",
      baseCost: 500,
      baseOutput: 22,
      unlockLevel: 3,
    });
    prismaMock.module.create.mockResolvedValue(
      makeModule({ tier: "RARE", baseOutput: 22 }),
    );

    const result = await buildModule("player_1", "SOLAR_PANEL", "RARE");
    expect(result.success).toBe(true);
  });

  test("fails when player level below blueprint unlock", async () => {
    const player = makePlayer({
      lunarBalance: 5000,
      level: 1,
      modules: [],
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.moduleBlueprint.findUnique.mockResolvedValue({
      type: "SOLAR_PANEL",
      tier: "LEGENDARY",
      baseCost: 5000,
      baseOutput: 100,
      unlockLevel: 15,
    });

    const result = await buildModule("player_1", "SOLAR_PANEL", "LEGENDARY");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires level/i);
  });

  test("fails when colony is full", async () => {
    const modules = Array.from({ length: 20 }, (_, i) =>
      makeModule({ id: `mod_${i}` }),
    );
    const player = makePlayer({
      lunarBalance: 5000,
      modules,
    });
    prismaMock.player.findUnique.mockResolvedValue(player);

    const result = await buildModule("player_1", "SOLAR_PANEL");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/max modules/i);
  });

  test("fails with insufficient balance", async () => {
    const player = makePlayer({
      lunarBalance: 1,
      modules: [],
    });
    prismaMock.player.findUnique.mockResolvedValue(player);
    prismaMock.moduleBlueprint.findUnique.mockResolvedValue(null);

    const result = await buildModule("player_1", "LAUNCH_PAD");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not enough/i);
  });
});

// =========================================================================
// syncPlayerSummary
// =========================================================================

describe("syncPlayerSummary", () => {
  test("calls upsertPlayerSummary without throwing", () => {
    // syncPlayerSummary is fire-and-forget
    expect(() => syncPlayerSummary("player_1")).not.toThrow();
  });
});

// =========================================================================
// calculateColonyState
// =========================================================================

describe("calculateColonyState", () => {
  test("calculates state with active modules", () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const player = {
      id: "player_1",
      fid: 12345,
      username: "testuser",
      level: 3,
      lunarBalance: 500,
      modules: [
        makeModule({
          isActive: true,
          baseOutput: 10,
          bonusOutput: 2,
          efficiency: 100,
          lastCollectedAt: fiveMinAgo,
        }),
        makeModule({
          id: "mod_2",
          isActive: true,
          baseOutput: 25,
          bonusOutput: 0,
          efficiency: 80,
          lastCollectedAt: fiveMinAgo,
        }),
      ],
    };

    const state = calculateColonyState(
      player as Parameters<typeof calculateColonyState>[0],
    );

    expect(state.playerId).toBe("player_1");
    expect(state.level).toBe(3);
    expect(state.modules).toHaveLength(2);
    expect(state.productionRate).toBeGreaterThan(0);
    expect(state.pendingEarnings).toBeGreaterThanOrEqual(0);
  });

  test("returns zero pending when no active modules", () => {
    const player = {
      id: "player_1",
      fid: 12345,
      username: "testuser",
      level: 1,
      lunarBalance: 500,
      modules: [makeModule({ isActive: false })],
    };

    const state = calculateColonyState(
      player as Parameters<typeof calculateColonyState>[0],
    );
    expect(state.productionRate).toBe(0);
  });
});

// =========================================================================
// collectEarnings
// =========================================================================

describe("collectEarnings", () => {
  test("returns zero when player not found", async () => {
    prismaMock.player.findUnique.mockResolvedValue(null);
    const result = await collectEarnings("nonexistent");
    expect(result.collected).toBe(0);
    expect(result.newBalance).toBe(0);
  });
});
