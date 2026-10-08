import mongoose from 'mongoose';

// 7.md §3.16 water-quality logs: the dialysate water tests a centre runs
// (chlorine/chloramine breakthrough, TDS, bacterial load) with a pass/fail
// verdict. Facility-level — no patient linkage, no PHI — but audit-logged
// like the sterilisation log: a compliance trail that is not itself trailed
// is hearsay.
const dialysisWaterQualitySchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  freeChlorinePpm: { type: Number, min: 0, max: 10 },
  tdsPpm: { type: Number, min: 0, max: 2000 },
  bacterialCountCfuMl: { type: Number, min: 0, max: 1000000 },
  pass: { type: Boolean, required: true, index: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

dialysisWaterQualitySchema.index({ providerId: 1, date: -1 });

export default mongoose.model('DialysisWaterQuality', dialysisWaterQualitySchema);
