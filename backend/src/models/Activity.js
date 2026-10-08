import mongoose from 'mongoose';

/**
 * CRM activity timeline (file 24 §8): polymorphic log over lead/account/
 * partner/camp. Structured outcomes only — free-text summaries must not
 * carry PHI (DLP-checked at the route layer).
 */
const activitySchema = new mongoose.Schema({
  objectType: { type: String, enum: ['lead', 'account', 'partner', 'camp'], required: true, index: true },
  objectId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: {
    type: String,
    enum: ['call', 'visit', 'whatsapp', 'email', 'note', 'stage_change', 'task_done'],
    required: true,
  },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  at: { type: Date, default: Date.now, index: true },
  outcome: { type: String, default: '' },
  summary: { type: String, maxlength: 2000, default: '' },
  durationSec: { type: Number, default: 0 },
}, { timestamps: true });

activitySchema.index({ objectType: 1, objectId: 1, at: -1 });

export default mongoose.models.Activity || mongoose.model('Activity', activitySchema);
