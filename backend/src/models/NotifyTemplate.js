import mongoose from 'mongoose';

/**
 * File 22 P2-35: notification template registry. Variables are an explicit
 * allowlist per template — render rejects unknown vars (typos fail loud,
 * never send half-rendered PHI), and each channel body is linted.
 */
const notifyTemplateSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  key: { type: String, required: true, maxlength: 120 },
  name: { type: String, required: true, maxlength: 200 },
  channel: { type: String, enum: ['sms', 'whatsapp', 'email', 'push', 'inapp'], required: true, index: true },
  variables: [{ type: String, maxlength: 60 }],
  body: { type: String, required: true, maxlength: 2000 },
  subject: { type: String, default: '', maxlength: 200 },
  dltTemplateId: { type: String, default: '', maxlength: 60 },
  dltEntityId: { type: String, default: '', maxlength: 60 },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

notifyTemplateSchema.index({ hospitalId: 1, key: 1, channel: 1 }, { unique: true });

export default mongoose.models.NotifyTemplate || mongoose.model('NotifyTemplate', notifyTemplateSchema);
