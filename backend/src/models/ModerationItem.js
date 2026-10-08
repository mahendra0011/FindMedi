import mongoose from 'mongoose';
import {
  MODERATION_TARGET_TYPES,
  MODERATION_CATEGORIES,
  MODERATION_SEVERITIES,
  MODERATION_STATUSES,
  MODERATION_ACTIONS,
  MODERATION_POLICY_VERSION,
  slaDueAtFor,
} from '../lib/moderationRules.js';

/**
 * 8.md §5 — one row per thing a moderator has to look at, whatever the thing
 * is. The queue is deliberately CONTENT-shaped, not collection-shaped: reviews,
 * provider profiles, listings, events, articles and chat reports all travel the
 * same state machine (open → in_review → actioned/dismissed → appealed), so
 * the console, the SLA clock and the audit trail are written once.
 *
 * Append-only in spirit: `actions[]` and `notes[]` are never rewritten (8.md §2
 * decision log), and `policyVersion` records which rule set the row was judged
 * under so a later policy change cannot silently re-litigate an old decision.
 */
const moderationItemSchema = new mongoose.Schema({
  targetType: { type: String, enum: MODERATION_TARGET_TYPES, required: true, index: true },
  // String, not ObjectId: rows point at five different collections (reviews,
  // providers, chat reports, …) and a cast failure in one must not poison reads.
  targetId: { type: String, required: true, trim: true },

  category: { type: String, enum: MODERATION_CATEGORIES, required: true, index: true },
  reason: { type: String, default: '', maxlength: 1000 },
  severity: { type: String, enum: MODERATION_SEVERITIES, default: 'medium', index: true },
  status: { type: String, enum: MODERATION_STATUSES, default: 'open', index: true },

  // Who put it in the queue: 'auto_filter' (the detectors above), a reporting
  // user/provider, or an operator. `reporterId` is null for auto-filter rows.
  source: { type: String, enum: ['auto_filter', 'user_report', 'provider_report', 'ops'], default: 'auto_filter' },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // The account that owns the flagged CONTENT (review author, profile owner …):
  // the subject of any warn/strike and the only account that may appeal.
  subjectUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  subjectProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },

  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

  // Two-person gate (8.md §5.2): a destructive first-reviewer request parks
  // here and takes effect ONLY when a second, different reviewer confirms it.
  pendingAction: {
    action: { type: String, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, default: null },
    at: { type: Date, default: null },
    note: { type: String, default: '', maxlength: 1000 },
  },

  // Append-only decision log: who did what, when, with what note.
  actions: [{
    action: { type: String, enum: MODERATION_ACTIONS, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: '', maxlength: 1000 },
    secondReviewer: { type: Boolean, default: false },
  }],

  notes: [{
    note: { type: String, required: true, maxlength: 2000 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
  }],

  escalated: { type: Boolean, default: false },
  strikeIssued: { type: Boolean, default: false },
  // What the target looked like BEFORE a destructive action (provider status,
  // review visibility …), so `restore` and an overturned appeal can put back
  // exactly what was taken instead of guessing a value.
  targetSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },

  // 8.md §5.2 appeal flow: exactly ONE appeal per item, resolved by a reviewer
  // who did not take the original action.
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
  slaDueAt: { type: Date, default: null, index: true },
}, { timestamps: true });

// Queue reads: oldest-due first, optionally sliced by type/severity/assignee.
moderationItemSchema.index({ status: 1, slaDueAt: 1 });
moderationItemSchema.index({ status: 1, createdAt: -1 });
moderationItemSchema.index({ targetType: 1, status: 1, severity: 1 });
moderationItemSchema.index({ targetId: 1, targetType: 1 });
moderationItemSchema.index({ assignee: 1, status: 1 });

// 8.md §5.2: the clock is a property of the severity, so it is computed at
// insert rather than left for every call site to remember.
moderationItemSchema.pre('validate', function setSla(next) {
  if (!this.slaDueAt) this.slaDueAt = slaDueAtFor(this.severity, this.createdAt || new Date());
  next();
});

export default mongoose.model('ModerationItem', moderationItemSchema);
