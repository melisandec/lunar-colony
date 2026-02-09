# Lunar Colony Tycoon — Production Deployment Guide

## Architecture Overview

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐
│  Farcaster   │─────▶│  Vercel Edge    │─────▶│  Neon.tech       │
│  (Frames)    │◀─────│  (Next.js API)  │◀─────│  PostgreSQL      │
└─────────────┘      └─────────────────┘      └──────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
        Vercel Cron    Vercel Analytics   Sentry
        (3 jobs)       (free tier)        (free 5k/mo)
```

## Hosting: Vercel (Free Tier)

**What you get free:**

- 100 GB bandwidth/month
- Serverless functions (10s default, 60s max)
- Edge middleware
- Vercel Cron (daily + hourly schedules)
- Automatic SSL, preview deploys, rollback

### Setup

1. Push repo to GitHub
2. Import project in [vercel.com/new](https://vercel.com/new)
3. Set environment variables (see `.env.example`)
4. Vercel auto-detects Next.js and uses `vercel.json` config

### Cron Schedule (vercel.json)

| Job              | Schedule       | Endpoint                     |
| ---------------- | -------------- | ---------------------------- |
| Daily Production | `0 0 * * *`    | `/api/cron/daily-production` |
| Market Update    | `*/15 * * * *` | `/api/cron/market-update`    |
| Event Check      | `0 * * * *`    | `/api/cron/event-check`      |

Each endpoint validates `CRON_SECRET` via `Authorization: Bearer <secret>`.

---

## Database: Neon.tech (Free Tier)

**What you get free:**

- 0.5 GB storage
- 190 compute hours/month
- Autoscaling to zero (no idle cost)
- Point-in-time recovery (7 days)
- Database branching for preview deploys

### Backup Strategy

Neon handles backups automatically:

- **Point-in-time recovery**: Restore to any point in the last 7 days
- **Branch snapshots**: Create branch before risky migrations
- **Manual export**: `pg_dump` via Neon console for off-site backup

### Migration Workflow

```bash
# Dev: create migration
npx prisma migrate dev --name add_feature

# Preview: auto-applied via Vercel build command
# (prisma migrate deploy runs in vercel.json buildCommand)

# Production: applied on deploy
# vercel.json: "prisma generate && prisma migrate deploy && next build"
```

---

## CI/CD: GitHub Actions

Pipeline (`.github/workflows/ci.yml`):

```
push/PR → Lint → TypeCheck → Test (195 tests) → Build
                                                    ↓
                                         Vercel auto-deploys
```

Vercel GitHub integration handles deployment:

- **PR** → Preview deploy with unique URL
- **main** → Production deploy

---

## Monitoring (All Free)

### 1. Structured Logging (`src/lib/metrics.ts`)

All game events are emitted as JSON to stdout, picked up by Vercel Log Drain:

```json
{
  "type": "trade",
  "playerId": "abc",
  "resource": "HELIUM",
  "side": "buy",
  "quantity": 10,
  "avgPrice": 25.5,
  "totalCost": 255,
  "slippage": 0.12,
  "timestamp": "2025-01-15T12:00:00Z",
  "env": "production"
}
```

Categories: `player_action`, `production`, `trade`, `cron`, `event`, `error`, `health`, `alert`

### 2. Health Check (`/api/health`)

Returns component-level status:

```json
{
  "status": "ok",
  "version": "a1b2c3d",
  "uptime": 3600,
  "checks": [
    { "name": "database", "status": "ok", "latencyMs": 12 },
    {
      "name": "memory",
      "status": "ok",
      "latencyMs": 0,
      "message": "45/128 MB (35%)"
    }
  ]
}
```

### 3. Status Page (`/api/status`)

HTML dashboard showing: system health, player counts, 24h trade volume, DB latency.

### 4. External Monitoring

| Tool             | Free Tier          | Use For                         |
| ---------------- | ------------------ | ------------------------------- |
| Vercel Analytics | Included           | Page views, Web Vitals          |
| Sentry           | 5,000 errors/month | Error tracking + alerts         |
| Freshping        | 50 monitors        | Uptime monitoring `/api/health` |
| UptimeRobot      | 50 monitors, 5min  | Alternative uptime check        |

---

## Alerting

Built into `GameMetrics.alert()` — auto-triggered for:

| Alert                   | Severity | Condition                                |
| ----------------------- | -------- | ---------------------------------------- |
| `cron_slow`             | warning  | Cron job > 45s (approaching 60s timeout) |
| `db_connection_failure` | critical | Health check DB query fails              |
| `production_failures`   | warning  | Any player production failures           |

For Sentry integration, add `SENTRY_DSN` env var and install `@sentry/nextjs`.

---

## Rollback Procedures

### Application Rollback (Vercel)

```bash
# Via Vercel dashboard:
# Project → Deployments → Click older deploy → "..." → Promote to Production

# Via CLI:
npx vercel promote <deployment-url>
```

Every push to `main` creates an immutable deployment. Rolling back is instant.

### Database Rollback (Neon)

```bash
# Option 1: Point-in-time restore (up to 7 days back)
# Neon Console → Project → Branches → Restore to timestamp

# Option 2: Branch before migration, then swap
neon branches create --name pre-migration-backup
npx prisma migrate deploy
# If it fails: swap back to the backup branch
```

### Emergency Procedure

1. **App down?** → Vercel dashboard → Promote last working deployment
2. **DB issue?** → Neon console → Restore branch to timestamp
3. **Cron overloading?** → Remove cron schedule from `vercel.json`, push
4. **Rate limited?** → Check Neynar dashboard, GameMetrics `alert` logs

---

## Cost Summary

| Service        | Tier  | Monthly Cost         |
| -------------- | ----- | -------------------- |
| Vercel         | Hobby | $0                   |
| Neon.tech      | Free  | $0                   |
| GitHub Actions | Free  | $0 (2,000 min/month) |
| Sentry         | Free  | $0 (5k errors)       |
| Freshping      | Free  | $0 (50 monitors)     |
| **Total**      |       | **$0**               |

---

## First Deploy Checklist

- [ ] Push code to GitHub
- [ ] Import project in Vercel
- [ ] Set all env vars from `.env.example`
- [ ] Generate `CRON_SECRET` (`openssl rand -base64 32`)
- [ ] Get Neynar API key from [neynar.com](https://neynar.com)
- [ ] Create Neon.tech project, copy pooled connection string
- [ ] First deploy triggers `prisma migrate deploy` + `next build`
- [ ] Verify `/api/health` returns `{"status":"ok"}`
- [ ] Verify `/api/status` shows game stats
- [ ] Set up Freshping monitor on `https://your-app.vercel.app/api/health`
- [ ] Optional: Add Sentry DSN for error tracking
