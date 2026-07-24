import { PrismaClient } from "@prisma/client";

// Singleton : en dev, le hot-reload recrée le module à chaque sauvegarde et
// ouvrirait autant de connexions SQLite.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
