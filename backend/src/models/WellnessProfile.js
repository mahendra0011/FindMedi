import mongoose from 'mongoose';

// 6.md §2.10 (fitness, opt-in): the module opt-in for the fitness domain.
// Nutrition (6.md §2.11) carries no opt-in marker, so it needs no row here —
// this profile exists only to gate fitness reads/writes. Null/absent row =
// never opted in.
const wellnessProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },
  fitnessConsentedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false });

wellnessProfileSchema.index({ userId: 1, familyMemberId: 1 });
wellnessProfileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('WellnessProfile', wellnessProfileSchema);
