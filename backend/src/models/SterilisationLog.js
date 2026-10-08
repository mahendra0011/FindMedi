import mongoose from 'mongoose';

// 7.md §3.1 sterilisation log: autoclave cycles with indicators, for
// compliance (the row a NABH auditor asks for). Provider-scoped, never
// patient-linked — no PHI, but audit-logged anyway: a compliance trail that
// is not itself trailed is hearsay.
export const STERILISATION_METHODS = ['autoclave', 'dry_heat', 'chemical'];
export const STERILISATION_INDICATORS = ['pass', 'fail'];

const sterilisationLogSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  method: { type: String, enum: STERILISATION_METHODS, required: true, index: true },
  temperatureC: { type: Number, min: 0, max: 300 },
  durationMin: { type: Number, min: 1, max: 600 },
  indicator: { type: String, enum: STERILISATION_INDICATORS, required: true, index: true },
  machineId: { type: String, trim: true, maxlength: 80, default: '' },
  loadContents: { type: String, trim: true, maxlength: 500, default: '' },
  operatedBy: { type: String, trim: true, maxlength: 120, default: '' },
  date: { type: String, required: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

sterilisationLogSchema.index({ providerId: 1, date: -1 });

export default mongoose.model('SterilisationLog', sterilisationLogSchema);
