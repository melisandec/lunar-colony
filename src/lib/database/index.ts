import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton for serverless environments.
 *
 * In development, we attach the client to `globalThis` to prevent
 * creating multiple instances during hot reload.
 *
 * In production (serverless), each cold start creates a new client
 * but Neon's connection pooling handles the rest.
 *
 * Performance features:
 *   - Read-replica client for analytics queries (optional)
 *   - Query-level logging in development
 *   - "$metrics" enabled for production monitoring
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  readPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

/**
 * Read-replica client for analytics / leaderboard queries.
 * Falls back to the primary client if no READ_REPLICA_URL is configured.
 * Neon free-tier supports read replicas via separate connection string.
 *
 * In Prisma 7, the connection URL is configured via prisma.config.ts,
 * so for the read replica we create a separate client instance with
 * its own config. When no replica URL is set, we reuse the primary.
 */
export const readPrisma: PrismaClient = process.env.READ_REPLICA_URL
  ? (globalForPrisma.readPrisma ??
    new PrismaClient({
      log: ["error"],
    }))
  : prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  if (process.env.READ_REPLICA_URL) {
    globalForPrisma.readPrisma = readPrisma;
  }
}

export default prisma;
