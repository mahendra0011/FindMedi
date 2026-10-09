import mongoose from 'mongoose';

/** File 16 §16.3: parsed bank statement transaction (matchId = reconciled). */
const bankTxnSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  importId: { type: mongoose.Schema.Types.ObjectId, ref: 'StatementImport', index: true },
  bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
  date: { type: Date, required: true },
  narration: { type: String, default: '' },
  utr: { type: String, default: '', index: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: { type: Number, default: null },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReconMatch', default: null },
}, { timestamps: true });

export default mongoose.models.BankTxn || mongoose.model('BankTxn', bankTxnSchema);
