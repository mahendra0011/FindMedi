import mongoose from 'mongoose';

/**
 * Field-ops visits (file 24 §4.5/§8): geo check-in/out during duty only
 * (disclosed policy), storefront photos, structured outcomes.
 */
const visitSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  plannedAt: { type: Date, default: null },
  checkIn: {
    at: { type: Date, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  checkOut: {
    at: { type: Date, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  outcome: { type: String, enum: ['', 'interested', 'demo_done', 'docs_collected', 'not_interested', 'unreachable', 'follow_up'], default: '' },
  notes: { type: String, maxlength: 2000, default: '' },
  photoRefs: [{ type: String }],
}, { timestamps: true });

visitSchema.index({ userId: 1, plannedAt: 1 });

export default mongoose.models.Visit || mongoose.model('Visit', visitSchema);
