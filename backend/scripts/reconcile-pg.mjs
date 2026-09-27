/**
 * PG dual-write reconciliation (read-only, zero writes).
 *
 * Compares MongoDB (primary today) vs PostgreSQL (dual-write mirror) for the
 * six money models: Payment, Billing, Insurance, TransactionLedger, Payout,
 * CommissionConfig. Compares document counts + money totals in paise (avoids
 * float/Decimal representation noise).
 *
 * Exit codes: 0 = zero drift (safe to cut reads over), 1 = drift found,
 *             2 = skipped (PG not reachable / client not generated).
 *
 * Run:  node scripts/reconcile-pg.mjs
 * Env:  MONGO_URI + DATABASE_URL (see backend/.env.example)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/findmedi';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Paise-normalize any money value (Number, Decimal, string, null) -> integer.
const toPaise = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

async function mongoStats(db) {
  const sum = async (coll, field) => {
    const [r] = await db.collection(coll).aggregate([
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ]).toArray();
    return toPaise(r?.total);
  };
  const count = (coll) => db.collection(coll).estimatedDocumentCount();
  return {
    payment: { count: await count('payments'), amountPaise: await sum('payments', 'amount') },
    billing: { count: await count('billings'), amountPaise: await sum('billings', 'amount') },
    insurance: { count: await count('insurances'), claimPaise: await sum('insurances', 'claimAmount') },
    ledger: {
      count: await count('transactionledgers'),
      amountPaise: await sum('transactionledgers', 'amount'),
      netPaise: await sum('transactionledgers', 'netAmount'),
    },
    payout: { count: await count('payouts'), netPaise: await sum('payouts', 'netPayout') },
    commissionConfig: { count: await count('commissionconfigs') },
  };
}

async function pgStats(prisma) {
  const [pCount, pSum] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);
  const [bCount, bSum] = await Promise.all([
    prisma.billing.count(),
    prisma.billing.aggregate({ _sum: { amount: true } }),
  ]);
  const [iCount, iSum] = await Promise.all([
    prisma.insurance.count(),
    prisma.insurance.aggregate({ _sum: { claimAmount: true } }),
  ]);
  const [lCount, lSum] = await Promise.all([
    prisma.transactionLedger.count(),
    prisma.transactionLedger.aggregate({ _sum: { amount: true, netAmount: true } }),
  ]);
  const [poCount, poSum] = await Promise.all([
    prisma.payout.count(),
    prisma.payout.aggregate({ _sum: { netPayout: true } }),
  ]);
  const ccCount = await prisma.commissionConfig.count();
  return {
    payment: { count: pCount, amountPaise: toPaise(pSum._sum.amount) },
    billing: { count: bCount, amountPaise: toPaise(bSum._sum.amount) },
    insurance: { count: iCount, claimPaise: toPaise(iSum._sum.claimAmount) },
    ledger: { count: lCount, amountPaise: toPaise(lSum._sum.amount), netPaise: toPaise(lSum._sum.netAmount) },
    payout: { count: poCount, netPaise: toPaise(poSum._sum.netPayout) },
    commissionConfig: { count: ccCount },
  };
}

async function main() {
  if (!DATABASE_URL) {
    console.log('SKIP: DATABASE_URL unset — PG mirror not configured, nothing to reconcile.');
    process.exit(2);
  }
  let PrismaClient;
  try {
    ({ PrismaClient } = await import('@prisma/client'));
  } catch {
    console.log('SKIP: @prisma/client not installed/generated — run `npm install` + `npx prisma generate` first.');
    process.exit(2);
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000, family: 4 });
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.log(`SKIP: PG unreachable (${err.message})`);
    await mongoose.disconnect();
    process.exit(2);
  }

  const [m, p] = await Promise.all([mongoStats(mongoose.connection.db), pgStats(prisma)]);
  const diffs = [];
  for (const key of Object.keys(m)) {
    for (const field of Object.keys(m[key])) {
      if (m[key][field] !== p[key][field]) {
        diffs.push(`${key}.${field}: mongo=${m[key][field]} pg=${p[key][field]}`);
      }
    }
  }

  console.log(JSON.stringify({ mongo: m, postgres: p }, null, 2));
  if (diffs.length) {
    console.error(`\nDRIFT (${diffs.length}):`);
    diffs.forEach((d) => console.error(`  - ${d}`));
    console.error('Do NOT cut reads over. Investigate dual-write gaps first.');
    process.exitCode = 1;
  } else {
    console.log('\nOK: zero drift — reads can be cut over to PG.');
  }

  await Promise.all([mongoose.disconnect(), prisma.$disconnect()]);
}

main().catch((err) => { console.error('Failed:', err); process.exit(1); });
