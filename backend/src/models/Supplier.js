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
  // Wave 4b: Vendor rating + KYC (#28)
  ratings: [{
    rating: { type: Number, min: 1, max: 5 },
    complianceScore: { type: Number, min: 0, max: 100 },
    comments: { type: String, default: '' },
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  kycDocs: [{
    docType: { type: String, enum: ['GST', 'PAN', 'DrugLicense', 'MSME', 'CancelledCheque', 'Other'], default: 'Other' },
    docNumber: { type: String, default: '' },
    docUrl: { type: String, default: '' },
    // T7: expiry drives the daily sweep → kycStatus='Expired' + 30-day alert.
    expiry: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }],
  kycStatus: {
    type: String,
    enum: ['Pending', 'Verified', 'Rejected', 'Expired'],
    default: 'Pending',
  },
  // T7: why the last KYC decision was taken (audit trail for reviewers).
  kycDecision: {
    status: { type: String, enum: ['', 'Pending', 'Verified', 'Rejected', 'Expired'], default: '' },
    reason: { type: String, default: '', maxlength: 1000 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: null },
  },
  complianceScore: { type: Number, default: 100 },
  licenseExpiry: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

supplierSchema.pre('save', async function () {
  if (!this.supplierId) {
    this.supplierId = generateTimestampedId('SUP');
  }
});

export default mongoose.model('Supplier', supplierSchema);