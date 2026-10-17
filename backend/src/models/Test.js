import mongoose from 'mongoose';

const toCategoryCode = (raw) => {
  const s = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s ? `TEST.${s}` : '';
};

const testSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  // subcatogary.md A1 #4 / D1.4 — canonical Category code alongside free-text
  // `category` (kept required so old rows/clients keep working). Auto-filled
  // from `category` when blank; never overwrites an explicitly set code.
  categoryCode: { type: String, default: '', index: true },
  department: { type: String, default: 'Pathology' },
  price: { type: Number, required: true },
  // File 22 P1-11: reference + critical limits (copied onto order lines).
  refLow: { type: Number, default: null },
  refHigh: { type: Number, default: null },
  criticalLow: { type: Number, default: null },
  criticalHigh: { type: Number, default: null },
  unit: { type: String, default: '' },
  mrp: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  // ── §6 commercial / reporting / routing metadata ──
  corporatePrice: { type: Number, default: 0 },
  insuranceRate: { type: Number, default: 0 },
  outsourcingCost: { type: Number, default: 0 },
  reportTemplate: { type: String, default: '' },
  resultFormat: { type: String, enum: ['Text', 'Numeric', 'Table', 'Image'], default: 'Text' },
  verificationRole: { type: String, enum: ['pathologist', 'lab_owner', 'both'], default: 'both' },
  expectedTatHours: { type: Number, default: 24 },
  criticalLimits: {
    low: { type: Number, default: null },
    high: { type: Number, default: null },
  },
  referenceRanges: [{
    gender: { type: String, enum: ['Male', 'Female', 'All', ''], default: 'All' },
    ageMin: { type: Number, default: null },
    ageMax: { type: Number, default: null },
    low: { type: Number, default: null },
    high: { type: Number, default: null },
    unit: { type: String, default: '' },
  }],
  // Change log so a price edit is auditable (never a silent overwrite).
  priceHistory: [{
    price: { type: Number, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  }],
  fastingRequired: { type: Boolean, default: false },
  reportTime: { type: String, default: '24 hrs' },
  prescriptionReq: { type: Boolean, default: false },
  homeCollection: { type: Boolean, default: false },
  homeCollectionFee: { type: Number, default: 0 },
  popular: { type: Boolean, default: false },
  nablAccredited: { type: Boolean, default: false },
  aerbCertified: { type: Boolean, default: false },
  reportsOnline: { type: Boolean, default: true },
  quickTest: { type: Boolean, default: false },
  walkinAvailable: { type: Boolean, default: true },
  description: { type: String, default: '' },
  preparation: { type: String, default: '' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },

  providerType: { type: String, enum: ['hospital', 'clinic', 'lab_technician', 'phlebotomist', 'radiographer', 'sonographer'], default: 'lab_technician' },
  providerName: { type: String, default: '' },
  providerId: { type: String, default: '' },
  providerLogo: { type: String, default: '' },
  distance: { type: String, default: '' },
  rating: { type: Number, default: 4.5 },
  reviewsCount: { type: Number, default: 0 },

  clinicType: { type: String, default: '' },
  linkedDoctor: { type: String, default: '' },
  doctor: { type: String, default: '' },
  admissionReq: { type: Boolean, default: false },
  mode: { type: String, default: '' },
  certifiedPhlebotomist: { type: Boolean, default: false },
  certifiedSonographer: { type: Boolean, default: false },
  sampleType: {
    type: String,
    // subcatogary.md §79: free-text → enum. '' = unspecified (catalog rows
    // predate the enum); canonicalize at the zod boundary — the model only
    // stores catalog spellings.
    enum: ['Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'Swab', 'CSF', 'Tissue', 'Semen', 'Body Fluid', 'Saliva', ''],
    default: '',
    set: (v) => (typeof v === 'string' ? v.trim() : v),
  },
  equipmentType: { type: String, default: '' },
  scanType: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

testSchema.pre('save', function (next) {
  try {
    if (!this.categoryCode && this.category) this.categoryCode = toCategoryCode(this.category);
  } catch { /* best-effort only */ }
  if (typeof next === 'function') next();
});

export default mongoose.model('Test', testSchema);
