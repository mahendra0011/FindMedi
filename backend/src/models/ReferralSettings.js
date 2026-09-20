import mongoose from 'mongoose';

const referralSettingsSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: true,
  },
  qualifyingAction: {
    type: String,
    enum: ['signup_only', 'first_appointment', 'first_order', 'first_lab_test'],
    default: 'first_appointment',
  },
  referrerPoints: {
    type: Number,
    default: 200,
  },
  refereePoints: {
    type: Number,
    default: 100,
  },
  maxReferralsPerMonth: {
    type: Number,
    default: 20,
  },
}, { timestamps: true });

export default mongoose.model('ReferralSettings', referralSettingsSchema);