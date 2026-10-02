import mongoose from 'mongoose';

/**
 * APPT-M-02: recurring appointment series.
 *
 * Deliberately a CONTAINER, not a scheduler: every occurrence is materialised
 * as a normal Appointment child (seriesId + seriesIndex) at booking time.
 * Nothing downstream - token queue, T-24h/T-2h reminders, billing, payment
 * confirmation, per-occurrence cancel/reschedule, waitlist fan-out - needs to
 * know what a "series" is; they already operate on Appointment rows. The
 * series document only answers "what was the pattern, and is it still live".
 */
const appointmentSeriesSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, default: '' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  doctor: { type: String, required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  department: { type: String, default: 'General' },
  type: { type: String, default: 'Consultation' },
  appointmentMode: { type: String, default: 'offline' },
  notes: { type: String, default: '' },
  symptoms: { type: String, default: '' },
  // weekly +7d, biweekly +14d, monthly same day-of-month (end-of-month clamped)
  frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], required: true },
  count: { type: Number, required: true, min: 2, max: 12 },
  startDate: { type: String, required: true },
  time: { type: String, required: true },
  occurrenceDates: [{ type: String }],
  occurrenceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  feesPerOccurrence: { type: Number, default: 0, min: 0 },
  totalFees: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  cancelledAt: { type: Date },
  cancellationReason: { type: String, default: '' },
}, { timestamps: true });

appointmentSeriesSchema.index({ patientId: 1, createdAt: -1 });
appointmentSeriesSchema.index({ doctorId: 1, startDate: 1 });

export default mongoose.model('AppointmentSeries', appointmentSeriesSchema);
