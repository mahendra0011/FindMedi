import mongoose from 'mongoose';

/**
 * Doc 12 §6 P1: recall rules (HbA1c every 90d, boosters, post-op checks).
 * Dues are DERIVED at read time (follow-up dates + vaccine schedules),
 * never stored — a stored flag would go stale overnight.
 */
const recallRuleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  kind: {
    type: String,
    enum: ['follow_up', 'vaccination', 'chronic_lab', 'post_procedure'],
    required: true, index: true,
  },
  intervalDays: { type: Number, default: 90, min: 1 },
  messageTemplate: { type: String, maxlength: 500, default: '' },
  channel: { type: String, enum: ['notification', 'whatsapp', 'sms'], default: 'notification' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

recallRuleSchema.index({ hospitalId: 1, kind: 1 });

export default mongoose.models.RecallRule || mongoose.model('RecallRule', recallRuleSchema);
