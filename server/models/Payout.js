import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  facilityName: { type: String, default: '' },
  facilityType: { type: String, default: 'hospital' },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  grossRevenue: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  netPayout: { type: Number, default: 0 },
  transactionCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
  paidAt: { type: Date },
  transactionRef: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Payout', payoutSchema);
