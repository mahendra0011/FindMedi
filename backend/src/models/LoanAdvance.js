import mongoose from 'mongoose';

/** File 22 P1-17: staff loan/advance ledger (recovered via payslip). */
const loanAdvanceSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true, index: true },
  kind: { type: String, enum: ['Loan', 'Advance'], required: true },
  principal: { type: Number, required: true, min: 0 },
  recovered: { type: Number, default: 0, min: 0 },
  emi: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

loanAdvanceSchema.index({ hospitalId: 1, staffId: 1, status: 1 });

export default mongoose.models.LoanAdvance || mongoose.model('LoanAdvance', loanAdvanceSchema);
