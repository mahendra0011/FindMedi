// Dual-write shim: MongoDB (primary today) -> PostgreSQL (new money ledger).
// Fire-and-forget behind ENABLE_PG_DUAL_WRITE=true. PG failures NEVER fail the
// request — they are logged for the reconciliation script to catch.
// Cutover (reads from PG) happens only after zero-drift reconciliation.

import { getPrisma, isPgEnabled } from './prisma.js';
import logger from '../config/logger.js';
// 'Not Submitted' -> NOT_SUBMITTED, 'held_in_escrow' -> HELD_IN_ESCROW, 'card' -> CARD
export const toPgEnum = (v, fallback = null) => {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v).trim().toUpperCase().replace(/[\s-]+/g, '_');
};

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

async function mirror(model, data, key) {
  if (!isPgEnabled()) return null;
  try {
    const prisma = await getPrisma();
    if (!prisma) return null;
    return await prisma[model].upsert({ where: key.where, update: key.update || {}, create: data });
  } catch (err) {
    logger.warn(`[PG-DUAL-WRITE] ${model} mirror failed (request unaffected): ${err.message}`);
    return null;
  }
}

export const ledgerRow = (doc) => ({
  mongoId: String(doc._id),
  facilityId: doc.facilityId || null,
  facilityName: doc.facilityName || null,
  facilityType: doc.facilityType || 'hospital',
  providerId: doc.providerId ? String(doc.providerId) : null,
  userId: doc.userId ? String(doc.userId) : null,
  source: toPgEnum(doc.source, 'OTHER'),
  sourceId: doc.sourceId ? String(doc.sourceId) : null,
  bookingNumber: doc.bookingNumber || null,
  patientName: doc.patientName || null,
  amount: num(doc.amount),
  commissionPercent: num(doc.commissionPercent, 10),
  commissionAmount: num(doc.commissionAmount),
  taxAmount: num(doc.taxAmount),
  netAmount: num(doc.netAmount),
  entryType: toPgEnum(doc.entryType, 'CREDIT'),
  status: toPgEnum(doc.status, 'COMPLETED'),
});

export const mirrorLedgerEntry = (doc) =>
  mirror('transactionLedger', ledgerRow(doc), { where: { mongoId: String(doc._id) } });

export const paymentRow = (doc) => ({
  transactionId: doc.transactionId,
  patientId: String(doc.patient_id || doc.patientId || ''),
  patientName: doc.patientName || '',
  amount: num(doc.amount),
  method: toPgEnum(doc.method, 'CARD'),
  status: toPgEnum(doc.status, 'COMPLETED'),
  invoiceId: doc.invoiceId || null,
  serviceType: toPgEnum(doc.serviceType, 'APPOINTMENT'),
  referenceId: doc.referenceId ? String(doc.referenceId) : null,
  description: doc.description || null,
  provider: doc.provider || null,
  refundAmount: num(doc.refundAmount),
  hospitalId: doc.hospitalId ? String(doc.hospitalId) : null,
  lineItems: doc.lineItems ?? null,
});

export const mirrorPayment = (doc) =>
  mirror('payment', paymentRow(doc), { where: { transactionId: doc.transactionId } });

export const billingRow = (doc) => ({
  invoiceId: doc.invoiceId,
  patientId: String(doc.patientId || ''),
  patientName: doc.patientName || '',
  doctorId: doc.doctorId ? String(doc.doctorId) : null,
  doctorName: doc.doctorName || null,
  appointmentId: doc.appointmentId ? String(doc.appointmentId) : null,
  admissionId: doc.admissionId || null,
  services: doc.services ?? [],
  source: toPgEnum(doc.source, 'MANUAL'),
  amount: num(doc.amount),
  subTotal: num(doc.subTotal),
  discount: num(doc.discount),
  tax: num(doc.tax),
  taxRate: num(doc.taxRate),
  paid: num(doc.paid),
  balance: num(doc.balance),
  status: toPgEnum(doc.status, 'PENDING'),
  dueDate: doc.dueDate ? new Date(doc.dueDate) : null,
  paymentMethod: doc.paymentMethod || null,
  insuranceStatus: toPgEnum(doc.insuranceStatus, 'NOT_SUBMITTED'),
  insuranceApprovedAmt: num(doc.insuranceApprovedAmt),
  hospitalId: doc.hospitalId ? String(doc.hospitalId) : null,
  facilityId: doc.facilityId ? String(doc.facilityId) : null,
});

export const mirrorBilling = (doc) =>
  mirror('billing', billingRow(doc), { where: { invoiceId: doc.invoiceId } });

export const mirrorInsurance = (doc) =>
  mirror('insurance', {
    claimId: doc.claimId,
    patientId: String(doc.patientId || ''),
    patientName: doc.patientName || '',
    admissionId: doc.admissionId || null,
    insuranceProvider: doc.insuranceProvider || '',
    policyNumber: doc.policyNumber || '',
    tpaName: doc.tpaName || null,
    tpaContact: doc.tpaContact || null,
    coverageType: toPgEnum(doc.coverageType, 'CASHLESS'),
    preAuthAmount: doc.preAuthAmount != null ? num(doc.preAuthAmount) : null,
    preAuthStatus: toPgEnum(doc.preAuthStatus, 'NOT_REQUIRED'),
    preAuthDate: doc.preAuthDate ? new Date(doc.preAuthDate) : null,
    preAuthExpiry: doc.preAuthExpiry ? new Date(doc.preAuthExpiry) : null,
    claimAmount: doc.claimAmount != null ? num(doc.claimAmount) : null,
    approvedAmount: doc.approvedAmount != null ? num(doc.approvedAmount) : null,
    claimStatus: toPgEnum(doc.claimStatus, 'NOT_FILED'),
    claimDate: doc.claimDate ? new Date(doc.claimDate) : null,
    settlementDate: doc.settlementDate ? new Date(doc.settlementDate) : null,
    documents: doc.documents ?? null,
    diagnosis: doc.diagnosis || null,
    treatmentPlan: doc.treatmentPlan || null,
    estimatedCost: doc.estimatedCost != null ? num(doc.estimatedCost) : null,
    remarks: doc.remarks || null,
    hospitalId: doc.hospitalId ? String(doc.hospitalId) : null,
    createdBy: doc.createdBy ? String(doc.createdBy) : null,
  }, { where: { claimId: doc.claimId } });

export const mirrorCommissionConfig = (doc) =>
  mirror('commissionConfig', {
    facilityId: String(doc.facilityId || ''),
    facilityName: doc.facilityName || null,
    facilityType: toPgEnum(doc.facilityType, 'HOSPITAL'),
    commissionPercent: num(doc.commissionPercent, 10),
    commissionCap: num(doc.commissionCap),
    payoutSchedule: toPgEnum(doc.payoutSchedule, 'MONTHLY'),
    totalEarnings: num(doc.totalEarnings),
    pendingPayout: num(doc.pendingPayout),
    lastPayoutDate: doc.lastPayoutDate ? new Date(doc.lastPayoutDate) : null,
    status: toPgEnum(doc.status, 'ACTIVE'),
  }, { where: { facilityId: String(doc.facilityId || '') } });

export const payoutRow = (doc) => ({
  mongoId: String(doc._id),
  facilityId: String(doc.facilityId || ''),
  facilityName: doc.facilityName || null,
  facilityType: doc.facilityType || 'hospital',
  periodStart: doc.periodStart ? new Date(doc.periodStart) : new Date(),
  periodEnd: doc.periodEnd ? new Date(doc.periodEnd) : new Date(),
  grossRevenue: num(doc.grossRevenue),
  commissionAmount: num(doc.commissionAmount),
  netPayout: num(doc.netPayout),
  transactionCount: num(doc.transactionCount),
  status: toPgEnum(doc.status, 'PENDING'),
  paidAt: doc.paidAt ? new Date(doc.paidAt) : null,
  transactionRef: doc.transactionRef || null,
  notes: doc.notes || null,
  approvals: doc.approvals ?? null,
});

export const mirrorPayout = (doc) =>
  mirror('payout', payoutRow(doc), { where: { mongoId: String(doc._id) } });

// ── Atomic multi-model write (File 03 Part A / Part D Step 4) ────────────────
//
// The failure this closes: Payment.create() → TransactionLedger → Payout.
// Without a transaction, a crash between steps leaves a COMPLETED payment
// with no ledger entry, so facility payouts silently under-count with no
// database-level way to detect it.
//
// Every write below is an UPSERT keyed on a natural unique column, so replaying
// a partially-applied batch is safe (idempotent). If any statement throws,
// Prisma rolls the whole batch back and the caller can retry cleanly.
//
// NEVER throws: PG is a mirror, not the system of record. The Mongo write has
// already committed by the time this runs, so failing the HTTP request would be
// worse than a missing mirror row (which reconcile-pg.mjs will flag).
//
// @param {Array<{model: string, data: object, where: object}>} ops
// @returns {Promise<{ok: boolean, count?: number, reason?: string}>}
export const mirrorAtomic = async (ops) => {
  if (!isPgEnabled()) return { ok: false, reason: 'pg_disabled' };
  if (!Array.isArray(ops) || ops.length === 0) return { ok: false, reason: 'no_ops' };
  try {
    const prisma = await getPrisma();
    if (!prisma) return { ok: false, reason: 'prisma_unavailable' };

    await prisma.$transaction(
      ops.map(({ model, data, where }) =>
        prisma[model].upsert({ where, update: data, create: data }),
      ),
    );
    return { ok: true, count: ops.length };
  } catch (err) {
    logger.warn(`[PG-ATOMIC] ${ops.length}-op transaction rolled back (request unaffected): ${err.message}`);
    return { ok: false, reason: err.message };
  }
};

/**
 * Payout → claimed TransactionLedger rows written in ONE transaction.
 *
 * Mirrors the Mongo `Payout.create()` + `TransactionLedger.updateMany({ payoutId })`
 * pair so PG can never show a payout whose revenue lines are unclaimed.
 *
 * NOTE: `TransactionLedger.payoutId` is a relation FK to `Payout.id` (the PG
 * uuid), NOT `Payout.mongoId`. So this must be an INTERACTIVE transaction: we
 * upsert the payout first, read back its PG id, then stamp that id onto the
 * ledger rows. Using the Mongo id here would violate the foreign key.
 */
export const mirrorPayoutWithLedger = async ({ payoutDoc, ledgerDocs = [] } = {}) => {
  if (!isPgEnabled()) return { ok: false, reason: 'pg_disabled' };
  if (!payoutDoc) return { ok: false, reason: 'no_payout' };
  try {
    const prisma = await getPrisma();
    if (!prisma) return { ok: false, reason: 'prisma_unavailable' };

    const payload = payoutRow(payoutDoc);
    return await prisma.$transaction(async (tx) => {
      const pgPayout = await tx.payout.upsert({
        where: { mongoId: payload.mongoId },
        update: payload,
        create: payload,
      });
      for (const ledger of ledgerDocs) {
        const row = { ...ledgerRow(ledger), payoutId: pgPayout.id };
        await tx.transactionLedger.upsert({
          where: { mongoId: row.mongoId },
          update: row,
          create: row,
        });
      }
      return { ok: true, count: ledgerDocs.length + 1 };
    });
  } catch (err) {
    logger.warn(`[PG-ATOMIC] payout+ledger transaction rolled back (request unaffected): ${err.message}`);
    return { ok: false, reason: err.message };
  }
};

/**
 * Payment + its TransactionLedger row written in ONE transaction.
 * `ledgerDoc` is optional — pass it when a ledger entry was created alongside
 * the payment so the two can never drift.
 */
export const mirrorPaymentWithLedger = async ({ paymentDoc, ledgerDoc } = {}) => {
  if (!paymentDoc) return { ok: false, reason: 'no_payment' };
  const ops = [{ model: 'payment', data: paymentRow(paymentDoc), where: { transactionId: paymentDoc.transactionId } }];
  if (ledgerDoc) {
    ops.push({ model: 'transactionLedger', data: ledgerRow(ledgerDoc), where: { mongoId: String(ledgerDoc._id) } });
  }
  return mirrorAtomic(ops);
};
