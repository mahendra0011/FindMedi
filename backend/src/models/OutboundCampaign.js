import mongoose from 'mongoose';

/** File 18 §18.1: consent-gated outbound campaign (draft → running → done). */
const campaignSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  name: { type: String, required: true },
  channel: { type: String, enum: ['sms', 'whatsapp', 'call'], default: 'sms' },
  template: { type: String, default: '', maxlength: 1000 },
  audience: { type: mongoose.Schema.Types.Mixed, default: {} },
  consentChecked: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'running', 'paused', 'done'], default: 'draft', index: true },
  stats: { queued: { type: Number, default: 0 }, sent: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.OutboundCampaign || mongoose.model('OutboundCampaign', campaignSchema);
