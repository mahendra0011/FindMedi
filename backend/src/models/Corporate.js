import mongoose from 'mongoose';

/** File 16 §16.4: corporate account (credit limit + usage ledger). */
const corporateSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true },
  gstin: { type: String, default: '' },
  creditLimit: { type: Number, default: 0 },
  creditUsed: { type: Number, default: 0 },
  billingCycle: { type: String, enum: ['weekly', 'fortnightly', 'monthly'], default: 'monthly' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Corporate || mongoose.model('Corporate', corporateSchema);
