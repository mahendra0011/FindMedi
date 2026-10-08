import mongoose from 'mongoose';

/**
 * Supply-CRM lead (file 24 §4.2/§8): a prospect provider before it becomes
 * an Account. Converts to Account when its ProviderApplication is submitted.
 * Contact phones/emails are personal data → field-encrypted at rest + masked
 * for non-owners. NO patient/PHI fields ever (notes templates warn; §11).
 */
const LEAD_STAGES = [
  'identified', 'contacted', 'interested', 'demo_done', 'docs_collected',
  'application_submitted', 'under_review', 'approved', 'activated', 'active',
  'at_risk', 'churned',
];

const leadSchema = new mongoose.Schema({
  businessName: { type: String, required: true, index: true },
  typeKey: { type: String, default: '', index: true },
  subType: { type: String, default: '' },
  city: { type: String, default: '', index: true },
  area: { type: String, default: '' },
  pincode: { type: String, default: '' },
  geo: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },
  contacts: [{
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    phoneEnc: { type: String, default: '' },
    emailEnc: { type: String, default: '' },
  }],
  source: {
    type: String,
    enum: ['field_visit', 'referral', 'association', 'inbound', 'event', 'ads', 'other'],
    default: 'field_visit',
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  territoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Territory', index: true },
  stage: { type: String, enum: LEAD_STAGES, default: 'identified', index: true },
  stageEnteredAt: { type: Date, default: Date.now },
  score: { type: Number, min: 0, max: 100, default: 0 },
  tags: [{ type: String }],
  estMonthlyVolume: { type: Number, default: 0 },
  lostReason: { type: String, default: '' },
  nextAction: {
    type: { type: String, default: '' },
    dueAt: { type: Date, default: null },
  },
  consent: {
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
  },
  linkedApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderApplication', default: null },
  linkedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  dedupeKey: { type: String, default: '', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leadSchema.index({ ownerId: 1, stage: 1 });
leadSchema.index({ typeKey: 1, city: 1, stage: 1 });
leadSchema.index({ geo: '2dsphere' });

export const LEAD_STAGES_LIST = LEAD_STAGES;
export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
