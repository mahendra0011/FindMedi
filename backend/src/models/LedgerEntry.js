import mongoose from 'mongoose';

/**
 * File 09 §9.5: double-entry day-book lines (debit XOR credit per line).
 * Sources: billing, payouts, expenses, vendor bills, gateway settlements.
 */
const ledgerEntrySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  date: { type: Date, default: Date.now, index: true },
  accountId: { type: String, required: true, maxlength: 120, index: true },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
  refModel: { type: String, default: '' },
  refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  narration: { type: String, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

ledgerEntrySchema.index({ hospitalId: 1, accountId: 1, date: -1 });

export default mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', ledgerEntrySchema);
