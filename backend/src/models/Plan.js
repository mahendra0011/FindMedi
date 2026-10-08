import mongoose from 'mongoose';
import { PLAN_TYPES } from '../lib/flowStates.js';

/**
 * FLOW-D plan catalogue (5.md 5, 10.md 2.11): the OFFERING a provider sells —
 * a gym's 6-month membership, a class pack of 10 sessions, a meal subscription
 * term. The purchased row is `Membership`; splitting them means one plan sells
 * to many members and a price change never rewrites somebody's active term.
 *
 * `providerId` and `name` are catalog vocabulary (the plan's title, the
 * provider org that sells it), so they are suppressed from PII classification
 * the same way `Service`'s are — this row is about an offering, not a person.
 */
const planSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  type: { type: String, enum: PLAN_TYPES, required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },

  // 5.md 104: "1/3/6/12 mo" for memberships, X days validity for class packs.
  duration: {
    value: { type: Number, required: true, min: 1, max: 730 },
    unit: { type: String, enum: ['day', 'week', 'month', 'year'], default: 'month' },
  },

  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', maxlength: 3 },
  joiningFee: { type: Number, min: 0, default: 0 },
  // Class pack: N sessions valid for X days (credits consumed on attendance).
  sessionCredits: { type: Number, min: 0, default: 0 },

  inclusions: [{ type: String, maxlength: 300 }],

  // 5.md 104: freeze is a bounded benefit, so the BOUNDS live on the plan and
  // the consumed windows live on each Membership.
  freezeRules: {
    maxFreezeDaysPerYear: { type: Number, min: 0, default: 0 },
    maxFreezesPerYear: { type: Number, min: 0, default: 0 },
    minNoticeDays: { type: Number, min: 0, default: 0 },
  },

  autoRenew: { type: Boolean, default: false },
  cancellationPolicy: { type: String, maxlength: 2000, default: '' },

  // Catalog lifecycle, not a money state: DRAFT rows are not purchasable.
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
}, { timestamps: true });

planSchema.index({ providerId: 1, type: 1, status: 1 });

export default mongoose.models.Plan || mongoose.model('Plan', planSchema);
