import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { APPLICATION_STATUSES, APPLICATION_DECISIONS, CHECKLIST_STATUSES } from '../lib/providerTypes.js';

// 10.md 2.3 - one row per attempt to join the platform, config-driven so a new
// provider type needs no new model (10.md 1.1).
//
// Three things are pinned rather than looked up later, because an application
// is reviewed weeks after it was drafted:
//   * `configVersion` - the wizard config the applicant actually saw (10.md 2.2:
//     a config edit must not rewrite a submitted application's requirements);
//   * `group` / `tier` / `twoPersonApproval` - copied from that config so the
//     ops queue can filter by lane (`queue=high_risk`) without joining configs,
//     and so the decision handler does not depend on a config row still existing;
//   * `decisions` - append-only. 8.md 2 requires an immutable who/when/why log;
//     the live `status` is only the latest reading of it.
const checklistResultSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  status: { type: String, enum: CHECKLIST_STATUSES, required: true },
  note: { type: String, maxlength: 1000, default: '' },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const decisionSchema = new mongoose.Schema({
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now },
  decision: { type: String, enum: APPLICATION_DECISIONS, required: true },
  reason: { type: String, maxlength: 1000, default: '' },
}, { _id: false });

const needsInfoSchema = new mongoose.Schema({
  docKey: { type: String, required: true, trim: true, maxlength: 60 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
}, { _id: false });

const reviewerAssignmentSchema = new mongoose.Schema({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date, default: Date.now },
  queue: { type: String, maxlength: 60, default: 'default' },
}, { _id: false });

const providerApplicationSchema = new mongoose.Schema({
  // Human reference for the ops queue and support tickets - never an authz id.
  applicationId: { type: String, unique: true, sparse: true },
  applicantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Null until an approval materialises the listing (10.md 6 step 3 keeps
  // Provider a view over existing rows first, so approval alone must not
  // create one).
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null, index: true },

  typeKey: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, index: true },
  configVersion: { type: Number, min: 1, default: 1 },
  // `kind` joins group/tier/twoPersonApproval as the pinned config snapshot:
  // the listing this application turns into must not depend on the config row
  // still existing (or still saying the same thing) weeks later.
  kind: { type: String, maxlength: 40, default: '' },
  group: { type: String, maxlength: 40, default: '' },
  tier: { type: String, maxlength: 4, default: '' },
  twoPersonApproval: { type: Boolean, default: false },

  // Wizard autosave payload (2.md 3): step key -> step data. Bounded by the
  // request schema, not here - see updateApplicationDraftSchema.
  draft: {
    stepData: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },

  status: { type: String, enum: APPLICATION_STATUSES, default: 'draft', index: true },
  submittedAt: { type: Date, default: null },
  decidedAt: { type: Date, default: null },
  resubmissionCount: { type: Number, min: 0, default: 0 },
  escalated: { type: Boolean, default: false },
  rejectionReason: { type: String, maxlength: 1000, default: '' },

  reviewerAssignments: [reviewerAssignmentSchema],
  checklistResults: [checklistResultSchema],
  decisions: [decisionSchema],
  needsInfo: [needsInfoSchema],

  // Two-person approval (2.md 6 "tiered approval", 8.md 2 high-risk lane):
  // the first `approve` parks the application in under_review with the approver
  // recorded; only a DIFFERENT reviewer can flip it to approved.
  approvalState: {
    firstApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    firstApprovedAt: { type: Date, default: null },
  },

  // One appeal per rejection (2.md 6). Points at the rejected application, and
  // the join route refuses a second row for the same decision.
  appealOf: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', default: null, index: true },
}, { timestamps: true });

providerApplicationSchema.index({ applicantUserId: 1, status: 1 });
providerApplicationSchema.index({ status: 1, group: 1, submittedAt: 1 });
providerApplicationSchema.index({ typeKey: 1, status: 1 });
providerApplicationSchema.index({ twoPersonApproval: 1, status: 1 });

// Stable, printable reference for the queue - the same idea as Provider.providerId.
providerApplicationSchema.pre('save', async function generateApplicationId(next) {
  if (this.applicationId) return next();
  try {
    const App = this.constructor;
    let candidate;
    do {
      candidate = `APP-${randomBytes(6).toString('hex').toUpperCase()}`;
    } while (await App.exists({ applicationId: candidate }));
    this.applicationId = candidate;
    return next();
  } catch (err) {
    return next(err);
  }
});

export default mongoose.models.ProviderApplication
  || mongoose.model('ProviderApplication', providerApplicationSchema);
