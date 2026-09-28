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

// NOTE (index audit): intentionally index-free. Every read is
// `ReferralSettings.findOne()` with NO filter (routes/referral.js,
// services/referralService.js) — this is a singleton config document, so no
// index could ever be matched; one would be pure write overhead.
export default mongoose.model('ReferralSettings', referralSettingsSchema);