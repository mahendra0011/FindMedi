import mongoose from 'mongoose';
import { randomDigits } from '../utils/secureRandom.js';

const demoPaymentSchema = new mongoose.Schema({
  bookingType: {
    type: String,
    enum: ['ride', 'assistant', 'lawyer', 'emergency_doctor'],
    default: 'ride',
    index: true,
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideBooking',
    index: true,
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssistantBooking',
    index: true,
  },
  lawyerBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawyerBooking',
    index: true,
  },
  doctorRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmergencyDoctorRequest',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  assistantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    index: true,
  },
  amount: { type: Number, required: true },
  method: {
    type: String,
    enum: ['demo_wallet', 'cash'],
    default: 'demo_wallet',
  },
  status: {
    type: String,
    // Spec 21 mock escrow lifecycle: held → paid(released) | refunded | failed.
    enum: ['pending', 'held_in_escrow', 'paid', 'refunded', 'failed'],
    default: 'pending',
    index: true,
  },
  transactionRef: {
    type: String,
    unique: true,
    default: () => `DEMO-TXN-${randomDigits(6)}`,
  },
  // PAY-B-12 + PAY-M-03: normalized per-booking claim key (`<bookingType>:<bookingId>`).
  // Distinct idempotency keys racing on the same booking must not double-debit:
  // the second insert fails on this unique index and is compensated (see
  // demoPayment.js claimDemoPayment). Sparse so legacy rows without it stay valid.
  bookingRef: {
    type: String,
  },
  paidAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

// PAY-B-12 + PAY-M-03: one payment row per booking. The DATABASE enforces the
// claim, not the handler's read-then-check. Sparse + partial filters so rows
// that do not carry a given id field (e.g. a ride payment has no bookingId)
// never collide with each other.
demoPaymentSchema.index(
  { bookingType: 1, bookingId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { bookingId: { $exists: true } } }
);
demoPaymentSchema.index(
  { bookingType: 1, rideId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { rideId: { $exists: true } } }
);
demoPaymentSchema.index(
  { bookingType: 1, lawyerBookingId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { lawyerBookingId: { $exists: true } } }
);
demoPaymentSchema.index(
  { bookingType: 1, doctorRequestId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { doctorRequestId: { $exists: true } } }
);
demoPaymentSchema.index(
  { bookingRef: 1 },
  { unique: true, sparse: true, partialFilterExpression: { bookingRef: { $type: 'string', $gt: '' } } }
);

export default mongoose.model('DemoPayment', demoPaymentSchema);
