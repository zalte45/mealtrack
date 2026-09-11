/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma Client instances during Next.js hot reload in development.
 * In production, a single instance is used per server process.
 *
 * Pattern: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
