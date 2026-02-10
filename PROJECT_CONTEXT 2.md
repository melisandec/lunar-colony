# Lunar Colony Tycoon - Project Context

## Overview

A Farcaster Frame game where players build lunar industrial complexes to earn $LUNAR tokens.

## Tech Stack

- **Frontend**: Next.js 14
- **Database**: Prisma with PostgreSQL
- **API Integration**: Neynar API (Farcaster)
- **Hosting**: Serverless-optimized

## Critical Constraints

### Frame Specifications

- Image aspect ratio: 1.91:1
- Image max size: 1MB
- Must work within Farcaster Frame limitations

### API & Services

- Use only free tiers with rate limiting in mind
- Optimize database queries for serverless functions
- $LUNAR token is in-game only (not a real cryptocurrency)

## Key Architectural Decisions

### Rendering

- Use server-side rendering for all Frame screens

### Performance

- Cache aggressively for performance

### Development Strategy

- Mock blockchain interactions initially
- Prioritize gameplay loop over polish

## Project Structure

```
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
postcss.config.mjs
tsconfig.json
public/
src/
  app/
    globals.css
    layout.tsx
    page.tsx
```
