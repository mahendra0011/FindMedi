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

export const mirrorLedgerEntry = (doc) =>
  mirror('transactionLedger', {
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
  }, { where: { mongoId: String(doc._id) } });

export const mirrorPayment = (doc) =>
  mirror('payment', {
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
  }, { where: { transactionId: doc.transactionId } });

export const mirrorBilling = (doc) =>
  mirror('billing', {
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
  }, { where: { invoiceId: doc.invoiceId } });

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

export const mirrorPayout = (doc) =>
  mirror('payout', {
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
  }, { where: { mongoId: String(doc._id) } });
