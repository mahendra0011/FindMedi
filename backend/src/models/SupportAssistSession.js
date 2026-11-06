import mongoose from 'mongoose';

const supportAssistSessionSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true, select: false },
  requestedAt: { type: Date, default: Date.now },
  codeExpiresAt: { type: Date, required: true, index: true },
  consumedAt: { type: Date, default: null },
  attempts: { type: Number, min: 0, max: 5, default: 0 },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  reason: { type: String, maxlength: 300, default: '' },
  fields: [{ type: String, enum: ['name', 'phone', 'email'] }],
  status: { type: String, enum: ['pending', 'active', 'expired', 'revoked'], default: 'pending', index: true },
  sessionExpiresAt: { type: Date, default: null, index: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

supportAssistSessionSchema.index({ ticketId: 1, status: 1, codeExpiresAt: 1 });
supportAssistSessionSchema.index({ status: 1, sessionExpiresAt: 1 });
// Consent codes and reveal metadata are retained only long enough for
// operational follow-up; MongoDB TTL removes the whole session after 30 days.
supportAssistSessionSchema.index({ requestedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.SupportAssistSession || mongoose.model('SupportAssistSession', supportAssistSessionSchema);
