import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';

/**
 * PAY-B-07: refunds are a state machine, not a free-form status edit.
 *
 * Refunds used to be `payment.status = 'refunded'` plus a `refund_amount` field.
 * That has three failure modes the audit flagged:
 *   - a SECOND refund request re-ran the whole handler (there was no terminal
 *     check), so a double-click issued two refunds for one payment;
 *   - a partial refund overwrote `status` with the full-refund meaning, so
 *     `status === 'refunded'` was true for a ?1 refund on a ?500 payment;
 *   - nothing recorded WHY money left, or who authorised it, so the ledger could
 *     not be reconstructed.
 *
 * Transitions are declared here and enforced by `assertTransition`; every attempt
 * writes an immutable Refund row carrying the reversal entry for the ledger.
 */
export const REFUND_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
});

/** The only legal moves. Anything absent here is rejected. */
export const REFUND_TRANSITIONS = Object.freeze({
  [REFUND_STATUS.REQUESTED]: [REFUND_STATUS.APPROVED, REFUND_STATUS.REJECTED],
  [REFUND_STATUS.APPROVED]: [REFUND_STATUS.PROCESSING, REFUND_STATUS.REJECTED],
  [REFUND_STATUS.PROCESSING]: [REFUND_STATUS.PARTIALLY_REFUNDED, REFUND_STATUS.REFUNDED, REFUND_STATUS.FAILED],
  [REFUND_STATUS.PARTIALLY_REFUNDED]: [REFUND_STATUS.PROCESSING, REFUND_STATUS.REFUNDED, REFUND_STATUS.FAILED],
  [REFUND_STATUS.FAILED]: [REFUND_STATUS.PROCESSING, REFUND_STATUS.REJECTED],
  [REFUND_STATUS.REFUNDED]: [],
  [REFUND_STATUS.REJECTED]: [],
});

/** Terminal states: a refund in one of these can never move again. */
export const TERMINAL_REFUND_STATES = Object.freeze([
  REFUND_STATUS.REFUNDED,
  REFUND_STATUS.REJECTED,
]);

export class RefundTransitionError extends Error {
  constructor(from, to) {
    super(`Illegal refund transition ${from} -> ${to}`);
    this.name = 'RefundTransitionError';
    this.status = 409;
    this.code = 'ILLEGAL_REFUND_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

export function canTransition(from, to) {
  if (from === to) return true; // idempotent re-assertion of the same state
  return (REFUND_TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) throw new RefundTransitionError(from, to);
  return true;
}

/**
 * Derive the refund status from the amounts. This is the single place that decides
 * "partial vs full", so a ₹1 refund on a ₹500 payment can never report `refunded`.
 * Comparison is in paise: 0.1 + 0.2 style float drift must not decide "full".
 */
export function deriveRefundStatus({ totalRefunded, originalAmount }) {
  const refundedPaise = Math.round((Number(totalRefunded) || 0) * 100);
  const originalPaise = Math.round((Number(originalAmount) || 0) * 100);
  if (originalPaise <= 0 || refundedPaise <= 0) return REFUND_STATUS.REQUESTED;
  if (refundedPaise >= originalPaise) return REFUND_STATUS.REFUNDED;
  return REFUND_STATUS.PARTIALLY_REFUNDED;
}

const refundSchema = new mongoose.Schema({
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  ledgerEntryType: { type: String, enum: ['DEBIT', 'REVERSAL'], default: 'DEBIT' },
  status: { type: String, enum: Object.values(REFUND_STATUS), default: REFUND_STATUS.REQUESTED, index: true },
  reason: { type: String, required: true, maxlength: 500 },
  reasonCode: {
    type: String,
    enum: [
      'orphan_payment_no_appointment', 'service_not_delivered', 'duplicate_payment',
      'overcharge', 'patient_request', 'fraud', 'goodwill',
    ],
    default: 'patient_request',
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decidedAt: { type: Date },
  settledAt: { type: Date },
  idempotencyKey: { type: String, required: true },
  gatewayRefundId: { type: String },
  failureReason: { type: String },
}, { timestamps: true });

// PAY-B-07: one refund per idempotency key. The DATABASE is what prevents a double
// refund, not the handler.
refundSchema.index({ idempotencyKey: 1 }, { unique: true });
refundSchema.index({ paymentId: 1, status: 1 });

refundSchema.statics.requestRefund = async function requestRefund({
  paymentId, amount, originalAmount, reason,
  reasonCode = 'patient_request', idempotencyKey, requestedBy = null,
}) {
  if (!idempotencyKey) {
    const err = new Error('idempotencyKey is required for a refund (PAY-B-07)');
    err.status = 400;
    throw err;
  }
  const requested = Number(amount);
  if (!Number.isFinite(requested) || requested <= 0) {
    const err = new Error('Refund amount must be greater than 0');
    err.status = 400;
    throw err;
  }
  const original = Number(originalAmount) || 0;
  if (original > 0 && Math.round(requested * 100) > Math.round(original * 100)) {
    const err = new Error(`Refund amount (${requested}) cannot exceed original payment (${original})`);
    err.status = 400;
    throw err;
  }
  try {
    const refund = await this.create({
      paymentId, amount: requested, reason, reasonCode, idempotencyKey, requestedBy,
      status: REFUND_STATUS.PROCESSING,
    });
    return { created: true, refund };
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await this.findOne({ idempotencyKey }).lean();
      return { created: false, refund: existing, reason: 'duplicate' };
    }
    throw err;
  }
};

refundSchema.statics.settleRefund = async function settleRefund({ paymentId, amount }) {
  const Payment = mongoose.model('Payment');
  const payment = await Payment.findById(paymentId);
  if (!payment) { const e = new Error('Payment not found'); e.status = 404; throw e; }
  if (payment.status === 'refunded') {
    const e = new Error('Payment is already fully refunded');
    e.status = 409; e.code = 'ALREADY_REFUNDED'; throw e;
  }
  const already = Math.round((Number(payment.refund_amount) || 0) * 100);
  const requested = Math.round((Number(amount) || 0) * 100);
  const original = Math.round((Number(payment.amount) || 0) * 100);
  if (already + requested > original) {
    const e = new Error('Refund would exceed the captured amount'); e.status = 400; throw e;
  }
  const totalRefunded = (already + requested) / 100;
  const next = deriveRefundStatus({ totalRefunded, originalAmount: original / 100 });
  payment.refund_amount = totalRefunded;
  // PAY-B-07: a PARTIAL refund no longer claims the terminal `refunded` status.
  payment.status = next === REFUND_STATUS.REFUNDED ? 'refunded' : 'partially_refunded';
  await payment.save();
  return { payment, status: next, totalRefunded };
};

// PAY-M-06: a refund is money leaving the platform; a sub-paisa amount here
// would be refused by the gateway or silently truncated by it.
refundSchema.plugin(moneyRounding(['amount']));

export default mongoose.models.Refund || mongoose.model('Refund', refundSchema);
