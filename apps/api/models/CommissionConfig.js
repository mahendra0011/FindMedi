import mongoose from 'mongoose';

const commissionConfigSchema = new mongoose.Schema({
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, unique: true, index: true },
  facilityName: { type: String, default: '' },
  facilityType: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy'], default: 'hospital' },
  commissionPercent: { type: Number, default: 10, min: 0, max: 100 },
  commissionCap: { type: Number, default: 0 },
  payoutSchedule: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'monthly' },
  totalEarnings: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  lastPayoutDate: { type: Date },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('CommissionConfig', commissionConfigSchema);
