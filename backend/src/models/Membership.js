import mongoose from 'mongoose';
import { MEMBERSHIP_STATUS, MEMBERSHIP_STATUSES } from '../lib/flowStates.js';
import { moneyRounding } from '../utils/money.js';

/**
 * FLOW-D (5.md 5, 10.md 2.11): the PURCHASED row — one member's term under one
 * Plan. The state machine lives in lib/flowStates.js and the enum is taken
 * from it, exactly like Quote takes QUOTE_STATUS: the route asserts a move
 * against MEMBERSHIP_TRANSITIONS before it writes, so a body-supplied
 * `status: 'ACTIVE'` from CANCELLED is a 409 rather than a silent resubscribe.
 *
 * Two principals are stored on the row (`userId` who the term belongs to,
 * `providerId` who sells it) so either side can be authorized from one read,
 * the same reason Quote carries patientId + providerOwnerId.
 */
const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },

  status: { type: String, enum: MEMBERSHIP_STATUSES, default: MEMBERSHIP_STATUS.TRIAL, index: true },

  startAt: { type: Date, required: true },
  endAt: { type: Date, index: true },

  // Class packs burn credits; time-based plans do not carry any. Null (not 0)
  // distinguishes "unlimited under this term" from "all sessions used".
  creditsLeft: { type: Number, min: 0, default: null },

  // e-mandate / UPI AutoPay reference for auto-renew (5.md 111). A reference,
  // never the mandate instrument itself.
  mandateRef: { type: String, maxlength: 120, default: '' },
  autoRenew: { type: Boolean, default: false },

  freeze: {
    frozenAt: { type: Date, default: null },
    resumeAt: { type: Date, default: null },
    daysUsed: { type: Number, min: 0, default: 0 },
    windows: [{
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      days: { type: Number, min: 0, required: true },
      reason: { type: String, maxlength: 300, default: '' },
    }],
  },

  // QR/app check-ins (5.md 104). Attendance is what consumes class-pack
  // credits, so it is recorded on the row rather than in a separate log.
  checkIns: [{
    at: { type: Date, default: Date.now },
    method: { type: String, enum: ['qr', 'app', 'manual'], default: 'qr' },
    location: { type: String, maxlength: 200, default: '' },
  }],

  pricePaid: { type: Number, min: 0, default: 0 },
  currency: { type: String, default: 'INR', maxlength: 3 },

  // 5.md rule 4 ("idempotency key on create/pay - double-click safe"): the
  // completed payment this term was bought with. The client never sends the
  // PRICE, only this id, and the partial unique index below makes a reused
  // paymentId a write-time error rather than a second paid row - the same
  // guard the row-level idempotency cache cannot give (that one keys on a
  // client-chosen header, this one keys on the money itself).
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

  pastDueSince: { type: Date, default: null },
  graceUntil: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancellationReason: { type: String, maxlength: 500, default: '' },

  // Per-row trail: same pattern as Quote.history — what happened to THIS
  // membership, without reading the platform audit log.
  history: [{
    from: { type: String, enum: MEMBERSHIP_STATUSES, required: true },
    to: { type: String, enum: MEMBERSHIP_STATUSES, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
    note: { type: String, maxlength: 300, default: '' },
  }],
}, { timestamps: true });

membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ providerId: 1, status: 1 });
membershipSchema.index({ status: 1, endAt: 1 });
// Partial (not sparse): a plain unique index would treat two `null` paymentIds
// (free plans) as a collision. Only real ids are checked.
membershipSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: 'objectId' } } }
);

// PAY-M-06: money rounded at the write boundary, on documents and updates.
membershipSchema.plugin(moneyRounding(['pricePaid']));

// Transition enforcement is the ROUTE's job (read old status, assert against
// MEMBERSHIP_TRANSITIONS, write) — the same seam Quote uses. A pre-save hook
// cannot do it: mongoose never stores the previous value, so `from` is not
// knowable inside the hook without a second read, and guessing it would be
// worse than no guard. The enum above still refuses any status outside the
// machine's vocabulary.

export default mongoose.models.Membership || mongoose.model('Membership', membershipSchema);
