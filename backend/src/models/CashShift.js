import mongoose from 'mongoose';

/**
 * File 09 §9.5: one cashier shift on one counter. expected comes from the
 * billing ledger; variance = counted − expected. Only one open shift per
 * counter (enforced at the route layer).
 */
const cashShiftSchema = new mongoose.Schema({
  counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashCounter', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  openingFloat: { type: Number, default: 0, min: 0 },
  closedAt: { type: Date, default: null },
  expected: { type: Number, default: 0 },
  counted: { type: Number, default: null },
  variance: { type: Number, default: null },
  denominations: { type: mongoose.Schema.Types.Mixed, default: {} },
  depositToBankRef: { type: String, default: '' },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open', index: true },
}, { timestamps: true });

cashShiftSchema.index({ counterId: 1, status: 1 });

export default mongoose.models.CashShift || mongoose.model('CashShift', cashShiftSchema);
