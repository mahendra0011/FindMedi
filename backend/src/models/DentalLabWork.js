import mongoose from 'mongoose';

// 7.md §3.1 lab work tracker: crowns/aligners with EXTERNAL dental labs.
// sent → received → fitted, forward only (a fitted prosthesis does not go
// back to "sent" — a remake is a new row). Timestamps are set by the
// transition, never by the caller.
export const DENTAL_LAB_WORK_TYPES = ['crown', 'aligner', 'denture', 'bridge', 'implant', 'other'];
export const DENTAL_LAB_STATUSES = ['sent', 'received', 'fitted'];

const dentalLabWorkSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workType: { type: String, enum: DENTAL_LAB_WORK_TYPES, required: true, index: true },
  teeth: [{ type: String }],
  labName: { type: String, trim: true, maxlength: 160, default: '' },
  costAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: DENTAL_LAB_STATUSES, default: 'sent', index: true },
  sentAt: { type: Date, default: Date.now },
  receivedAt: { type: Date, default: null },
  fittedAt: { type: Date, default: null },
}, { timestamps: false });

dentalLabWorkSchema.index({ patientId: 1, createdAt: -1 });

export default mongoose.model('DentalLabWork', dentalLabWorkSchema);
