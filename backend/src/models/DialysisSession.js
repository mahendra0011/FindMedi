import mongoose from 'mongoose';

// 7.md §3.16 dialysis session records: pre/post weight, BP, UF (ultrafiltrate
// removed), plus the per-session infection-control flag (HBV/HCV isolation).
// Machine/shift scheduling rides the existing appointment series, recurring
// slots are AppointmentSeries rows, consumables are Inventory, billing is
// billing — this model is the clinical session itself. Provider-owned;
// patients read their own through GET /mine.
export const DIALYSIS_ISOLATION = ['none', 'hbv', 'hcv', 'hbv_hcv', 'other'];

const dialysisSessionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  machineId: { type: String, trim: true, maxlength: 80, default: '' },
  date: { type: String, required: true },
  preWeightKg: { type: Number, min: 20, max: 300, required: true },
  postWeightKg: { type: Number, min: 20, max: 300, required: true },
  preSystolic: { type: Number, min: 50, max: 300 },
  preDiastolic: { type: Number, min: 30, max: 200 },
  postSystolic: { type: Number, min: 50, max: 300 },
  postDiastolic: { type: Number, min: 30, max: 200 },
  ufLitres: { type: Number, min: 0, max: 10 },
  durationMin: { type: Number, min: 30, max: 600 },
  isolation: { type: String, enum: DIALYSIS_ISOLATION, default: 'none', index: true },
  complications: { type: String, trim: true, maxlength: 500, default: '' },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

dialysisSessionSchema.index({ patientId: 1, date: -1 });

export default mongoose.model('DialysisSession', dialysisSessionSchema);
