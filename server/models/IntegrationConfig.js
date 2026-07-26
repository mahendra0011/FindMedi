import mongoose from 'mongoose';

const integrationConfigSchema = new mongoose.Schema({
  provider: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  category: { type: String, enum: ['payment', 'sms', 'email', 'storage', 'maps', 'webhook', 'analytics', 'other'], required: true },
  isEnabled: { type: Boolean, default: false },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  webhooks: [{
    name: { type: String },
    url: { type: String },
    events: [{ type: String }],
    isActive: { type: Boolean, default: true },
    secret: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  lastTestedAt: { type: Date },
  lastTestStatus: { type: String, enum: ['success', 'failed', 'untested'], default: 'untested' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('IntegrationConfig', integrationConfigSchema);
