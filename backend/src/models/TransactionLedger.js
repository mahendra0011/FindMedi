import mongoose from 'mongoose';

const transactionLedgerSchema = new mongoose.Schema(
  {
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true, default: null },
    facilityName: { type: String, default: '' },
    facilityType: { type: String, default: 'hospital' },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
    source: {
      type: String,
      enum: [
        'ride',
        'lawyer',
        'assistant',
        'emergency_doctor',
        'ambulance',
        'appointment',
        'lab',
        'pharmacy',
        'ipd',
        'radiology',
        'ot',
        'physio',
        'other',
      ],
      default: 'ride',
      index: true,
    },
    sourceId: { type: String, default: '', index: true },
    bookingNumber: { type: String, default: '' },
    patientName: { type: String, default: '' },
    amount: { type: Number, default: 0 },
    commissionPercent: { type: Number, default: 10 },
    commissionAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    entryType: { type: String, enum: ['CREDIT', 'DEBIT'], default: 'CREDIT' },
    status: { type: String, enum: ['completed', 'held_in_escrow', 'refunded', 'cancelled'], default: 'completed' },
    payoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
  },
  { timestamps: true }
);

transactionLedgerSchema.index({ createdAt: -1 });
transactionLedgerSchema.index({ providerId: 1, createdAt: -1 });
transactionLedgerSchema.index({ facilityId: 1, createdAt: -1 });

export default mongoose.model('TransactionLedger', transactionLedgerSchema);
