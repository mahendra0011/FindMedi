import mongoose from 'mongoose';

/** File 16 §16.3: bank accounts registered for reconciliation. */
const bankAccountSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  bankName: { type: String, required: true },
  accountNo: { type: String, required: true },
  ifsc: { type: String, default: '' },
  kind: { type: String, enum: ['current', 'savings', 'escrow', 'od'], default: 'current' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

bankAccountSchema.index({ hospitalId: 1, accountNo: 1 }, { unique: true });

export default mongoose.models.BankAccount || mongoose.model('BankAccount', bankAccountSchema);
