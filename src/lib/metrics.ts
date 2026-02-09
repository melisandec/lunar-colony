/**
 * GameMetrics — Structured logging for production monitoring.
 *
 * All metrics are emitted as JSON to stdout for Vercel Log Drain ingestion.
 * Each log line is a self-contained JSON object with a `type` discriminator
 * so downstream tools (Datadog, Axiom, grep) can filter by category.
 *
 * Categories:
 *   - player_action   — user interactions (build, collect, trade, navigate)
 *   - production       — per-player production credits
 *   - trade            — market buy/sell executions
 *   - cron             — scheduled job results
 *   - event            — game event lifecycle (start, end, reward)
 *   - error            — application errors with context
 *   - health           — health-check pings
 *   - alert            — threshold-based alerts
 *
 * Usage:
 *   import { GameMetrics } from "@/lib/metrics";
 *   GameMetrics.trackPlayerAction("player_123", "build", { moduleType: "SOLAR_PANEL" });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricType =
  | "player_action"
  | "production"
  | "trade"
  | "cron"
  | "event"
  | "error"
  | "health"
  | "alert";

interface BaseMetric {
  type: MetricType;
  timestamp: string;
  env: string;
}

interface PlayerActionMetric extends BaseMetric {
  type: "player_action";
  playerId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

interface ProductionMetric extends BaseMetric {
  type: "production";
  playerId: string;
  amount: number;
  activeModules: number;
  avgEfficiency: number;
}

interface TradeMetric extends BaseMetric {
  type: "trade";
  playerId: string;
  resource: string;
  side: "buy" | "sell";
  quantity: number;
  avgPrice: number;
  totalCost: number;
  slippage: number;
}

interface CronMetric extends BaseMetric {
  type: "cron";
  job: string;
  durationMs: number;
  result: Record<string, unknown>;
}

interface EventMetric extends BaseMetric {
  type: "event";
  eventType: string;
  eventId: string;
  action: "started" | "completed" | "reward_distributed";
  metadata?: Record<string, unknown>;
}

interface ErrorMetric extends BaseMetric {
  type: "error";
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  severity: "warning" | "error" | "critical";
}

interface HealthMetric extends BaseMetric {
  type: "health";
  service: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface AlertMetric extends BaseMetric {
  type: "alert";
  alertName: string;
  severity: "info" | "warning" | "critical";
  message: string;
  value?: number;
  threshold?: number;
}

type Metric =
  | PlayerActionMetric
  | ProductionMetric
  | TradeMetric
  | CronMetric
  | EventMetric
  | ErrorMetric
  | HealthMetric
  | AlertMetric;

// ---------------------------------------------------------------------------
// Core emit function
// ---------------------------------------------------------------------------

function emit(metric: Metric): void {
  try {
    const line = JSON.stringify(metric);
    // Use process.stdout.write in production for zero-overhead structured logs.
    // console.log adds a newline and is slightly slower but works everywhere.
    if (typeof process !== "undefined" && process.stdout?.write) {
      process.stdout.write(line + "\n");
    } else {
      console.log(line);
    }
  } catch {
    // Never let metrics crash the app
  }
}

function base(type: MetricType): BaseMetric {
  return {
    type,
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const GameMetrics = {
  // --- Player Actions ---
  trackPlayerAction(
    playerId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ): void {
    emit({
      ...base("player_action"),
      type: "player_action",
      playerId,
      action,
      metadata,
    });
  },

  // --- Production ---
  trackProduction(
    playerId: string,
    amount: number,
    activeModules: number,
    avgEfficiency: number,
  ): void {
    emit({
      ...base("production"),
      type: "production",
      playerId,
      amount,
      activeModules,
      avgEfficiency,
    });
  },

  // --- Trades ---
  trackTrade(
    playerId: string,
    resource: string,
    side: "buy" | "sell",
    quantity: number,
    avgPrice: number,
    totalCost: number,
    slippage: number,
  ): void {
    emit({
      ...base("trade"),
      type: "trade",
      playerId,
      resource,
      side,
      quantity,
      avgPrice,
      totalCost,
      slippage,
    });
  },

  // --- Cron Jobs ---
  trackCron(
    job: string,
    durationMs: number,
    result: Record<string, unknown>,
  ): void {
    emit({
      ...base("cron"),
      type: "cron",
      job,
      durationMs,
      result,
    });

    // Auto-alert if cron took too long (>45s risks Vercel timeout)
    if (durationMs > 45_000) {
      GameMetrics.alert(
        "cron_slow",
        "warning",
        `Cron job "${job}" took ${(durationMs / 1000).toFixed(1)}s — approaching timeout`,
        durationMs,
        50_000,
      );
    }
  },

  // --- Events ---
  trackEvent(
    eventType: string,
    eventId: string,
    action: "started" | "completed" | "reward_distributed",
    metadata?: Record<string, unknown>,
  ): void {
    emit({
      ...base("event"),
      type: "event",
      eventType,
      eventId,
      action,
      metadata,
    });
  },

  // --- Errors ---
  trackError(
    error: unknown,
    context?: Record<string, unknown>,
    severity: "warning" | "error" | "critical" = "error",
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    emit({
      ...base("error"),
      type: "error",
      message,
      stack,
      context,
      severity,
    });
  },

  // --- Health ---
  trackHealth(
    service: string,
    status: "ok" | "degraded" | "down",
    latencyMs: number,
    details?: Record<string, unknown>,
  ): void {
    emit({
      ...base("health"),
      type: "health",
      service,
      status,
      latencyMs,
      details,
    });
  },

  // --- Alerts ---
  alert(
    alertName: string,
    severity: "info" | "warning" | "critical",
    message: string,
    value?: number,
    threshold?: number,
  ): void {
    emit({
      ...base("alert"),
      type: "alert",
      alertName,
      severity,
      message,
      value,
      threshold,
    });
  },
};

export default GameMetrics;
