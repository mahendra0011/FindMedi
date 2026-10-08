import mongoose from 'mongoose';
import {
  PROVIDER_KINDS, PROVIDER_GROUPS, PROVIDER_STATUS, APPROVAL_LEVELS,
} from '../lib/providerTypes.js';
import { CATEGORY_TIERS } from '../lib/taxonomy.js';

// 10.md §2.2 — the config row behind the "Join FindMedi" wizard: adding a new
// provider type is data, not code. One document pins the steps/fields/docs a
// type asks for, the approval policy its onboarding must clear, and the version
// the applicant agreed to (so a later config edit cannot rewrite a submitted
// application's requirements out from under review).
const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'boolean', 'file', 'phone', 'email', 'geo', 'address'];

const wizardFieldSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: FIELD_TYPES, required: true },
  required: { type: Boolean, default: false },
  help: { type: String, maxlength: 300, default: '' },
  options: [{ type: String, maxlength: 120 }],
  defaultValue: { type: mongoose.Schema.Types.Mixed, default: undefined },
}, { _id: false });

const wizardStepSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  fields: [{ type: String, maxlength: 60 }],
}, { _id: false });

const requiredDocSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true, maxlength: 60 },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  mandatory: { type: Boolean, default: true },
  expiryRequired: { type: Boolean, default: false },
  maxMb: { type: Number, min: 1, max: 50, default: 10 },
}, { _id: false });

const providerTypeConfigSchema = new mongoose.Schema({
  typeKey: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 60 },
  kind: { type: String, enum: PROVIDER_KINDS, required: true, index: true },
  group: { type: String, enum: PROVIDER_GROUPS, required: true, index: true },
  tier: { type: String, enum: CATEGORY_TIERS, default: 'T3' },
  label: { type: String, required: true, trim: true, maxlength: 120 },
  icon: { type: String, trim: true, maxlength: 60, default: '' },
  description: { type: String, maxlength: 500, default: '' },

  steps: [wizardStepSchema],
  fields: [wizardFieldSchema],
  requiredDocs: [requiredDocSchema],
  optionalDocs: [requiredDocSchema],
  agreementTemplateId: { type: String, maxlength: 60, default: '' },

  approvalPolicy: {
    level: { type: String, enum: APPROVAL_LEVELS, default: 'single' },
    slaHours: { type: Number, min: 0, max: 720, default: 72 },
    twoPerson: { type: Boolean, default: false },
  },

  enabledCities: [{ type: String, maxlength: 80 }],
  allowedStatus: [{ type: String, enum: PROVIDER_STATUS }],
  commissionDefaults: {
    percent: { type: Number, min: 0, max: 100, default: 0 },
    fixed: { type: Number, min: 0, default: 0 },
    currency: { type: String, maxlength: 3, default: 'INR' },
  },

  version: { type: Number, min: 1, default: 1 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

providerTypeConfigSchema.index({ isActive: 1, group: 1 });
providerTypeConfigSchema.index({ label: 'text', description: 'text' }, { name: 'provider_type_config_text' });

export default mongoose.models.ProviderTypeConfig
  || mongoose.model('ProviderTypeConfig', providerTypeConfigSchema);
