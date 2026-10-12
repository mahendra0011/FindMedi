import mongoose from 'mongoose';

/**
 * §7 imaging scheduling: one row per booked slot on a modality machine.
 * Machine double-booking is enforced in the route (overlap query over active
 * statuses), not by a unique index, because a slot's window is only known
 * after the modality's slotDurationMinutes is applied.
 */
const imagingAppointmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  // Human-readable appointment number (IMG-…), used by the master search.
  appointmentNo: { type: String, default: '', index: true },
  radiologyOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Radiology', default: null, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  modalityType: {
    type: String,
    enum: ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Doppler', 'Mammography', 'OPG/CBCT', 'Fluoroscopy', 'Echo', 'DEXA', 'Nuclear Scan', 'PET Scan'],
    required: true,
  },
  machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'ImagingModality', default: null, index: true },
  room: { type: String, default: '' },
  scheduledStart: { type: Date, required: true },
  scheduledEnd: { type: Date, required: true },
  slotMinutes: { type: Number, default: 30, min: 5, max: 480 },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  radiologistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: {
    type: String,
    enum: ['Booked', 'Confirmed', 'Arrived', 'No Show', 'Cancelled', 'Rescheduled', 'Completed'],
    default: 'Booked',
  },
  slotType: { type: String, enum: ['Regular', 'Emergency', 'Maintenance Block'], default: 'Regular' },
  waitlistRank: { type: Number, default: null },
  notes: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

imagingAppointmentSchema.index({ hospitalId: 1, scheduledStart: 1 });

export default mongoose.model('ImagingAppointment', imagingAppointmentSchema);
