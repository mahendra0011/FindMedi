import mongoose from 'mongoose';

// 6.md §2.9 (women's health, opt-in): the SEPARATE consent for the module
// lives here, not in ConsentRecord — that ledger is ABDM care-purpose grants
// (patient↔doctor, expiring), while this is a module opt-in with no doctor,
// no expiry and no data sharing. One row per person-profile: the account's
// own profile (familyMemberId null) or a managed family member's.
const womensHealthProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },
  // Null = never opted in. Set once by POST /consent, refreshed on
  // re-consent. Every log read/write requires this to be set.
  consentedAt: { type: Date, default: null },
  cycleLengthDays: { type: Number, min: 20, max: 45, default: 28 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

womensHealthProfileSchema.index({ userId: 1, familyMemberId: 1 });
womensHealthProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('WomensHealthProfile', womensHealthProfileSchema);
