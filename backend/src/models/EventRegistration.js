import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';
import { REGISTRATION_STATUS } from '../lib/flowStates.js';

// FLOW-E: one row per person per event, and the SEAT it holds.
//
// `checkInCode` is generated server-side (CSPRNG from utils/secureRandom) and
// is what the QR on the ticket encodes — no third-party QR library, and
// nothing the client can mint. The organiser's check-in endpoint compares it;
// a forged code is simply a wrong string.
//
// `feeAmount` is copied from Event.fee at registration time so an organiser
// raising the price later cannot change what THIS attendee owes, or what their
// refund is.

const registrationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  status: { type: String, enum: Object.values(REGISTRATION_STATUS), default: REGISTRATION_STATUS.REGISTERED, index: true },

  feeAmount: { type: Number, min: 0, default: 0 },
  currency: { type: String, maxlength: 3, default: 'INR' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },

  checkInCode: { type: String, required: true, maxlength: 32 },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  consentGivenAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, maxlength: 500, default: '' },
  refundedAt: { type: Date, default: null },
  refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund', default: null },
}, { timestamps: true });

// 5.md 6 "one-registration-per-person": the unique index is the enforcement —
// a pre-read in the handler narrows the race but does not close it.
registrationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, status: 1 });

registrationSchema.plugin(moneyRounding(['feeAmount']));

export default mongoose.models.EventRegistration || mongoose.model('EventRegistration', registrationSchema);
