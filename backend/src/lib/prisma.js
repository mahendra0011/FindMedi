// Prisma singleton for the PostgreSQL side (money + medical-legal records).
// Lazy: importing this file never connects. Call getPrisma() only when
// ENABLE_PG_DUAL_WRITE=true or a PG-backed path runs.

let client = null;
let failed = false;

export function isPgEnabled() {
  return process.env.ENABLE_PG_DUAL_WRITE === 'true' && !!process.env.DATABASE_URL;
}

export async function getPrisma() {
  if (client) return client;
  if (failed) return null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    client = new PrismaClient();
    return client;
  } catch (err) {
    failed = true;
    const { default: logger } = await import('../config/logger.js').catch(() => ({ default: console }));
    logger.warn(`[PG] Prisma client unavailable, dual-write skipped: ${err.message}`);
    return null;
  }
}

export async function pgHealth() {
  const prisma = await getPrisma();
  if (!prisma) return { enabled: isPgEnabled(), connected: false };
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { enabled: true, connected: true };
  } catch (err) {
    return { enabled: true, connected: false, error: err.message };
  }
}
