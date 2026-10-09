import mongoose from 'mongoose';

/**
 * File 18 §18.1: cross-channel interaction (call/sms/whatsapp/email/walkin).
 * Distinct from CallLog (in-app audio/video) — this is the contact-center
 * telephony/queue domain.
 */
const interactionSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  channel: { type: String, enum: ['call', 'sms', 'whatsapp', 'email', 'walkin'], required: true, index: true },
  direction: { type: String, enum: ['in', 'out'], default: 'in' },
  phone: { type: String, default: '', index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  disposition: { type: String, default: '' },
  notes: { type: String, default: '', maxlength: 2000 },
  durationSec: { type: Number, default: 0 },
  recordingUrl: { type: String, default: '' },
  createdTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkTask', default: null },
  externalId: { type: String, default: '', index: true },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

interactionSchema.index({ hospitalId: 1, channel: 1, at: -1 });

export default mongoose.models.Interaction || mongoose.model('Interaction', interactionSchema);
