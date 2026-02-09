import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { GameMetrics } from "@/lib/metrics";

/**
 * GET /api/health
 *
 * Production health-check endpoint.
 * Returns component-level status so uptime monitors can
 * distinguish between full outages and partial degradation.
 *
 * Freshping / UptimeRobot should point here with a 10 s timeout
 * and alert on non-200 *or* `status !== "ok"`.
 */

interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  message?: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  const checks: HealthCheck[] = [];

  // --- Database connectivity ---
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "database",
      status: "ok",
      latencyMs: Date.now() - dbStart,
    });
  } catch (err) {
    checks.push({
      name: "database",
      status: "down",
      latencyMs: Date.now() - dbStart,
      message: err instanceof Error ? err.message : "Connection failed",
    });
    GameMetrics.alert(
      "db_connection_failure",
      "critical",
      "Database health check failed",
    );
  }

  // --- Memory usage ---
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  checks.push({
    name: "memory",
    status: heapPct > 90 ? "degraded" : "ok",
    latencyMs: 0,
    message: `${heapUsedMB}/${heapTotalMB} MB (${heapPct}%)`,
  });

  // --- Determine overall status ---
  const overallStatus: "ok" | "degraded" | "down" = checks.some(
    (c) => c.status === "down",
  )
    ? "down"
    : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "ok";

  const totalLatency = Date.now() - start;

  GameMetrics.trackHealth("api", overallStatus, totalLatency, {
    checks: checks.map((c) => ({ name: c.name, status: c.status })),
  });

  const httpStatus = overallStatus === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status: overallStatus,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
      totalLatencyMs: totalLatency,
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
