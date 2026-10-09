import mongoose from 'mongoose';

/** File 16 §16.6: vendor scorecard snapshots (computed, period-locked). */
const vendorScorecardSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  period: { type: String, required: true }, // YYYY-MM
  onTimePct: { type: Number, default: null },
  qualityPct: { type: Number, default: null },
  fillRatePct: { type: Number, default: null },
  score: { type: Number, default: null },
}, { timestamps: true });

vendorScorecardSchema.index({ supplierId: 1, period: 1 }, { unique: true });

export default mongoose.models.VendorScorecard || mongoose.model('VendorScorecard', vendorScorecardSchema);
