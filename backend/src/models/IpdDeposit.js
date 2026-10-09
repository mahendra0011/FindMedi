import mongoose from 'mongoose';

/**
 * File 09 §9.2: IPD advance/deposit ledger. Receive → Adjust (against bills)
 * → Refund. Running balance = ΣReceive − ΣAdjust − ΣRefund.
 */
const ipdDepositSchema = new mongoose.Schema({
  admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  type: { type: String, enum: ['Receive', 'Adjust', 'Refund'], required: true },
  amount: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: ['Cash', 'Card', 'UPI', 'NetBanking', 'Insurance', 'Online', 'Other'], default: 'Cash' },
  receiptNo: { type: String, default: '' },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', default: null },
  counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashCounter', default: null },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashShift', default: null },
  remarks: { type: String, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ipdDepositSchema.index({ admissionId: 1, createdAt: 1 });

export default mongoose.models.IpdDeposit || mongoose.model('IpdDeposit', ipdDepositSchema);
