import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma Client singleton for serverless environments.
 *
 * Prisma 7 uses the "client" engine which requires a driver adapter.
 * We use @prisma/adapter-neon which creates a WebSocket-based Pool
 * connection to Neon's serverless driver under the hood.
 *
 * In development, we attach the client to `globalThis` to prevent
 * creating multiple instances during hot reload.
 */

function createPrismaClient(
  connectionString: string,
  logLevels: Array<"query" | "info" | "warn" | "error">,
) {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: logLevels,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  readPrisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL ?? "";
const logLevels: Array<"query" | "info" | "warn" | "error"> =
  process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient(databaseUrl, logLevels);

/**
 * Read-replica client for analytics / leaderboard queries.
 * Falls back to the primary client if no READ_REPLICA_URL is configured.
 */
export const readPrisma: PrismaClient = process.env.READ_REPLICA_URL
  ? (globalForPrisma.readPrisma ??
    createPrismaClient(process.env.READ_REPLICA_URL, ["error"]))
  : prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  if (process.env.READ_REPLICA_URL) {
    globalForPrisma.readPrisma = readPrisma;
  }
}

export default prisma;
