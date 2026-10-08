import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';
import { CATEGORY_TIERS } from '../lib/taxonomy.js';
import {
  PROVIDER_KINDS, PROVIDER_GROUPS, PROVIDER_STATUS, VERIFICATION_STATUS, PROVIDER_PLANS,
} from '../lib/providerTypes.js';

// 10.md §2.1 — one generic provider row per entity the platform can list
// (hospital, lab, pharmacy, gym, yoga studio, equipment vendor, camp organiser…).
// `kind` says what the thing IS, `type` (a ProviderTypeConfig.typeKey) says which
// join wizard / approval policy applies, `group` drives navigation and what a
// T3 provider is allowed to see. Modelled next to Facility/Hospital on purpose:
// both are imported rather than replacing anything, so the directory keeps
// working while listings migrate onto Provider.
const providerSchema = new mongoose.Schema({
  providerId: { type: String, unique: true, sparse: true, index: true },
  ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  kind: { type: String, enum: PROVIDER_KINDS, required: true, index: true },
  type: { type: String, required: true, trim: true, lowercase: true, index: true },
  group: { type: String, enum: PROVIDER_GROUPS, required: true, index: true },
  tier: { type: String, enum: CATEGORY_TIERS, default: 'T3' },

  name: { type: String, required: true, trim: true, maxlength: 160, index: true },
  slug: { type: String, unique: true, sparse: true, index: true, lowercase: true, trim: true },
  tagline: { type: String, trim: true, maxlength: 160, default: '' },
  description: { type: String, maxlength: 2000, default: '' },
  media: [{
    url: { type: String, maxlength: 500 },
    type: { type: String, enum: ['image', 'video', 'document'], default: 'image' },
    alt: { type: String, maxlength: 160, default: '' },
  }],

  categoryCodes: [{ type: String, maxlength: 64 }],
  systemOfMedicine: { type: String, trim: true, maxlength: 60, default: '' },
  ownership: { type: String, trim: true, maxlength: 60, default: '' },
  accreditations: [{ type: String, maxlength: 120 }],
  schemesAccepted: [{ type: String, maxlength: 120 }],

  address: {
    line1: { type: String, maxlength: 200, default: '' },
    area: { type: String, maxlength: 120, default: '' },
    city: { type: String, maxlength: 80, default: '', index: true },
    state: { type: String, maxlength: 80, default: '' },
    pincode: { type: String, maxlength: 10, default: '' },
    geo: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined },
    },
  },
  serviceArea: {
    radiusKm: { type: Number, min: 0, max: 500, default: 0 },
    pincodes: [{ type: String, maxlength: 10 }],
  },

  timings: {
    weekly: [{
      day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      open: { type: String, maxlength: 8, default: '' },
      close: { type: String, maxlength: 8, default: '' },
      closed: { type: Boolean, default: false },
    }],
    exceptions: [{
      date: { type: String, maxlength: 10 },
      closed: { type: Boolean, default: false },
      open: { type: String, maxlength: 8, default: '' },
      close: { type: String, maxlength: 8, default: '' },
    }],
    is24x7: { type: Boolean, default: false },
  },

  languages: [{ type: String, maxlength: 60 }],
  amenities: [{ type: String, maxlength: 60 }],

  // Public vs relayed contact: relayPhone is only handed to a logged-in caller
  // who actually holds a booking with this provider (10.md §2.1 "private fields
  // separated"), never to the anonymous directory.
  contact: {
    publicPhone: { type: String, maxlength: 20, default: '' },
    relayPhone: { type: String, maxlength: 20, default: '' },
    email: { type: String, maxlength: 160, default: '' },
  },

  verification: {
    status: { type: String, enum: VERIFICATION_STATUS, default: 'unverified', index: true },
    level: { type: Number, min: 0, max: 3, default: 0 },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    scope: [{ type: String, maxlength: 60 }],
    nextReviewAt: { type: Date, default: null },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
  },

  status: { type: String, enum: PROVIDER_STATUS, default: 'draft', index: true },
  probation: {
    active: { type: Boolean, default: false },
    bookingCap: { type: Number, min: 0, default: 0 },
    payoutHold: { type: Boolean, default: false },
  },
  trusted: { type: Boolean, default: false },
  plan: { type: String, enum: PROVIDER_PLANS, default: 'free' },
  commissionConfigId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommissionConfig', default: null },

  stats: {
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    responseTimeMin: { type: Number, min: 0, default: 0 },
    completionRate: { type: Number, min: 0, max: 100, default: 0 },
  },

  parentProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null, index: true },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  importedFrom: { type: String, maxlength: 120, default: '' },
}, { timestamps: true });

providerSchema.pre('save', async function preSave(next) {
  if (!this.providerId) this.providerId = generate16DigitId();
  if (!this.slug) this.slug = await buildUniqueSlug(this);
  next();
});

async function buildUniqueSlug(doc) {
  const base = String(doc.name).toLowerCase()
    .normalize('NFKD').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80) || 'provider';
  const Provider = doc.constructor;
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const taken = await Provider.exists({ slug: candidate, _id: { $ne: doc._id } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

providerSchema.index({ 'address.geo': '2dsphere' });
providerSchema.index({ type: 1, status: 1, 'address.city': 1 });
providerSchema.index({ group: 1, status: 1 });
providerSchema.index({ name: 'text', tagline: 'text' }, { name: 'provider_text_search', weights: { name: 10, tagline: 5 } });

export default mongoose.models.Provider || mongoose.model('Provider', providerSchema);
