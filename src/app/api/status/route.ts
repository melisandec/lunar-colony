import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

/**
 * GET /api/status
 *
 * Lightweight HTML status page for operators.
 * Shows database connectivity, player counts, and recent activity.
 *
 * No auth required — only exposes aggregate counts, not PII.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();

  let dbStatus = "ok";
  let dbLatency = 0;
  let playerCount = 0;
  let activePlayers24h = 0;
  let moduleCount = 0;
  let tradeCount24h = 0;
  let errorMsg = "";

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;

    const [players, active, modules, trades] = await Promise.all([
      prisma.player.count(),
      prisma.player.count({
        where: {
          lastActive: { gte: new Date(Date.now() - 86_400_000) },
        },
      }),
      prisma.module.count(),
      prisma.transaction.count({
        where: {
          type: "TRADE",
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      }),
    ]);

    playerCount = players;
    activePlayers24h = active;
    moduleCount = modules;
    tradeCount24h = trades;
  } catch (err) {
    dbStatus = "down";
    errorMsg = err instanceof Error ? err.message : "Unknown error";
  }

  const totalMs = Date.now() - start;
  const statusColor = dbStatus === "ok" ? "#22c55e" : "#ef4444";
  const statusEmoji = dbStatus === "ok" ? "&#9679;" : "&#9679;";
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lunar Colony Tycoon — Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      background: #0a0a1a;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #a78bfa; }
    .subtitle { color: #888; font-size: 0.85rem; margin-bottom: 2rem; }
    .card {
      background: #111127;
      border: 1px solid #222;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .card h2 { font-size: 0.95rem; color: #a78bfa; margin-bottom: 0.75rem; }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 0.35rem 0;
      border-bottom: 1px solid #1a1a2e;
    }
    .row:last-child { border-bottom: none; }
    .label { color: #888; }
    .value { font-weight: 600; }
    .status-badge {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    .ok { background: #052e16; color: #22c55e; }
    .down { background: #450a0a; color: #ef4444; }
    footer { text-align: center; color: #555; font-size: 0.75rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1><span style="color:${statusColor}">${statusEmoji}</span> Lunar Colony Tycoon</h1>
    <p class="subtitle">System status — refreshed ${new Date().toISOString()}</p>

    <div class="card">
      <h2>System Health</h2>
      <div class="row">
        <span class="label">Overall</span>
        <span class="status-badge ${dbStatus}">${dbStatus.toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="label">Database</span>
        <span class="value">${dbLatency}ms</span>
      </div>
      <div class="row">
        <span class="label">Version</span>
        <span class="value">${version}</span>
      </div>
      <div class="row">
        <span class="label">Page rendered in</span>
        <span class="value">${totalMs}ms</span>
      </div>
      ${errorMsg ? `<div class="row"><span class="label">Error</span><span class="value" style="color:#ef4444">${errorMsg}</span></div>` : ""}
    </div>

    <div class="card">
      <h2>Game Stats (24h)</h2>
      <div class="row">
        <span class="label">Total Players</span>
        <span class="value">${playerCount.toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Active (24h)</span>
        <span class="value">${activePlayers24h.toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Total Modules</span>
        <span class="value">${moduleCount.toLocaleString()}</span>
      </div>
      <div class="row">
        <span class="label">Trades (24h)</span>
        <span class="value">${tradeCount24h.toLocaleString()}</span>
      </div>
    </div>

    <footer>
      Lunar Colony Tycoon &middot; uptime ${Math.floor(process.uptime() / 60)}min
    </footer>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
