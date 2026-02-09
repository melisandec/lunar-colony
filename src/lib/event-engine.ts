/**
 * Event Engine
 *
 * Manages the lifecycle of game events:
 *   1. Scheduled events   — cron-triggered recurring events (weekly, monthly)
 *   2. Random events      — probability-based triggers on player actions
 *   3. Player-triggered   — milestone-based (alliance size, research convergence)
 *   4. Modifier system    — applies event effects to production/market/costs
 *   5. Reward distribution — calculates and distributes rewards on event end
 *   6. Participation      — tracks player engagement + scoring
 *
 * Design: Events are stored in ActiveEvent table with JSON modifiers.
 * The modifier keys follow a convention: MODULE_TYPE_STAT or GLOBAL_STAT.
 * Production engine and game engine query active events to apply multipliers.
 *
 * Entry points:
 *   - processScheduledEvents()   — called by cron to start/end scheduled events
 *   - rollRandomEvent()          — called on player action with probability check
 *   - checkTriggeredEvents()     — called on state changes for milestone checks
 *   - getActiveEvents()          — read-only for Frame display
 *   - getPlayerEventModifiers()  — aggregate active modifiers for a player
 *   - recordParticipation()      — log a qualifying action
 *   - distributeRewards()        — end-of-event reward payout
 */

import prisma from "@/lib/database";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Category mirrors the Prisma EventCategory enum */
export type EventCategory = "SCHEDULED" | "RANDOM" | "TRIGGERED";
export type EventStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface EventDefinition {
  type: string;
  category: EventCategory;
  name: string;
  description: string;
  icon: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Warning period before start (ms). 0 = instant. */
  warningMs: number;
  /** Modifier map: key → multiplier (1.0 = no change, 2.0 = +100%, 0.5 = -50%) */
  modifiers: Record<string, number>;
  /** Extra mechanics config */
  mechanics?: Record<string, unknown>;
  /** Is this a global event or targeted? */
  isGlobal: boolean;
  /** For random events: trigger probability (0–1) */
  probability?: number;
  /** For random events: what action context triggers the roll */
  triggerContext?: string;
  /** Reward pool (LUNAR) */
  rewardPool: number;
  /** Reward tiers: top N players get extra */
  rewardTiers?: Array<{ rank: number; multiplier: number; label: string }>;
}

export interface ActiveEventSummary {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  status: EventStatus;
  startTime: Date;
  endTime: Date;
  modifiers: Record<string, number>;
  participantCount: number;
  /** Player-specific data (if queried for a specific player) */
  playerScore?: number;
  playerRank?: number;
  playerActions?: number;
  timeRemaining: number; // ms
}

export interface ModifierSet {
  /** Merged modifiers from all active events for a player */
  modifiers: Record<string, number>;
  /** Active event names for display */
  activeEventNames: string[];
  /** Count of active events */
  activeCount: number;
}

export interface RewardResult {
  eventId: string;
  distributed: number;
  totalAmount: number;
  topPlayers: Array<{ playerId: string; rank: number; reward: number }>;
}

export interface EventTickResult {
  started: string[];
  completed: string[];
  rewardsDistributed: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Event Definitions — all possible events
// ---------------------------------------------------------------------------

export const EVENT_DEFINITIONS: Record<string, EventDefinition> = {
  // ========== SCHEDULED EVENTS ==========

  PRODUCTION_RUSH: {
    type: "PRODUCTION_RUSH",
    category: "SCHEDULED",
    name: "Lunar Production Rush",
    description:
      "All production modules operate at 150% output! Maximize your colony's efficiency.",
    icon: "🚀",
    durationMs: 24 * 60 * 60 * 1000, // 24 hours
    warningMs: 60 * 60 * 1000, // 1 hour warning
    modifiers: {
      GLOBAL_PRODUCTION: 1.5,
      SOLAR_PANEL_OUTPUT: 1.75,
      MINING_RIG_OUTPUT: 1.75,
    },
    mechanics: { requiresPreparation: false },
    isGlobal: true,
    rewardPool: 5000,
    rewardTiers: [
      { rank: 1, multiplier: 3.0, label: "Production King" },
      { rank: 2, multiplier: 2.0, label: "Top Producer" },
      { rank: 3, multiplier: 1.5, label: "Efficient Miner" },
      { rank: 10, multiplier: 1.0, label: "Top 10" },
    ],
  },

  EFFICIENCY_CHALLENGE: {
    type: "EFFICIENCY_CHALLENGE",
    category: "SCHEDULED",
    name: "Efficiency Challenge",
    description:
      "Modules consume 50% less resources. Build and upgrade for half price!",
    icon: "⚡",
    durationMs: 24 * 60 * 60 * 1000,
    warningMs: 30 * 60 * 1000,
    modifiers: {
      GLOBAL_BUILD_COST: 0.5,
      GLOBAL_UPGRADE_COST: 0.5,
    },
    isGlobal: true,
    rewardPool: 3000,
    rewardTiers: [
      { rank: 1, multiplier: 2.5, label: "Master Builder" },
      { rank: 5, multiplier: 1.5, label: "Top 5" },
      { rank: 20, multiplier: 1.0, label: "Top 20" },
    ],
  },

  MARKET_MANIPULATION: {
    type: "MARKET_MANIPULATION",
    category: "SCHEDULED",
    name: "Market Manipulation Monday",
    description:
      "Market volatility surges! Prices swing wildly — profit or perish.",
    icon: "📊",
    durationMs: 24 * 60 * 60 * 1000,
    warningMs: 2 * 60 * 60 * 1000,
    modifiers: {
      MARKET_VOLATILITY: 3.0,
      TRADE_FEE: 0.5,
    },
    mechanics: {
      marketVolatilityMultiplier: 3.0,
      reducedTradeFees: true,
    },
    isGlobal: true,
    rewardPool: 8000,
    rewardTiers: [
      { rank: 1, multiplier: 4.0, label: "Market Manipulator" },
      { rank: 3, multiplier: 2.0, label: "Wolf of Luna" },
      { rank: 10, multiplier: 1.0, label: "Top 10 Trader" },
    ],
  },

  WEEKLY_BURN: {
    type: "WEEKLY_BURN",
    category: "SCHEDULED",
    name: "Weekly Burn Event",
    description:
      "Burn excess resources for bonus $LUNAR! Higher tiers yield better returns.",
    icon: "🔥",
    durationMs: 60 * 60 * 1000, // 1 hour only
    warningMs: 30 * 60 * 1000,
    modifiers: {
      BURN_RATE_BONUS: 2.0,
      RESOURCE_TO_LUNAR_RATE: 1.5,
    },
    isGlobal: true,
    rewardPool: 2000,
    rewardTiers: [
      { rank: 1, multiplier: 3.0, label: "Arsonist" },
      { rank: 5, multiplier: 1.5, label: "Pyromaniac" },
    ],
  },

  // ========== RANDOM EVENTS ==========

  SOLAR_FLARE: {
    type: "SOLAR_FLARE",
    category: "RANDOM",
    name: "Solar Flare",
    description:
      "A massive solar flare disrupts power systems! Solar panels produce 30% but backup generators surge.",
    icon: "☀️",
    durationMs: (2 + Math.random() * 4) * 60 * 60 * 1000, // 2–6 hours
    warningMs: 30 * 60 * 1000,
    modifiers: {
      SOLAR_PANEL_OUTPUT: 0.3,
      POWER_DEPENDENT_MODULES: 0.5,
      STORAGE_DEPOT_OUTPUT: 2.0,
    },
    mechanics: {
      requiresPreparation: true,
      emergencyPurchaseAvailable: true,
      warningPeriod: 30,
    },
    isGlobal: true,
    probability: 0.01,
    triggerContext: "production",
    rewardPool: 1000,
    rewardTiers: [
      { rank: 1, multiplier: 2.0, label: "Flare Survivor" },
      { rank: 10, multiplier: 1.0, label: "Resilient" },
    ],
  },

  METEOR_SHOWER: {
    type: "METEOR_SHOWER",
    category: "RANDOM",
    name: "Meteor Shower",
    description:
      "Incoming meteors! Mining rigs extract rare fragments from debris. Colony defense tested.",
    icon: "☄️",
    durationMs: 3 * 60 * 60 * 1000,
    warningMs: 15 * 60 * 1000,
    modifiers: {
      MINING_RIG_OUTPUT: 2.5,
      RARE_EARTH_BONUS: 3.0,
      HABITAT_DAMAGE_RISK: 0.8, // 20% damage to habitats
    },
    mechanics: {
      damageChance: 0.05, // 5% chance of module damage per habitat
      bonusResourceDrop: "RARE_EARTH",
    },
    isGlobal: true,
    probability: 0.005,
    triggerContext: "colony_view",
    rewardPool: 1500,
    rewardTiers: [
      { rank: 1, multiplier: 2.5, label: "Meteor Miner" },
      { rank: 5, multiplier: 1.5, label: "Debris Collector" },
    ],
  },

  EQUIPMENT_SURPLUS: {
    type: "EQUIPMENT_SURPLUS",
    category: "RANDOM",
    name: "Equipment Surplus",
    description:
      "A supply ship arrives with surplus equipment! Building costs reduced by 40%.",
    icon: "📦",
    durationMs: 4 * 60 * 60 * 1000,
    warningMs: 0, // Instant
    modifiers: {
      GLOBAL_BUILD_COST: 0.6,
      STORAGE_DEPOT_OUTPUT: 1.5,
    },
    isGlobal: true,
    probability: 0.02,
    triggerContext: "shop_open",
    rewardPool: 500,
  },

  EARTH_CONTRACT: {
    type: "EARTH_CONTRACT",
    category: "RANDOM",
    name: "Earth Contract",
    description:
      "Earth needs lunar resources urgently! Sell prices boosted by 200% for all resources.",
    icon: "🌍",
    durationMs: 6 * 60 * 60 * 1000,
    warningMs: 60 * 60 * 1000,
    modifiers: {
      SELL_PRICE_MULTIPLIER: 3.0,
      GLOBAL_PRODUCTION: 1.2,
    },
    isGlobal: true,
    probability: 0.002,
    triggerContext: "daily",
    rewardPool: 3000,
    rewardTiers: [
      { rank: 1, multiplier: 3.0, label: "Earth's Favorite" },
      { rank: 3, multiplier: 2.0, label: "Top Supplier" },
      { rank: 10, multiplier: 1.0, label: "Contributor" },
    ],
  },

  // ========== PLAYER-TRIGGERED EVENTS ==========

  ALLIANCE_TOURNAMENT: {
    type: "ALLIANCE_TOURNAMENT",
    category: "TRIGGERED",
    name: "Alliance Tournament",
    description:
      "Your alliance is large enough to host a tournament! Compete for glory and $LUNAR.",
    icon: "⚔️",
    durationMs: 48 * 60 * 60 * 1000, // 48 hours
    warningMs: 0,
    modifiers: {
      ALLIANCE_BONUS: 1.5,
      GLOBAL_PRODUCTION: 1.1,
    },
    mechanics: {
      minAllianceMembers: 10,
      allianceOnly: true,
    },
    isGlobal: false,
    rewardPool: 10000,
    rewardTiers: [
      { rank: 1, multiplier: 5.0, label: "Tournament Champion" },
      { rank: 2, multiplier: 3.0, label: "Runner-Up" },
      { rank: 3, multiplier: 2.0, label: "Third Place" },
      { rank: 10, multiplier: 1.0, label: "Top 10" },
    ],
  },

  RESEARCH_BREAKTHROUGH: {
    type: "RESEARCH_BREAKTHROUGH",
    category: "TRIGGERED",
    name: "Research Breakthrough",
    description:
      "Collective research hits critical mass! Research labs produce 300% output.",
    icon: "🔬",
    durationMs: 12 * 60 * 60 * 1000,
    warningMs: 0,
    modifiers: {
      RESEARCH_LAB_OUTPUT: 3.0,
      GLOBAL_XP: 2.0,
    },
    mechanics: {
      minResearchLabCount: 50, // Across all players
    },
    isGlobal: true,
    rewardPool: 4000,
    rewardTiers: [
      { rank: 1, multiplier: 3.0, label: "Lead Researcher" },
      { rank: 5, multiplier: 2.0, label: "Key Contributor" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Scheduled Event Schedule — maps day/time to event types
// ---------------------------------------------------------------------------

interface ScheduleEntry {
  type: string;
  /** Day of week: 0=Sun, 1=Mon, ..., 6=Sat */
  dayOfWeek: number;
  /** Hour UTC (0–23) */
  hourUTC: number;
  /** Only trigger on specific week ordinal (1=first, null=every) */
  weekOfMonth?: number;
}

const SCHEDULED_EVENTS: ScheduleEntry[] = [
  { type: "PRODUCTION_RUSH", dayOfWeek: 1, hourUTC: 0 }, // Every Monday 00:00 UTC
  { type: "EFFICIENCY_CHALLENGE", dayOfWeek: 4, hourUTC: 0 }, // Every Thursday 00:00 UTC
  { type: "MARKET_MANIPULATION", dayOfWeek: 1, hourUTC: 0, weekOfMonth: 1 }, // First Monday of month
  { type: "WEEKLY_BURN", dayOfWeek: 0, hourUTC: 23 }, // Sunday 23:00 UTC
];

// ---------------------------------------------------------------------------
// 1. Scheduled Event Processing (cron)
// ---------------------------------------------------------------------------

/**
 * Process scheduled events: start pending ones and end expired ones.
 * Called by cron every 15 minutes.
 */
export async function processScheduledEvents(): Promise<EventTickResult> {
  const start = Date.now();
  const now = new Date();
  const started: string[] = [];
  const completed: string[] = [];
  let rewardsDistributed = 0;

  // --- Activate PENDING events whose startTime has passed ---
  const pendingToActivate = await prisma.activeEvent.findMany({
    where: {
      status: "PENDING",
      startTime: { lte: now },
    },
  });

  for (const event of pendingToActivate) {
    await prisma.activeEvent.update({
      where: { id: event.id },
      data: { status: "ACTIVE" },
    });
    started.push(event.type);

    await prisma.gameEvent.create({
      data: {
        type: "event_started",
        severity: "INFO",
        data: { eventId: event.id, eventType: event.type, name: event.name },
      },
    });
  }

  // --- Complete ACTIVE events whose endTime has passed ---
  const expiredEvents = await prisma.activeEvent.findMany({
    where: {
      status: "ACTIVE",
      endTime: { lte: now },
    },
  });

  for (const event of expiredEvents) {
    const result = await distributeRewards(event.id);
    rewardsDistributed += result.distributed;

    await prisma.activeEvent.update({
      where: { id: event.id },
      data: { status: "COMPLETED" },
    });
    completed.push(event.type);

    await prisma.gameEvent.create({
      data: {
        type: "event_completed",
        severity: "INFO",
        data: {
          eventId: event.id,
          eventType: event.type,
          participants: event.participantCount,
          rewardsDistributed: result.totalAmount,
        },
      },
    });
  }

  // --- Check if it's time to create new scheduled events ---
  const dayOfWeek = now.getUTCDay();
  const hourUTC = now.getUTCHours();
  const dayOfMonth = now.getUTCDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

  for (const entry of SCHEDULED_EVENTS) {
    if (entry.dayOfWeek !== dayOfWeek) continue;
    if (Math.abs(entry.hourUTC - hourUTC) > 0) continue; // Only within the hour
    if (entry.weekOfMonth && entry.weekOfMonth !== weekOfMonth) continue;

    // Check if this event type is already active or pending
    const existing = await prisma.activeEvent.findFirst({
      where: {
        type: entry.type,
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (existing) continue; // Already running

    // Also check if one completed in the last 12 hours (prevent duplicates)
    const recentlyCompleted = await prisma.activeEvent.findFirst({
      where: {
        type: entry.type,
        status: "COMPLETED",
        endTime: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      },
    });

    if (recentlyCompleted) continue;

    const def = EVENT_DEFINITIONS[entry.type];
    if (!def) continue;

    await createEvent(def);
    started.push(entry.type);
  }

  // --- Cleanup: delete events older than 30 days ---
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  await prisma.activeEvent.deleteMany({
    where: {
      status: { in: ["COMPLETED", "CANCELLED"] },
      endTime: { lt: thirtyDaysAgo },
    },
  });

  return {
    started,
    completed,
    rewardsDistributed,
    durationMs: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// 2. Random Event Triggers
// ---------------------------------------------------------------------------

/**
 * Roll for a random event based on the current action context.
 * Called from player action handlers (production, colony view, shop, etc.)
 *
 * @param context - The action that triggered the roll (e.g. "production", "colony_view")
 * @param playerId - The player who performed the action
 * @returns The created event summary if triggered, null otherwise
 */
export async function rollRandomEvent(
  context: string,
  playerId: string,
): Promise<ActiveEventSummary | null> {
  // Collect all random events that match this context
  const candidates = Object.values(EVENT_DEFINITIONS).filter(
    (def) =>
      def.category === "RANDOM" &&
      def.triggerContext === context &&
      def.probability != null,
  );

  if (candidates.length === 0) return null;

  // Check if there's already an active random event (max 1 at a time)
  const activeRandom = await prisma.activeEvent.findFirst({
    where: {
      category: "RANDOM",
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (activeRandom) return null; // Only one random event at a time

  // Roll for each candidate
  for (const def of candidates) {
    const roll = Math.random();
    if (roll < (def.probability ?? 0)) {
      // Triggered! Create the event
      const event = await createEvent(def);

      // Auto-participate the triggering player
      await recordParticipation(event.id, playerId, "trigger", 100);

      // Log it
      await prisma.gameEvent.create({
        data: {
          playerId,
          type: "random_event_triggered",
          severity: "WARNING",
          data: { eventType: def.type, eventId: event.id, context },
        },
      });

      return eventToSummary(event);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 3. Player-Triggered Events
// ---------------------------------------------------------------------------

/**
 * Check if conditions are met for player-triggered events.
 * Called periodically or on relevant state changes.
 */
export async function checkTriggeredEvents(): Promise<string[]> {
  const triggered: string[] = [];

  // --- Alliance Tournament: alliance with 10+ members ---
  const largAlliances = await prisma.alliance.findMany({
    where: { memberCount: { gte: 10 }, deletedAt: null },
    select: { id: true, name: true, members: { select: { playerId: true } } },
  });

  for (const alliance of largAlliances) {
    const existing = await prisma.activeEvent.findFirst({
      where: {
        type: "ALLIANCE_TOURNAMENT",
        status: { in: ["PENDING", "ACTIVE"] },
        config: { path: ["allianceId"], equals: alliance.id },
      },
    });

    if (existing) continue;

    const def = EVENT_DEFINITIONS["ALLIANCE_TOURNAMENT"];
    if (!def) continue;

    const playerIds = alliance.members.map((m) => m.playerId);
    await createEvent(def, {
      isGlobal: false,
      targetPlayerIds: playerIds,
      config: { allianceId: alliance.id, allianceName: alliance.name },
    });
    triggered.push(`ALLIANCE_TOURNAMENT:${alliance.name}`);
  }

  // --- Research Breakthrough: 50+ research labs globally ---
  const researchLabCount = await prisma.module.count({
    where: {
      type: "RESEARCH_LAB",
      isActive: true,
      deletedAt: null,
    },
  });

  if (researchLabCount >= 50) {
    const existingBreakthrough = await prisma.activeEvent.findFirst({
      where: {
        type: "RESEARCH_BREAKTHROUGH",
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (!existingBreakthrough) {
      // Also check cooldown: last breakthrough within 48 hours
      const recentBreakthrough = await prisma.activeEvent.findFirst({
        where: {
          type: "RESEARCH_BREAKTHROUGH",
          status: "COMPLETED",
          endTime: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
      });

      if (!recentBreakthrough) {
        const def = EVENT_DEFINITIONS["RESEARCH_BREAKTHROUGH"];
        if (def) {
          await createEvent(def);
          triggered.push("RESEARCH_BREAKTHROUGH");
        }
      }
    }
  }

  return triggered;
}

// ---------------------------------------------------------------------------
// 4. Modifier System
// ---------------------------------------------------------------------------

/**
 * Get aggregated modifiers from all active events affecting a player.
 * Modifiers are multiplicative: if two events both have GLOBAL_PRODUCTION,
 * they multiply together (1.5 * 1.2 = 1.8).
 *
 * This is the function production-engine and game-engine call to apply effects.
 */
export async function getPlayerEventModifiers(
  playerId: string,
): Promise<ModifierSet> {
  const now = new Date();

  // Get all active events (global + those targeting this player)
  const activeEvents = await prisma.activeEvent.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
    },
  });

  const mergedModifiers: Record<string, number> = {};
  const activeEventNames: string[] = [];

  for (const event of activeEvents) {
    // Check if player is in scope
    if (!event.isGlobal) {
      const targetIds = event.targetPlayerIds as string[] | null;
      if (targetIds && !targetIds.includes(playerId)) continue;
    }

    const modifiers = event.modifiers as Record<string, number>;
    activeEventNames.push(event.name);

    for (const [key, value] of Object.entries(modifiers)) {
      if (mergedModifiers[key] == null) {
        mergedModifiers[key] = value;
      } else {
        // Multiplicative stacking
        mergedModifiers[key] = mergedModifiers[key]! * value;
      }
    }
  }

  return {
    modifiers: mergedModifiers,
    activeEventNames,
    activeCount: activeEventNames.length,
  };
}

/**
 * Get a specific modifier value, defaulting to 1.0 (no effect).
 * Convenience wrapper for single modifier lookups.
 */
export function getModifier(mods: ModifierSet, key: string): number {
  return mods.modifiers[key] ?? 1.0;
}

// ---------------------------------------------------------------------------
// 5. Participation Tracking
// ---------------------------------------------------------------------------

/**
 * Record a player's participation in an event.
 * Increments their action count and score.
 */
export async function recordParticipation(
  eventId: string,
  playerId: string,
  actionType: string,
  scoreDelta: number,
): Promise<void> {
  const now = new Date();

  await prisma.eventParticipant.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    update: {
      score: { increment: scoreDelta },
      actions: { increment: 1 },
      lastActionAt: now,
      metadata: { lastAction: actionType },
    },
    create: {
      eventId,
      playerId,
      score: scoreDelta,
      actions: 1,
      firstActionAt: now,
      lastActionAt: now,
      metadata: { lastAction: actionType },
    },
  });

  // Update participant count on the event (eventually consistent)
  const count = await prisma.eventParticipant.count({ where: { eventId } });
  await prisma.activeEvent.update({
    where: { id: eventId },
    data: { participantCount: count },
  });
}

/**
 * Auto-participate a player in all active global events.
 * Called when a player performs any game action.
 */
export async function autoParticipateInActiveEvents(
  playerId: string,
  actionType: string,
  baseScore: number,
): Promise<void> {
  const now = new Date();
  const activeEvents = await prisma.activeEvent.findMany({
    where: {
      status: "ACTIVE",
      startTime: { lte: now },
      endTime: { gte: now },
    },
    select: { id: true, isGlobal: true, targetPlayerIds: true },
  });

  for (const event of activeEvents) {
    if (!event.isGlobal) {
      const targetIds = event.targetPlayerIds as string[] | null;
      if (targetIds && !targetIds.includes(playerId)) continue;
    }

    await recordParticipation(event.id, playerId, actionType, baseScore);
  }
}

// ---------------------------------------------------------------------------
// 6. Reward Distribution
// ---------------------------------------------------------------------------

/**
 * Distribute rewards for a completed event based on participant scores.
 * Rewards are calculated as:
 *   - Base share: rewardPool / participantCount
 *   - Tiered bonus: top-N players get a multiplier on their share
 *   - Score bonus: proportional to individual score vs total
 */
export async function distributeRewards(
  eventId: string,
): Promise<RewardResult> {
  const event = await prisma.activeEvent.findUniqueOrThrow({
    where: { id: eventId },
    include: { participants: { orderBy: { score: "desc" } } },
  });

  const def = EVENT_DEFINITIONS[event.type];
  const rewardPool = def?.rewardPool ?? 0;

  if (event.participants.length === 0 || rewardPool === 0) {
    return { eventId, distributed: 0, totalAmount: 0, topPlayers: [] };
  }

  const totalScore = event.participants.reduce(
    (sum, p) => sum + Number(p.score),
    0,
  );
  const tiers = def?.rewardTiers ?? [];
  const topPlayers: RewardResult["topPlayers"] = [];
  let totalDistributed = 0;

  for (let i = 0; i < event.participants.length; i++) {
    const participant = event.participants[i]!;
    const rank = i + 1;

    // Base share proportional to score
    const scoreShare =
      totalScore > 0
        ? Number(participant.score) / totalScore
        : 1 / event.participants.length;
    let reward = rewardPool * scoreShare;

    // Apply tier multiplier
    const tier = tiers.find((t) => rank <= t.rank);
    if (tier) {
      reward *= tier.multiplier;
    }

    reward = Math.round(reward * 10000) / 10000;

    if (reward > 0) {
      // Credit player
      await prisma.$transaction([
        prisma.player.update({
          where: { id: participant.playerId },
          data: {
            lunarBalance: { increment: reward },
            totalEarnings: { increment: reward },
          },
        }),
        prisma.eventReward.create({
          data: {
            eventId,
            playerId: participant.playerId,
            resource: "LUNAR",
            amount: reward,
            reason: tier?.label ?? "Participation",
            rank,
          },
        }),
        prisma.eventParticipant.update({
          where: { id: participant.id },
          data: { rewardClaimed: true, rewardAmount: reward },
        }),
        prisma.transaction.create({
          data: {
            playerId: participant.playerId,
            type: "ACHIEVEMENT",
            resource: "LUNAR",
            amount: reward,
            balanceAfter: 0, // Will be stale — fine for ledger
            description: `Event reward: ${event.name} (Rank #${rank})`,
            metadata: {
              eventId,
              eventType: event.type,
              rank,
              tier: tier?.label,
            },
          },
        }),
      ]);

      totalDistributed += reward;

      if (rank <= 10) {
        topPlayers.push({ playerId: participant.playerId, rank, reward });
      }
    }
  }

  // Update event totals
  await prisma.activeEvent.update({
    where: { id: eventId },
    data: { totalRewardsDistributed: totalDistributed },
  });

  return {
    eventId,
    distributed: event.participants.length,
    totalAmount: totalDistributed,
    topPlayers,
  };
}

// ---------------------------------------------------------------------------
// 7. Read-Only Queries
// ---------------------------------------------------------------------------

/**
 * Get all currently active + pending events.
 * Optionally includes player-specific participation data.
 */
export async function getActiveEvents(
  playerId?: string,
): Promise<ActiveEventSummary[]> {
  const now = new Date();

  const events = await prisma.activeEvent.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      endTime: { gte: now },
    },
    orderBy: { startTime: "asc" },
    include: playerId
      ? {
          participants: {
            where: { playerId },
            take: 1,
          },
        }
      : undefined,
  });

  const summaries: ActiveEventSummary[] = [];

  for (const event of events) {
    const summary = eventToSummary(event);

    // Add player-specific data
    if (playerId) {
      const participants = (
        event as { participants?: Array<{ score: unknown; actions: number }> }
      ).participants;
      const participation = participants?.[0];
      if (participation) {
        summary.playerScore = Number(participation.score);
        summary.playerActions = participation.actions;

        // Calculate rank
        const rank = await prisma.eventParticipant.count({
          where: {
            eventId: event.id,
            score: { gt: Number(participation.score) },
          },
        });
        summary.playerRank = rank + 1;
      }
    }

    summaries.push(summary);
  }

  return summaries;
}

/**
 * Get recently completed events (last 7 days).
 */
export async function getRecentEvents(
  limit = 10,
): Promise<ActiveEventSummary[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const events = await prisma.activeEvent.findMany({
    where: {
      status: "COMPLETED",
      endTime: { gte: weekAgo },
    },
    orderBy: { endTime: "desc" },
    take: limit,
  });

  return events.map(eventToSummary);
}

/**
 * Get a specific event with full participant leaderboard.
 */
export async function getEventDetail(eventId: string): Promise<{
  event: ActiveEventSummary;
  leaderboard: Array<{
    playerId: string;
    score: number;
    actions: number;
    rank: number;
    rewardAmount: number;
  }>;
} | null> {
  const event = await prisma.activeEvent.findUnique({
    where: { id: eventId },
    include: {
      participants: {
        orderBy: { score: "desc" },
        take: 50,
      },
    },
  });

  if (!event) return null;

  return {
    event: eventToSummary(event),
    leaderboard: event.participants.map((p, i) => ({
      playerId: p.playerId,
      score: Number(p.score),
      actions: p.actions,
      rank: i + 1,
      rewardAmount: Number(p.rewardAmount),
    })),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Create a new event in the database from a definition.
 */
async function createEvent(
  def: EventDefinition,
  overrides?: {
    isGlobal?: boolean;
    targetPlayerIds?: string[];
    config?: Record<string, unknown>;
  },
) {
  const now = new Date();
  const hasWarning = def.warningMs > 0;
  const startTime = hasWarning ? new Date(now.getTime() + def.warningMs) : now;
  const endTime = new Date(startTime.getTime() + def.durationMs);

  return prisma.activeEvent.create({
    data: {
      type: def.type,
      category: def.category,
      status: hasWarning ? "PENDING" : "ACTIVE",
      name: def.name,
      description: def.description,
      icon: def.icon,
      startTime,
      endTime,
      warningTime: hasWarning ? now : null,
      modifiers: def.modifiers as Prisma.InputJsonValue,
      mechanics: (def.mechanics ?? {}) as Prisma.InputJsonValue,
      config: (overrides?.config ?? {}) as Prisma.InputJsonValue,
      isGlobal: overrides?.isGlobal ?? def.isGlobal,
      targetPlayerIds:
        (overrides?.targetPlayerIds as Prisma.InputJsonValue) ??
        Prisma.JsonNull,
    },
  });
}

/**
 * Convert an ActiveEvent DB row to a summary object.
 */
function eventToSummary(event: {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  status: string;
  startTime: Date;
  endTime: Date;
  modifiers: unknown;
  participantCount: number;
}): ActiveEventSummary {
  const now = Date.now();
  return {
    id: event.id,
    type: event.type,
    name: event.name,
    description: event.description,
    icon: event.icon,
    status: event.status as EventStatus,
    startTime: event.startTime,
    endTime: event.endTime,
    modifiers: (event.modifiers ?? {}) as Record<string, number>,
    participantCount: event.participantCount,
    timeRemaining: Math.max(0, event.endTime.getTime() - now),
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

const eventEngine = {
  processScheduledEvents,
  rollRandomEvent,
  checkTriggeredEvents,
  getActiveEvents,
  getRecentEvents,
  getEventDetail,
  getPlayerEventModifiers,
  getModifier,
  recordParticipation,
  autoParticipateInActiveEvents,
  distributeRewards,
  EVENT_DEFINITIONS,
};

export default eventEngine;
