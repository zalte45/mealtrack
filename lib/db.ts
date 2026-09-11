/**
 * Prisma Client Singleton (Lazy Initialized)
 *
 * Prevents multiple Prisma Client instances during Next.js hot reload in development.
 * In production, a single instance is used per server process.
 *
 * Utilizes a Proxy to lazily instantiate PrismaClient only when first accessed.
 * This prevents build-time crashes on Vercel when API routes are statically evaluated.
 *
 * Pattern: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Internal helper to get or create the Prisma instance lazily
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return globalForPrisma.prisma;
}

// Export the lazy proxy strictly typed as PrismaClient
export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop);
    
    // Bind functions to the actual PrismaClient instance to preserve `this` context
    if (typeof value === "function") {
      return value.bind(client);
    }
    
    return value;
  },
});
