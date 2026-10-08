import mongoose from 'mongoose';

/**
 * Partnership CRM (file 24 §4.4/§8): RWAs, corporates, NGOs, associations,
 * schools, insurers, govt depts. Outcome tracking links to events/camps.
 */
const PARTNER_STAGES = [
  'identified', 'intro_done', 'proposal_sent', 'negotiation',
  'agreement_signed', 'pilot', 'active', 'renewal', 'lost',
];

const partnerSchema = new mongoose.Schema({
  orgName: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['rwa', 'corporate', 'ngo', 'association', 'school', 'insurer', 'govt', 'hospital_group', 'media', 'other'],
    default: 'other', index: true,
  },
  city: { type: String, default: '', index: true },
  area: { type: String, default: '' },
  size: { type: Number, default: 0 },
  contacts: [{
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    phoneEnc: { type: String, default: '' },
    emailEnc: { type: String, default: '' },
  }],
  stage: { type: String, enum: PARTNER_STAGES, default: 'identified', index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  offer: { type: String, maxlength: 2000, default: '' },
  mouStatus: { type: String, enum: ['', 'draft', 'signed', 'expired'], default: '' },
  mouDocRef: { type: String, default: '' },
  outcomes: {
    eventsHeld: { type: Number, default: 0 },
    registrations: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  nextStep: { type: String, default: '' },
  nextStepDueAt: { type: Date, default: null },
}, { timestamps: true });

partnerSchema.index({ ownerId: 1, stage: 1 });

export const PARTNER_STAGES_LIST = PARTNER_STAGES;
export default mongoose.models.Partner || mongoose.model('Partner', partnerSchema);
