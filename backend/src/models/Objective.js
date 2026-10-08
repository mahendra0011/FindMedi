import mongoose from 'mongoose';

/**
 * Goals & OKRs (file 24 §4.9/§8): company → city → team → person.
 * Key results may link a live metric (`metric:supply_active`) or be manual.
 */
const objectiveSchema = new mongoose.Schema({
  level: { type: String, enum: ['company', 'city', 'team', 'person'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  city: { type: String, default: '' },
  period: { type: String, required: true },
  title: { type: String, required: true, maxlength: 300 },
  keyResults: [{
    title: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, default: 0 },
    metric: { type: String, default: '' },
    confidence: { type: String, enum: ['on_track', 'at_risk', 'off_track'], default: 'on_track' },
  }],
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
}, { timestamps: true });

objectiveSchema.index({ level: 1, period: 1 });

export default mongoose.models.Objective || mongoose.model('Objective', objectiveSchema);
