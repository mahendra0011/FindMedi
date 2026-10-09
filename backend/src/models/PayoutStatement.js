import mongoose from 'mongoose';

/**
 * File 22 P0-6: doctor payout statement with TDS. Computed from approved
 * rows (not hand-typed net): gross − tds − other = net.
 */
const payoutStatementSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  period: { type: String, required: true }, // YYYY-MM
  gross: { type: Number, required: true, min: 0 },
  tdsRate: { type: Number, default: 10, min: 0, max: 30 },
  tds: { type: Number, default: 0, min: 0 },
  otherDeductions: { type: Number, default: 0, min: 0 },
  net: { type: Number, default: 0 },
  status: { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft', index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  paidAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

payoutStatementSchema.index({ hospitalId: 1, doctorId: 1, period: 1 }, { unique: true });

payoutStatementSchema.pre('save', function (next) {
  const gross = Number(this.gross) || 0;
  this.tds = +(gross * (Number(this.tdsRate) || 0) / 100).toFixed(2);
  this.net = +(gross - this.tds - (Number(this.otherDeductions) || 0)).toFixed(2);
  next();
});

export default mongoose.models.PayoutStatement || mongoose.model('PayoutStatement', payoutStatementSchema);
