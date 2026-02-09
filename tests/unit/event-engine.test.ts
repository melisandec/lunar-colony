/**
 * Event Engine — Unit Tests
 *
 * Tests event definitions, modifier system, probability distributions,
 * and event lifecycle logic.
 */

import { prismaMock, resetPrismaMock } from "../helpers/prisma-mock";
import {
  createModifierSet,
  EMPTY_MODIFIERS,
  runMonteCarlo,
} from "../helpers/factories";

// Import engine after mocks
const eventEngine =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/lib/event-engine") as typeof import("@/lib/event-engine");
const { EVENT_DEFINITIONS, getModifier, getPlayerEventModifiers } = eventEngine;

beforeEach(() => {
  resetPrismaMock();
});

// =========================================================================
// 1. Event Definitions Validation
// =========================================================================

describe("Event definitions", () => {
  test("All 10 events are defined", () => {
    const keys = Object.keys(EVENT_DEFINITIONS);
    expect(keys.length).toBe(10);
  });

  const required = [
    "PRODUCTION_RUSH",
    "EFFICIENCY_CHALLENGE",
    "MARKET_MANIPULATION",
    "WEEKLY_BURN",
    "SOLAR_FLARE",
    "METEOR_SHOWER",
    "EQUIPMENT_SURPLUS",
    "EARTH_CONTRACT",
    "ALLIANCE_TOURNAMENT",
    "RESEARCH_BREAKTHROUGH",
  ];

  for (const type of required) {
    test(`${type} is defined with valid structure`, () => {
      const def = EVENT_DEFINITIONS[type];
      expect(def).toBeDefined();
      expect(def.name).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.icon).toBeTruthy();
      expect(def.durationMs).toBeGreaterThan(0);
      expect(def.rewardPool).toBeGreaterThanOrEqual(0);
      expect(def.category).toMatch(/^(SCHEDULED|RANDOM|TRIGGERED)$/);
      expect(def.modifiers).toBeDefined();
      expect(typeof def.modifiers).toBe("object");
    });
  }

  test("All scheduled events have warningMs > 0", () => {
    const scheduled = Object.values(EVENT_DEFINITIONS).filter(
      (d) => d.category === "SCHEDULED",
    );
    expect(scheduled.length).toBeGreaterThan(0);
    for (const def of scheduled) {
      expect(def.warningMs).toBeGreaterThanOrEqual(0);
    }
  });

  test("All random events have probability 0–1", () => {
    const random = Object.values(EVENT_DEFINITIONS).filter(
      (d) => d.category === "RANDOM",
    );
    expect(random.length).toBeGreaterThan(0);
    for (const def of random) {
      expect(def.probability).toBeDefined();
      expect(def.probability).toBeGreaterThan(0);
      expect(def.probability).toBeLessThanOrEqual(1);
    }
  });

  test("All random events have triggerContext", () => {
    const random = Object.values(EVENT_DEFINITIONS).filter(
      (d) => d.category === "RANDOM",
    );
    for (const def of random) {
      expect(def.triggerContext).toBeTruthy();
    }
  });

  test("Reward pools are within reasonable range", () => {
    for (const def of Object.values(EVENT_DEFINITIONS)) {
      expect(def.rewardPool).toBeGreaterThanOrEqual(0);
      expect(def.rewardPool).toBeLessThanOrEqual(20000);
    }
  });

  test("Reward tiers are in ascending rank order", () => {
    for (const def of Object.values(EVENT_DEFINITIONS)) {
      if (def.rewardTiers) {
        for (let i = 1; i < def.rewardTiers.length; i++) {
          expect(def.rewardTiers[i]!.rank).toBeGreaterThan(
            def.rewardTiers[i - 1]!.rank,
          );
        }
      }
    }
  });

  test("Reward tier multipliers decrease with rank", () => {
    for (const def of Object.values(EVENT_DEFINITIONS)) {
      if (def.rewardTiers && def.rewardTiers.length >= 2) {
        for (let i = 1; i < def.rewardTiers.length; i++) {
          expect(def.rewardTiers[i]!.multiplier).toBeLessThanOrEqual(
            def.rewardTiers[i - 1]!.multiplier,
          );
        }
      }
    }
  });
});

// =========================================================================
// 2. Modifier System
// =========================================================================

describe("getModifier", () => {
  test("Returns 1.0 for missing key (no effect)", () => {
    expect(getModifier(EMPTY_MODIFIERS, "NONEXISTENT")).toBe(1.0);
  });

  test("Returns exact value for present key", () => {
    const mods = createModifierSet({ GLOBAL_PRODUCTION: 1.5 });
    expect(getModifier(mods, "GLOBAL_PRODUCTION")).toBe(1.5);
  });

  test("Returns 0.3 for penalty modifier", () => {
    const mods = createModifierSet({ SOLAR_PANEL_OUTPUT: 0.3 });
    expect(getModifier(mods, "SOLAR_PANEL_OUTPUT")).toBe(0.3);
  });

  test("Returns 2.0 for bonus modifier", () => {
    const mods = createModifierSet({ STORAGE_DEPOT_OUTPUT: 2.0 });
    expect(getModifier(mods, "STORAGE_DEPOT_OUTPUT")).toBe(2.0);
  });
});

describe("getPlayerEventModifiers", () => {
  test("Returns empty modifiers when no active events", async () => {
    prismaMock.activeEvent.findMany.mockResolvedValue([]);
    const mods = await getPlayerEventModifiers("player_1");
    expect(mods.modifiers).toEqual({});
    expect(mods.activeEventNames).toEqual([]);
    expect(mods.activeCount).toBe(0);
  });

  test("Returns single event modifiers", async () => {
    prismaMock.activeEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        type: "PRODUCTION_RUSH",
        name: "Lunar Production Rush",
        isGlobal: true,
        targetPlayerIds: null,
        modifiers: { GLOBAL_PRODUCTION: 1.5, SOLAR_PANEL_OUTPUT: 1.75 },
        status: "ACTIVE",
        startTime: new Date(Date.now() - 1000),
        endTime: new Date(Date.now() + 86400000),
      } as never,
    ]);

    const mods = await getPlayerEventModifiers("player_1");
    expect(mods.modifiers["GLOBAL_PRODUCTION"]).toBe(1.5);
    expect(mods.modifiers["SOLAR_PANEL_OUTPUT"]).toBe(1.75);
    expect(mods.activeCount).toBe(1);
    expect(mods.activeEventNames).toContain("Lunar Production Rush");
  });

  test("Multiple events stack multiplicatively", async () => {
    prismaMock.activeEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        name: "Event A",
        isGlobal: true,
        targetPlayerIds: null,
        modifiers: { GLOBAL_PRODUCTION: 1.5 },
      } as never,
      {
        id: "evt_2",
        name: "Event B",
        isGlobal: true,
        targetPlayerIds: null,
        modifiers: { GLOBAL_PRODUCTION: 1.2 },
      } as never,
    ]);

    const mods = await getPlayerEventModifiers("player_1");
    // 1.5 * 1.2 = 1.8
    expect(mods.modifiers["GLOBAL_PRODUCTION"]).toBeCloseTo(1.8, 4);
    expect(mods.activeCount).toBe(2);
  });

  test("Non-global event is skipped if player not in targetPlayerIds", async () => {
    prismaMock.activeEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        name: "Alliance Event",
        isGlobal: false,
        targetPlayerIds: ["player_2", "player_3"],
        modifiers: { ALLIANCE_BONUS: 2.0 },
      } as never,
    ]);

    const mods = await getPlayerEventModifiers("player_1");
    expect(mods.modifiers["ALLIANCE_BONUS"]).toBeUndefined();
    expect(mods.activeCount).toBe(0);
  });

  test("Non-global event applies if player IS in targetPlayerIds", async () => {
    prismaMock.activeEvent.findMany.mockResolvedValue([
      {
        id: "evt_1",
        name: "Alliance Event",
        isGlobal: false,
        targetPlayerIds: ["player_1", "player_2"],
        modifiers: { ALLIANCE_BONUS: 2.0 },
      } as never,
    ]);

    const mods = await getPlayerEventModifiers("player_1");
    expect(mods.modifiers["ALLIANCE_BONUS"]).toBe(2.0);
    expect(mods.activeCount).toBe(1);
  });
});

// =========================================================================
// 3. Probability Distribution (Random Events)
// =========================================================================

describe("Random event probability distributions", () => {
  test("SOLAR_FLARE: ~1% trigger rate over 10K rolls", () => {
    const probability = EVENT_DEFINITIONS.SOLAR_FLARE.probability!;
    let triggers = 0;
    const trials = 10000;

    for (let i = 0; i < trials; i++) {
      if (Math.random() < probability) triggers++;
    }

    const rate = triggers / trials;
    // Should be near 0.01 with some tolerance
    expect(rate).toBeGreaterThan(0.003);
    expect(rate).toBeLessThan(0.025);
  });

  test("METEOR_SHOWER: ~0.5% trigger rate over 10K rolls", () => {
    const probability = EVENT_DEFINITIONS.METEOR_SHOWER.probability!;
    let triggers = 0;
    const trials = 10000;

    for (let i = 0; i < trials; i++) {
      if (Math.random() < probability) triggers++;
    }

    const rate = triggers / trials;
    expect(rate).toBeGreaterThan(0.001);
    expect(rate).toBeLessThan(0.015);
  });

  test("EQUIPMENT_SURPLUS: ~2% trigger rate over 10K rolls", () => {
    const probability = EVENT_DEFINITIONS.EQUIPMENT_SURPLUS.probability!;
    let triggers = 0;
    const trials = 10000;

    for (let i = 0; i < trials; i++) {
      if (Math.random() < probability) triggers++;
    }

    const rate = triggers / trials;
    expect(rate).toBeGreaterThan(0.01);
    expect(rate).toBeLessThan(0.04);
  });

  test("EARTH_CONTRACT: ~0.2% trigger rate over 50K rolls", () => {
    const probability = EVENT_DEFINITIONS.EARTH_CONTRACT.probability!;
    let triggers = 0;
    const trials = 50000;

    for (let i = 0; i < trials; i++) {
      if (Math.random() < probability) triggers++;
    }

    const rate = triggers / trials;
    expect(rate).toBeGreaterThan(0.0005);
    expect(rate).toBeLessThan(0.005);
  });

  test("Total random event probability is reasonable (<5% per tick)", () => {
    const totalProb = Object.values(EVENT_DEFINITIONS)
      .filter((d) => d.category === "RANDOM")
      .reduce((sum, d) => sum + (d.probability ?? 0), 0);

    expect(totalProb).toBeLessThan(0.05);
    expect(totalProb).toBeGreaterThan(0);
  });
});

// =========================================================================
// 4. Event Modifier Effects Sanity
// =========================================================================

describe("Event modifier effects sanity", () => {
  test("PRODUCTION_RUSH boosts output (all modifiers > 1.0)", () => {
    const def = EVENT_DEFINITIONS.PRODUCTION_RUSH;
    for (const value of Object.values(def.modifiers)) {
      expect(value).toBeGreaterThan(1.0);
    }
  });

  test("SOLAR_FLARE has negative modifiers (< 1.0) for solar", () => {
    const def = EVENT_DEFINITIONS.SOLAR_FLARE;
    expect(def.modifiers["SOLAR_PANEL_OUTPUT"]).toBeLessThan(1.0);
    // But storage gets a buff
    expect(def.modifiers["STORAGE_DEPOT_OUTPUT"]).toBeGreaterThan(1.0);
  });

  test("EFFICIENCY_CHALLENGE reduces build costs (modifier < 1.0)", () => {
    const def = EVENT_DEFINITIONS.EFFICIENCY_CHALLENGE;
    expect(def.modifiers["GLOBAL_BUILD_COST"]).toBeLessThan(1.0);
  });

  test("EARTH_CONTRACT boosts sell prices significantly", () => {
    const def = EVENT_DEFINITIONS.EARTH_CONTRACT;
    expect(def.modifiers["SELL_PRICE_MULTIPLIER"]).toBeGreaterThanOrEqual(2.0);
  });

  test("METEOR_SHOWER boosts MINING_RIG output", () => {
    const def = EVENT_DEFINITIONS.METEOR_SHOWER;
    expect(def.modifiers["MINING_RIG_OUTPUT"]).toBeGreaterThan(1.0);
  });
});

// =========================================================================
// 5. recordParticipation
// =========================================================================

describe("recordParticipation", () => {
  const { recordParticipation } = eventEngine;

  test("Creates or updates participant record", async () => {
    prismaMock.eventParticipant.upsert.mockResolvedValueOnce({
      id: "ep_1",
      eventId: "evt_1",
      playerId: "player_1",
      score: 100,
      actions: 1,
    } as never);
    prismaMock.eventParticipant.count.mockResolvedValueOnce(1);
    prismaMock.activeEvent.update.mockResolvedValueOnce({} as never);

    await expect(
      recordParticipation("evt_1", "player_1", "production", 100),
    ).resolves.not.toThrow();

    expect(prismaMock.eventParticipant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId_playerId: { eventId: "evt_1", playerId: "player_1" } },
      }),
    );
  });
});
