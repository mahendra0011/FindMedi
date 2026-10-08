import mongoose from 'mongoose';
import { SERVICE_MODES } from '../lib/providerTypes.js';

// 10.md 2.6 - a bookable offering. One row per thing a patient can actually
// buy from a provider (consult, test, session, class), with its modes and
// price inline so the booking flow does not have to join three collections to
// quote a fee. Provider-owned: every route resolves ownership through
// Provider.ownerUserId, never through a caller-supplied providerId.

const serviceModeSchema = new mongoose.Schema({
  mode: { type: String, enum: SERVICE_MODES, required: true },
  fee: { type: Number, min: 0, default: 0 },
  durationMin: { type: Number, min: 0, max: 1440, default: 30 },
  followUpDays: { type: Number, min: 0, max: 90, default: 0 },
}, { _id: false });

const servicePackageSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  sessions: { type: Number, min: 1, max: 500, required: true },
  price: { type: Number, min: 0, required: true },
  validityDays: { type: Number, min: 1, max: 730, default: 90 },
}, { _id: false });

const serviceSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, index: true },
  practitionerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null, index: true },
  categoryCode: { type: String, required: true, trim: true, maxlength: 64, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, maxlength: 2000, default: '' },

  modes: [serviceModeSchema],
  durationMin: { type: Number, min: 0, max: 1440, default: 30 },
  price: {
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, maxlength: 3, default: 'INR' },
    taxInclusive: { type: Boolean, default: true },
    gstRate: { type: Number, min: 0, max: 28, default: 0 },
  },
  packages: [servicePackageSchema],

  eligibility: {
    ageMin: { type: Number, min: 0, max: 120, default: 0 },
    ageMax: { type: Number, min: 0, max: 120, default: 120 },
    gender: { type: String, enum: ['any', 'male', 'female', 'other'], default: 'any' },
  },

  prerequisites: [{ type: String, maxlength: 200 }],
  prepInstructions: { type: String, maxlength: 2000, default: '' },
  requiresRx: { type: Boolean, default: false },

  isActive: { type: Boolean, default: true, index: true },
  capacity: {
    perSlot: { type: Number, min: 1, max: 1000, default: 1 },
    perDay: { type: Number, min: 0, max: 10000, default: 0 },
  },
  cancellationPolicyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  regulatoryTags: [{ type: String, maxlength: 60 }],
}, { timestamps: true });

serviceSchema.index({ providerId: 1, isActive: 1 });
serviceSchema.index({ categoryCode: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' }, { name: 'service_text_search', weights: { name: 10, description: 4 } });

export default mongoose.models.Service || mongoose.model('Service', serviceSchema);
