import mongoose from 'mongoose';
import { generateTimestampedId } from '../utils/idGenerator.js';

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String, required: true },
  address: { type: String },
  gstNumber: { type: String, default: '' },
  // Checklist L5: GSTIN is format+checksum validated (lib/gstin.js) at write
  // time; `gstValidatedAt` records when it last passed.
  gstValidatedAt: { type: Date, default: null },
  // Checklist L5: vendor onboarding approval. Legacy rows hydrate as
  // Approved; the create route forces Pending explicitly.
  onboardingStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Approved',
  },
  onboardingReview: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: null },
    reason: { type: String, default: '' },
  },
  // A2 (rolesmd/subcatogary.md) + catogary.md L290 — the 5 originals plus
  // reagents, implants, linen, gases, food, IT and B2B surgical/OT
  // consumables. Additive only.
  category: {
    type: String,
    enum: [
      'Medical Supplies', 'Pharmaceuticals', 'Surgical Instruments',
      'Equipment', 'General',
      // A2 / L290 additions
      'Reagents', 'Implants', 'Linen', 'Medical Gases', 'Food', 'IT',
      'OT Consumables',
    ],
    default: 'General',
  },
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }],
  rating: { type: Number, min: 1, max: 5 },
  // File 16 §16.6: vendor 360 — statutory + banking + score inputs.
  pan: { type: String, default: '' },
  bankName: { type: String, default: '' },
  bankAccount: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  msmeNo: { type: String, default: '' },
  documents: [{ name: { type: String, default: '' }, url: { type: String, default: '' }, uploadedAt: { type: Date, default: Date.now } }],
  onTimePct: { type: Number, default: null },
  qualityPct: { type: Number, default: null },
  leadTime: { type: Number, default: 7 }, // days
  paymentTerms: { type: String, default: 'Net 30' },
  isActive: { type: Boolean, default: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

supplierSchema.pre('save', async function (next) {
  if (!this.supplierId) {
    this.supplierId = generateTimestampedId('SUP');
  }
  next();
});

export default mongoose.model('Supplier', supplierSchema);