import mongoose from 'mongoose';
import { DOCUMENT_STATUSES } from '../lib/providerTypes.js';

// 10.md 2.4 - the KYC document row behind 2.md 5.
//
// A document belongs to whichever of `applicationId` (join flow, before a
// listing exists) / `providerId` / `practitionerId` it was filed under; the
// join route only ever writes `applicationId`. `fileRef` is private: it is
// never part of a public DTO, and reviewers reach it through the audited admin
// workspace rather than a public URL.
//
// `version` makes re-upload explicit: posting the same docType again bumps the
// version and resets the row to `uploaded`, so a rejection can be cleared by
// supplying a corrected file without leaving a stale "verified" row behind.
const providerDocumentSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', default: null, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null, index: true },
  // Interim ref: 10.md 2.5 introduces a Practitioner model; until then the
  // individual professional on the platform is a Doctor row.
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },

  docType: { type: String, required: true, trim: true, maxlength: 60, index: true },
  fileRef: {
    url: { type: String, maxlength: 500, default: '' },
    key: { type: String, maxlength: 300, default: '' },
    storage: { type: String, enum: ['local', 'remote'], default: 'local' },
    originalName: { type: String, maxlength: 255, default: '' },
    mimetype: { type: String, maxlength: 100, default: '' },
    sizeBytes: { type: Number, min: 0, default: 0 },
  },
  // sha-256 of the stored bytes: the duplicate-fraud signal in 2.md 11 (same
  // document across accounts) is a hash equality, not a filename one.
  hash: { type: String, maxlength: 64, default: '' },

  status: { type: String, enum: DOCUMENT_STATUSES, default: 'uploaded', index: true },
  expiryDate: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  rejectionReason: { type: String, maxlength: 1000, default: '' },
  version: { type: Number, min: 1, default: 1 },

  scanResult: {
    clean: { type: Boolean, default: null },
    skipped: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    engine: { type: String, maxlength: 40, default: '' },
    scannedAt: { type: Date, default: null },
  },

  // 2.md 5 expiry tracking (60/30/7 + expired): per-threshold reminder state.
  // Keyed by threshold so each one is recorded exactly ONCE per document -
  // the same durable-per-row idea as Appointment.reminderState, and the reason
  // a missed cron tick is caught up by the next one instead of re-sending.
  // Each entry: { status: sending|sent|failed|skipped, claimedAt, sentAt,
  //               attempts, nextAttemptAt, lastReason }.
  expiryReminders: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  // The most recent reminder this document produced, for "when did we last
  // tell them?" without walking the per-threshold map.
  lastReminderAt: { type: Date, default: null },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One row per (application, docType): re-upload bumps `version` in place.
providerDocumentSchema.index({ applicationId: 1, docType: 1 }, { unique: true, partialFilterExpression: { applicationId: { $type: 'objectId' } } });
providerDocumentSchema.index({ providerId: 1, docType: 1 });
// 2.md 5 expiry tracking (60/30/7 day reminders) needs this to be cheap.
providerDocumentSchema.index({ status: 1, expiryDate: 1 });

export default mongoose.models.ProviderDocument
  || mongoose.model('ProviderDocument', providerDocumentSchema);
