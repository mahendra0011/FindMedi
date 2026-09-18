import mongoose from 'mongoose';

const transactionLedgerSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  facilityName: { type: String, default: '' },
  facilityType: { type: String, default: 'hospital' },
  source: { type: String, enum: ['appointment', 'lab', 'pharmacy', 'ipd', 'radiology', 'ot', 'physio', 'other'], default: 'appointment' },
  sourceId: { type: String, default: '' },
  patientName: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  commissionPercent: { type: Number, default: 10 },
  commissionAmount: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['completed', 'refunded', 'cancelled'], default: 'completed' },
  payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout' },
}, { timestamps: true });

transactionLedgerSchema.index({ createdAt: -1 });
transactionLedgerSchema.index({ facilityId: 1, createdAt: -1 });

export default mongoose.model('TransactionLedger', transactionLedgerSchema);
