import mongoose from 'mongoose';

/** File 17 §17.1: report run ledger (every run logged with row count + ms). */
const reportRunSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  reportKey: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  format: { type: String, default: 'json' },
  rowCount: { type: Number, default: 0 },
  ms: { type: Number, default: 0 },
}, { timestamps: true });

reportRunSchema.index({ hospitalId: 1, createdAt: -1 });

export default mongoose.models.ReportRun || mongoose.model('ReportRun', reportRunSchema);
