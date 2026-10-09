import mongoose from 'mongoose';

/**
 * Doc 12 §6: recall send log — dedupe key (rule+patient+due date) prevents
 * double-messaging 100 patients; opt-out honoured via NotificationPreference.
 */
const recallLogSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecallRule', default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, default: '' },
  dedupeKey: { type: String, required: true, unique: true, index: true },
  channel: { type: String, default: 'notification' },
  sentAt: { type: Date, default: Date.now },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.RecallLog || mongoose.model('RecallLog', recallLogSchema);
