import mongoose from 'mongoose';
import { moneyRounding } from '../utils/money.js';

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
  // SA-M5: four-eyes approvals (adminId + name + timestamp each).
  approvals: [{
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// PAY-M-06: gross - commission - tax must equal net to the paisa, so all three
// are normalised at the same boundary. `transactionCount` is a count, not money.
payoutSchema.plugin(moneyRounding(['grossRevenue', 'commissionAmount', 'netPayout']));

export default mongoose.model('Payout', payoutSchema);
