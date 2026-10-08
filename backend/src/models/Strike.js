import mongoose from 'mongoose';
import { MODERATION_TARGET_TYPES, MODERATION_CATEGORIES, MODERATION_POLICY_VERSION, STRIKE_LEVELS } from '../lib/moderationRules.js';

/**
 * 8.md §6 — trust & safety strikes.
 *
 * A strike is the PERMANENT record of an upheld violation: one row per
 * decision, never edited, never deleted (an appeal may only flip `status` to
 * `overturned` — the row itself survives as the evidence of what was decided
 * and why). The active count (`status: 'active'`) is what the threshold table
 * in lib/moderationRules.js escalates:
 *
 *   1 → warning, 2 → listing suspension (providers), 3 → account suspension.
 *
 * `subjectType` + `subjectId` keep ONE table for both halves of §6: a provider
 * whose listing violates the claim policy and a user whose review is abuse
 * both accumulate strikes the same way, they just escalate differently.
 */
const strikeSchema = new mongoose.Schema({
  subjectType: { type: String, enum: ['provider', 'user'], required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  // Denormalised so the provider lane can be listed without a join; `userId` is
  // the OWNER behind a provider strike (the account that actually gets blocked).
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  moderationItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModerationItem', required: true, index: true },
  targetType: { type: String, enum: MODERATION_TARGET_TYPES, required: true },
  category: { type: String, enum: MODERATION_CATEGORIES, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  reason: { type: String, default: '', maxlength: 1000 },

  weight: { type: Number, min: 1, max: 3, default: 1 },
  // 'active' counts toward the thresholds; 'overturned' never does.
  status: { type: String, enum: ['active', 'overturned'], default: 'active', index: true },
  // The escalation this strike contributed to at issue time (audit snapshot).
  level: { type: String, enum: STRIKE_LEVELS, default: 'warning' },

  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedAt: { type: Date, default: Date.now },

  appeal: {
    appealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    appealedAt: { type: Date, default: null },
    note: { type: String, default: '', maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    outcome: { type: String, enum: ['upheld', 'overturned', null], default: null },
    resolutionNote: { type: String, default: '', maxlength: 1000 },
  },

  policyVersion: { type: String, default: MODERATION_POLICY_VERSION },
}, { timestamps: true });

// "How many active strikes does this subject have?" — the threshold query.
strikeSchema.index({ subjectType: 1, subjectId: 1, status: 1 });
strikeSchema.index({ status: 1, issuedAt: -1 });

export default mongoose.model('Strike', strikeSchema);
