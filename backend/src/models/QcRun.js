import mongoose from 'mongoose';

/**
 * File 22 P1-11: QC runs (control value vs mean±SD) + Westgard violations
 * computed at read (1-2s warning, 1-3s / R-4s rejection).
 */
const qcRunSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  analyzer: { type: String, default: '', index: true },
  testName: { type: String, required: true, index: true },
  controlLevel: { type: String, enum: ['L1', 'L2', 'L3'], default: 'L1' },
  mean: { type: Number, required: true },
  sd: { type: Number, required: true, min: 0 },
  value: { type: Number, required: true },
  at: { type: Date, default: Date.now },
  runBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

qcRunSchema.index({ hospitalId: 1, analyzer: 1, testName: 1, at: -1 });

/** Westgard flags for a value against mean/sd (+ previous point for R-4s). */
export function westgardFlags(value, mean, sd, prevValue) {
  const flags = [];
  if (!(sd > 0)) return flags;
  const z = (Number(value) - Number(mean)) / sd;
  if (Math.abs(z) > 3) flags.push('1-3s');
  else if (Math.abs(z) > 2) flags.push('1-2s');
  if (prevValue != null) {
    const zp = (Number(prevValue) - Number(mean)) / sd;
    if (Math.abs(z - zp) > 4) flags.push('R-4s');
  }
  return flags;
}

export default mongoose.models.QcRun || mongoose.model('QcRun', qcRunSchema);
