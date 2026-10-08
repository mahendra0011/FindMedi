import mongoose from 'mongoose';

// 6.md §2.10 fitness (steps/workouts/class attendance) + §2.11 nutrition
// (meal log, water, grocery list). One collection for both domains: the
// client sends a globally-unique `kind` and the route derives the domain
// from it (WELLNESS_KIND_DOMAIN in validate.js), so no request can claim a
// fitness kind inside the nutrition domain or vice versa.
//
// Privacy posture follows the women's-health module: no other surface reads
// this collection, no notifications are emitted, every response is no-store,
// and fitness (the opt-in domain) needs the WellnessProfile consent while
// nutrition stays open per the spec's silence.
export const WELLNESS_KINDS = [
  'steps', 'workout', 'class_attendance',
  'meal', 'water', 'grocery',
];

const wellnessLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },
  kind: { type: String, enum: WELLNESS_KINDS, required: true, index: true },
  // IST calendar day the entry belongs to ('YYYY-MM-DD'), not the write time.
  date: { type: String, required: true },
  // Validated per kind at the zod boundary — Object is storage, the
  // allowlist lives in validate.js.
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

wellnessLogSchema.index({ userId: 1, familyMemberId: 1, date: -1 });

export default mongoose.model('WellnessLog', wellnessLogSchema);
