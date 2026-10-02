import mongoose from 'mongoose';

/**
 * APPT-M-01: waitlist / slot-cancellation backfill.
 *
 * The product could cancel (or fail to renew) an appointment and the freed slot
 * simply evaporated - nobody waiting for it ever knew. A WaitlistEntry is a
 * patient's claim on the NEXT free instance of one (doctorId, date, time).
 *
 * Lifecycle:
 *   waiting  -> offered    a seat freed; a Pending hold appointment was created
 *                          with checkoutExpiresAt = offerExpiresAt (15 min), so
 *                          the existing checkout sweeps ARE the offer expiry.
 *   offered  -> accepted   the patient paid against the hold (checkout auto-
 *                          confirms it) and the accept endpoint recorded it.
 *   offered  -> expired    the 15-minute window passed unpaid (sweep) or the
 *                          doctor has no configured fee (never offerable).
 *   waiting/offered -> cancelled  the patient left the list (DELETE) - an
 *                          offered entry also releases its hold and cascades.
 *   offered  -> declined   explicit decline; release + cascade.
 *
 * One ACTIVE entry (waiting|offered) per patient per slot - the partial unique
 * index below is the queue's "no double-join" rule, enforced by the database
 * rather than a read-then-write race.
 */
const waitlistEntrySchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctorName: { type: String, default: '' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: undefined },
  department: { type: String, default: 'General' },
  // Same string formats as Appointment: YYYY-MM-DD / HH:MM.
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: {
    type: String,
    enum: ['waiting', 'offered', 'accepted', 'expired', 'cancelled', 'declined'],
    default: 'waiting',
  },
  // The Pending appointment materialised for this entry when a seat opened.
  offerAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  // Fee snapshot shown to the patient on the offer card (informational - the
  // authoritative amount at pay time still comes from pricingService).
  offerFee: { type: Number, default: 0 },
  offeredAt: { type: Date, default: null },
  offerExpiresAt: { type: Date, default: null },
  // Terminal-state bookkeeping ('offer expired', 'no fee configured', ...).
  note: { type: String, default: '' },
}, { timestamps: true });

// One active claim per patient per slot; `createdAt` orders the FIFO queue.
waitlistEntrySchema.index(
  { patientId: 1, doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['waiting', 'offered'] } } }
);
// The expiry sweep: status + due time.
waitlistEntrySchema.index({ status: 1, offerExpiresAt: 1 });
// "did this patient's offer already get claimed" lookups during checkout.
waitlistEntrySchema.index({ patientId: 1, status: 1 });
// Per-slot FIFO queue reads (oldest waiting entry first).
waitlistEntrySchema.index({ doctorId: 1, date: 1, time: 1, status: 1, createdAt: 1 });

export default mongoose.model('WaitlistEntry', waitlistEntrySchema);
