import mongoose from 'mongoose';

/** File 16 §16.3: recon match (auto with confidence, or manual at 100). */
const reconMatchSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  bankTxnId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankTxn', required: true },
  targetModel: { type: String, required: true }, // Payment | CreditNote | Expense…
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  mode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  confidence: { type: Number, default: 0 },
  matchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export default mongoose.models.ReconMatch || mongoose.model('ReconMatch', reconMatchSchema);
