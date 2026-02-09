import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton for serverless environments.
 *
 * In development, we attach the client to `globalThis` to prevent
 * creating multiple instances during hot reload.
 *
 * In production (serverless), each cold start creates a new client
 * but Neon's connection pooling handles the rest.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
