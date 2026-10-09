import mongoose from 'mongoose';

/**
 * File 09 §9.5: credit/debit notes against bills (cancellation, overcharge
 * correction). Approval recorded; applied amounts reduce bill balance.
 */
const creditNoteSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Billing', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kind: { type: String, enum: ['Credit', 'Debit'], default: 'Credit' },
  amount: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, maxlength: 500 },
  series: { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  appliedAt: { type: Date, default: null },
  status: { type: String, enum: ['Issued', 'Applied', 'Cancelled'], default: 'Issued', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.CreditNote || mongoose.model('CreditNote', creditNoteSchema);
