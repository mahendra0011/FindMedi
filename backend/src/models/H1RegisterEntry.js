import mongoose from 'mongoose';

/**
 * Checklist item 7: H1 / narcotic (Schedule X / NDPS) dispensing register.
 * Every dispense of a controlled-schedule medicine writes one row here —
 * patient + prescriber + drug + qty + Rx reference — so the statutory
 * register is a query, not a reconstruction from audit logs.
 */
export const REGISTER_SCHEDULES = new Set(['h1', 'x', 'narcotic_ndps']);
export const REGISTER_SCHEDULE_ALIASES = { H1: 'h1', X: 'x', NDPS: 'narcotic_ndps' };
const h1RegisterEntrySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  patientName: { type: String, required: true, maxlength: 200 },
  prescriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  prescriberName: { type: String, default: '', maxlength: 200 },
  prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null, index: true },
  prescriptionNo: { type: String, default: '', maxlength: 60 },
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', default: null },
  medicineName: { type: String, required: true, maxlength: 300 },
  // Canonical schedule token at dispense time (h1 / x / narcotic_ndps).
  rxSchedule: { type: String, required: true, maxlength: 30 },
  quantity: { type: Number, required: true, min: 1 },
  dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dispensedByName: { type: String, default: '', maxlength: 200 },
  dispensedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

h1RegisterEntrySchema.index({ hospitalId: 1, dispensedAt: -1 });

export default mongoose.models.H1RegisterEntry || mongoose.model('H1RegisterEntry', h1RegisterEntrySchema);
