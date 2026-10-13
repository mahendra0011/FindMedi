import mongoose from 'mongoose';

/**
 * File 24 §4.13 CRM Settings: pipeline stages + SLAs, lost reasons, lead
 * sources and lead-scoring weights. Singleton row (key='default'); the §5
 * automation engine reads stage SLAs from here. No PHI.
 */
const crmPipelineConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  leadStages: [{
    key: { type: String, required: true },
    label: { type: String, default: '' },
    slaHours: { type: Number, default: 72, min: 0 },
    terminal: { type: Boolean, default: false },
  }],
  partnerStages: [{
    key: { type: String, required: true },
    label: { type: String, default: '' },
    slaHours: { type: Number, default: 96, min: 0 },
    terminal: { type: Boolean, default: false },
  }],
  lostReasons: [{ type: String, maxlength: 120 }],
  leadSources: [{ type: String, maxlength: 40 }],
  scoringWeights: {
    volume: { type: Number, default: 30, min: 0, max: 100 },
    categoryPriority: { type: Number, default: 25, min: 0, max: 100 },
    decisionMaker: { type: Number, default: 15, min: 0, max: 100 },
    digitalReadiness: { type: Number, default: 15, min: 0, max: 100 },
    responsiveness: { type: Number, default: 15, min: 0, max: 100 },
  },
  followUpSlaHours: { type: Number, default: 4, min: 0 },
  docRenewalLeadDays: { type: Number, default: 30, min: 1, max: 180 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const DEFAULT_LEAD_STAGES = [
  { key: 'identified', label: 'Identified', slaHours: 24, terminal: false },
  { key: 'contacted', label: 'Contacted', slaHours: 48, terminal: false },
  { key: 'interested', label: 'Interested', slaHours: 72, terminal: false },
  { key: 'demo_done', label: 'Demo Done', slaHours: 72, terminal: false },
  { key: 'docs_collected', label: 'Docs Collected', slaHours: 72, terminal: false },
  { key: 'application_submitted', label: 'Application Submitted', slaHours: 48, terminal: false },
  { key: 'under_review', label: 'Under Review', slaHours: 72, terminal: false },
  { key: 'approved', label: 'Approved', slaHours: 72, terminal: false },
  { key: 'activated', label: 'Activated', slaHours: 0, terminal: false },
  { key: 'active', label: 'Active', slaHours: 0, terminal: true },
  { key: 'at_risk', label: 'At Risk', slaHours: 24, terminal: false },
  { key: 'churned', label: 'Churned', slaHours: 0, terminal: true },
];

const DEFAULT_PARTNER_STAGES = [
  { key: 'identified', label: 'Identified', slaHours: 72, terminal: false },
  { key: 'intro_done', label: 'Intro Done', slaHours: 72, terminal: false },
  { key: 'proposal_sent', label: 'Proposal Sent', slaHours: 96, terminal: false },
  { key: 'negotiation', label: 'Negotiation', slaHours: 96, terminal: false },
  { key: 'agreement_signed', label: 'Agreement Signed', slaHours: 0, terminal: false },
  { key: 'pilot', label: 'Pilot', slaHours: 168, terminal: false },
  { key: 'active', label: 'Active', slaHours: 0, terminal: true },
  { key: 'renewal', label: 'Renewal', slaHours: 168, terminal: false },
  { key: 'lost', label: 'Lost', slaHours: 0, terminal: true },
];

const DEFAULT_LOST_REASONS = [
  'Price / budget', 'Chose competitor', 'Not ready now', 'No decision maker',
  'Compliance gaps', 'Unresponsive', 'Out of service area', 'Other',
];

const DEFAULT_LEAD_SOURCES = [
  'field_visit', 'referral', 'association', 'inbound', 'event', 'ads', 'other',
];

/** Defaults used by GET /settings when no row exists yet (and by the engine). */
export const defaultPipelineConfig = () => ({
  key: 'default',
  leadStages: DEFAULT_LEAD_STAGES.map((s) => ({ ...s })),
  partnerStages: DEFAULT_PARTNER_STAGES.map((s) => ({ ...s })),
  lostReasons: [...DEFAULT_LOST_REASONS],
  leadSources: [...DEFAULT_LEAD_SOURCES],
  scoringWeights: {
    volume: 30, categoryPriority: 25, decisionMaker: 15, digitalReadiness: 15, responsiveness: 15,
  },
  followUpSlaHours: 4,
  docRenewalLeadDays: 30,
});

export const LEAD_SOURCE_LIST = DEFAULT_LEAD_SOURCES;

export default mongoose.models.CrmPipelineConfig
  || mongoose.model('CrmPipelineConfig', crmPipelineConfigSchema);
