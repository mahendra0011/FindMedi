import mongoose from 'mongoose';

/**
 * File 13 §13.6: patient flags. `blacklisted`/`deceased` are hard stops
 * enforced at billing + booking time (routes/masters.js patientHardStop).
 */
const patientFlagSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  kind: {
    type: String, required: true,
    enum: ['allergy', 'vip', 'fall-risk', 'isolation', 'difficult-vein', 'blacklisted', 'deceased', 'mlc', 'other'],
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  note: { type: String, default: '', maxlength: 500 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

patientFlagSchema.index({ hospitalId: 1, patient: 1, active: 1 });

export default mongoose.models.PatientFlag || mongoose.model('PatientFlag', patientFlagSchema);
