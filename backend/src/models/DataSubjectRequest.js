import mongoose from 'mongoose';

/**
 * DPDP data-subject requests (6.md 2.15 privacy centre: "data export/delete —
 * DPDP rights"; 10.md 2.15 DataSubjectRequest). ERASURE is deliberately NOT a
 * type here: deletion has its own reviewed flow, DeletionRequest (with its
 * certificate + audit). Duplicating it would split one right across two
 * queues with two SLAs.
 *
 * `dueAt` is the DPDP clock, computed at creation (30 days + extension as
 * recorded in `extensionReason`) — the deadline is data, not a calendar
 * lookup, because an extension has to be justified against a stored date.
 * Retention: rides the Audit logs class with DeletionRequest — a handled
 * request is the evidence that the right was honoured.
 */
const dataSubjectRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['access', 'correction', 'export'], required: true, index: true },

  status: { type: String, enum: ['submitted', 'in_review', 'verified', 'fulfilled', 'rejected'], default: 'submitted', index: true },

  requestedAt: { type: Date, default: Date.now, index: true },
  dueAt: { type: Date, required: true, index: true },
  extensionReason: { type: String, maxlength: 500, default: '' },
  fulfilledAt: { type: Date, default: null },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // What was asked for / what was produced: a correction's target field, or
  // the export bundle's private ref once fulfilled.
  details: { type: String, maxlength: 4000, default: '' },
  exportRef: { type: String, maxlength: 500, default: '' },
  resolutionNote: { type: String, maxlength: 2000, default: '' },

  // Identity check before disclosing anything — 21.md 14's privacy
  // verification step, recorded on the row it authorised.
  verification: {
    method: { type: String, enum: ['', 'email_otp', 'sms_otp', 'in_person', 'manual'], default: '' },
    at: { type: Date, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
}, { timestamps: true });

dataSubjectRequestSchema.index({ userId: 1, status: 1 });
dataSubjectRequestSchema.index({ status: 1, dueAt: 1 });

export default mongoose.models.DataSubjectRequest || mongoose.model('DataSubjectRequest', dataSubjectRequestSchema);
