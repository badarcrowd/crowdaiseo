import { PrismaClient } from "@prisma/client";
import { serverEnv } from "@/config/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      serverEnv.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
    datasources: {
      db: {
        // Use direct connection in dev to avoid pgbouncer prepared statement conflicts
        url: serverEnv.NODE_ENV === "development" 
          ? (process.env.DIRECT_URL ?? serverEnv.DATABASE_URL)
          : serverEnv.DATABASE_URL,
      },
    },
  });

if (serverEnv.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
