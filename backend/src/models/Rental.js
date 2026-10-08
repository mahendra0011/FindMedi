import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';
import { RENTAL_STATUS } from '../lib/flowStates.js';

// FLOW-G (5.md 8, 10.md 2.10):
//   REQUESTED -> APPROVED -> ACTIVE -> RETURNED -> INSPECTION -> CLOSED
//   | REJECTED | CANCELLED, and CLOSED -> DEPOSIT_REFUNDED on close.
//
// Two principals act on this row — the renter and the vendor — so BOTH owner
// ids are stored (`userId`, `vendorOwnerId`) and authorizeObject is given
// `ownerFields`. ownerLoader resolves exactly ONE owner, which would deny the
// other half of the conversation. The renter field is `userId` (the repo-wide
// "the person this row belongs to") rather than a role-specific alias, so the
// data dictionary classifies this collection as holding personal data instead
// of reporting it as PII-free.
//
// Every price on the row (`ratePerDay`, `rentalAmount`, `deposit`) is copied
// from the AssetUnit and computed server-side at creation (computeRentalTotals)
// and never re-read from a request afterwards: 5.md 15 "server-owned pricing,
// ignore client amounts". The rate is locked for the term of this rental even
// if the vendor reprices the unit.

const rentalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  // Denormalized from Provider.ownerUserId at creation (see header).
  vendorOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assetUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetUnit', required: true, index: true },

  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },

  days: { type: Number, min: 1, max: 366, default: 1 },
  ratePerDay: { type: Number, required: true, min: 0, max: 1000000 },
  rentalAmount: { type: Number, required: true, min: 0, max: 100000000 },
  deposit: { type: Number, min: 0, max: 1000000, default: 0 },
  depositRefundAmount: { type: Number, min: 0, default: null },
  currency: { type: String, maxlength: 3, default: 'INR' },

  // Deposit hold: which payment carries it. `held` records the intent; the
  // release step (CLOSED -> DEPOSIT_REFUNDED) is what clears it.
  depositPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

  conditionOut: [{ type: String, maxlength: 300 }],
  conditionIn: [{ type: String, maxlength: 300 }],
  damage: {
    notes: { type: String, maxlength: 2000, default: '' },
    amount: { type: Number, min: 0, default: 0 },
  },

  sanitisation: {
    requiredCycleDays: { type: Number, min: 0, max: 365, default: 0 },
    performedAt: { type: Date, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, maxlength: 500, default: '' },
  },

  status: { type: String, enum: Object.values(RENTAL_STATUS), default: RENTAL_STATUS.REQUESTED, index: true },
  cancelReason: { type: String, maxlength: 500, default: '' },

  requestedAt: { type: Date, default: null },
  approvedAt: { type: Date, default: null },
  activatedAt: { type: Date, default: null },
  returnedAt: { type: Date, default: null },
  inspectedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  depositRefundedAt: { type: Date, default: null },

  history: [{
    from: { type: String, enum: Object.values(RENTAL_STATUS), required: true },
    to: { type: String, enum: Object.values(RENTAL_STATUS), required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, maxlength: 40, default: '' },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

rentalSchema.index({ userId: 1, status: 1 });
rentalSchema.index({ vendorId: 1, status: 1 });
rentalSchema.index({ assetUnitId: 1, status: 1 });

rentalSchema.plugin(moneyRounding([
  'ratePerDay', 'rentalAmount', 'deposit', 'depositRefundAmount', 'damage.amount',
]));

export default mongoose.models.Rental || mongoose.model('Rental', rentalSchema);
