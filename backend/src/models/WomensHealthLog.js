import mongoose from 'mongoose';

// 6.md §2.9 (women's health, opt-in): cycle tracker, pregnancy weeks/visits,
// postpartum. Private by DEFAULT, structurally — not by flag:
//   - no other route, aggregation, notification or recommendation reads this
//     collection (the summary/timeline/recommendations counts never include
//     it; the handler emits no notifications, so nothing reaches a lock
//     screen or a recents feed);
//   - reads need the module consent (WomensHealthProfile.consentedAt) AND the
//     self-or-family object decision, with no-store on every response;
//   - the UI's hide-switch is the reserved category string 'womens_health'
//     (canonical constant: WOMENS_HEALTH_CATEGORY in routes/
//     patientWomensHealth.js) inside the user-managed settings.
//     hiddenCategories — the server never mutates that list itself, so hiding
//     stays the user's control and every change to it keeps its
//     privacy_setting_changed audit row.
export const WOMENS_HEALTH_KINDS = ['period', 'symptom', 'pregnancy', 'postpartum', 'visit'];

const womensHealthLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null, index: true },
  kind: { type: String, enum: WOMENS_HEALTH_KINDS, required: true, index: true },
  // IST calendar day the entry belongs to ('YYYY-MM-DD'), not the write time.
  date: { type: String, required: true },
  // Validated per kind at the zod boundary (womensHealthLogSchema) — the
  // Object type here is storage, the allowlist lives in validate.js.
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: false });

womensHealthLogSchema.index({ userId: 1, familyMemberId: 1, date: -1 });

export default mongoose.model('WomensHealthLog', womensHealthLogSchema);
