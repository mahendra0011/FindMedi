import mongoose from 'mongoose';

// rolesmd/subcatogary.md A1 #8 / D1.5 — `category` mixed four dimensions
// (therapeutic class, sales/Rx class, product line and shop departments) in
// one enum. It is kept verbatim so rows written before the split still
// validate; the dimensions now live in `therapeuticClass`, `rxSchedule` and
// `productLine` below. `Vitamin`/`Vitamins` were a straight duplicate (A1 #5):
// both stay in the enum as legacy aliases and
// scripts/migrate-enum-normalization.mjs rewrites stored rows onto `Vitamins`
// — dropping either value would orphan documents that migration has not run
// against yet.
const MEDICINE_CATEGORIES = [
  'Antibiotic', 'Analgesic', 'Antihypertensive', 'Antidiabetic', 'Antacid',
  'Antihistamine', 'Antiviral', 'Antifungal', 'Vitamin', 'Steroid', 'Anesthetic',
  'Diuretic', 'Cardiac', 'Respiratory', 'Prescription', 'OTC', 'Generic',
  'Baby Care', 'Ayurvedic', 'Devices', 'Vitamins', 'Supplements',
  'Personal Care', 'Other',
];

// §5.3 dosage form — the 9 that existed plus the ones A2 flagged missing
// (Ointment, Gel, Lotion, Powder/Sachet, Suppository, Patch, Spray, Lozenge,
// eye/ear/nasal drops, Kit). Additive only.
const MEDICINE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Injection', 'Drop', 'Cream', 'Inhaler',
  'Infusion', 'Other', 'Ointment', 'Gel', 'Lotion', 'Powder', 'Sachet',
  'Suppository', 'Patch', 'Spray', 'Lozenge', 'Eye Drop', 'Ear Drop',
  'Nasal Drop', 'Kit',
];

// §5.1 therapeutic class (ATC-style) — dimension 1 of the A1 #8 split.
// Mirrors the §5.1 groupings; `atcCode` below carries the structured code.
const THERAPEUTIC_CLASSES = [
  'Antibiotic', 'Antiviral', 'Antifungal', 'Antiparasitic', 'Antimalarial',
  'Anti-TB', 'Analgesic', 'NSAID', 'Muscle Relaxant', 'Anesthetic', 'Opioid',
  'Antihypertensive', 'Diuretic', 'Statin', 'Antiplatelet', 'Anticoagulant',
  'Antiarrhythmic', 'Nitrate', 'Antidiabetic', 'Insulin', 'Thyroid',
  'Corticosteroid', 'Sex Hormone', 'Antacid', 'Antiemetic', 'Laxative',
  'Antidiarrhoeal', 'ORS/Probiotic', 'Bronchodilator', 'Inhaled Steroid',
  'Cough/Cold', 'Antihistamine', 'Mucolytic', 'Antiepileptic',
  'Antidepressant', 'Antipsychotic', 'Anxiolytic/Sedative', 'Antiparkinson',
  'Migraine', 'Dementia', 'Dermatological', 'Emollient', 'Anti-Acne',
  'Anti-Scabies', 'Eye/Ear/Nose', 'Urological', 'Gynaecological', 'Oncology',
  'Immunosuppressant', 'Vaccine', 'Vitamin', 'Mineral Supplement', 'Antidote',
  'Anti-Allergic', 'Haematinic', 'Cardiac', 'Respiratory', 'Other',
];

// §5.2 Rx schedule (D3: Schedule H/H1/X/NDPS → prescription mandatory,
// H1 register + audit, no quick add-to-cart). Tokens are lowercase so they
// survive the lowercasing/normalising writes the pharmacy routes do.
//   otc            OTC
//   rx             non-scheduled prescription (Rx needed, not scheduled)
//   schedule_h     Schedule H
//   h1             Schedule H1 (register keeping)
//   x              Schedule X (strictest)
//   schedule_g     Schedule G (caution)
//   narcotic_ndps  Narcotic / NDPS
//   ayurvedic      Ayurvedic (OTC/Rx)
// R0 taxonomy (subcatogary.md §5.2 / T0.1): the human/display spellings from
// the audit (`OTC`, `H`, `H1`, `X`, `G`, `NDPS`, `NON_SCHEDULED_RX`, `AYUSH`)
// are accepted as aliases and canonicalized onto the base tokens by the
// setter below, so stored rows keep one spelling. Additive only — every
// previously valid value still validates.
// Exported for Product.js so "is this Rx?" uses ONE vocabulary across both
// catalogues (validate.js keeps its MEDICINE_RX_SCHEDULES copy, kept in sync
// by validateVocab.spec.js).
const RX_SCHEDULE_BASE = ['otc', 'rx', 'schedule_h', 'h1', 'x', 'schedule_g', 'narcotic_ndps', 'ayurvedic'];
export const RX_SCHEDULE_ALIASES = Object.freeze({
  OTC: 'otc',
  H: 'schedule_h',
  H1: 'h1',
  X: 'x',
  G: 'schedule_g',
  NDPS: 'narcotic_ndps',
  NON_SCHEDULED_RX: 'rx',
  AYUSH: 'ayurvedic',
});
const RX_SCHEDULES = Object.freeze([...RX_SCHEDULE_BASE, ...Object.keys(RX_SCHEDULE_ALIASES)]);
export { RX_SCHEDULES };

// Canonicalize an incoming rxSchedule value onto the base tokens. Unknown or
// non-string input passes through untouched so enum validation (not this
// helper) decides what is rejected.
export const canonicalRxSchedule = (raw) => {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  if (Object.prototype.hasOwnProperty.call(RX_SCHEDULE_ALIASES, trimmed)) {
    return RX_SCHEDULE_ALIASES[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (RX_SCHEDULE_BASE.includes(lower)) return lower;
  return raw;
};

// §5.4 product line — dimension 3 of the A1 #8 split (what shelf it sits on,
// not what the drug does). Keeps every legacy `category` value that really
// was a product line so old rows map 1:1.
const PRODUCT_LINES = [
  'Prescription', 'OTC', 'Generic', 'Branded', 'Ayurvedic', 'Homeopathic',
  'Unani/Siddha', 'Supplements', 'Baby Care', 'Personal Care',
  'Sexual Wellness', "Women's Hygiene", 'Elder Care', 'Diabetic Care',
  'Surgical/Ortho', 'Medical Devices', 'First Aid', 'Hygiene',
  'Health Foods', 'Other',
];

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String, required: true },
  category: { type: String, enum: MEDICINE_CATEGORIES, required: true },
  form: { type: String, enum: MEDICINE_FORMS, required: true },

  // A1 #8/D1.5 — the four dimensions this `category` used to conflate.
  // None is `required`: rows that predate the split must still save.
  therapeuticClass: { type: String, enum: THERAPEUTIC_CLASSES },
  rxSchedule: { type: String, enum: RX_SCHEDULES, set: (v) => canonicalRxSchedule(v) },
  productLine: { type: String, enum: PRODUCT_LINES },

  // §5.5 special handling flags (R0 taxonomy / T0.1). Subdocument with
  // migration-safe defaults so rows that predate it still save.
  storage: {
    coldChain: { type: Boolean, default: false }, // cold-chain 2–8°C
    coldChainTemp: { type: String, default: '' }, // e.g. '2-8C'
    controlled: { type: Boolean, default: false }, // narcotic/controlled handling
    ageRestricted: { type: Boolean, default: false },
    pregnancyUnsafe: { type: Boolean, default: false },
    lasaWarning: { type: Boolean, default: false }, // look-alike sound-alike
  },

  // §A2 pharmacy row — composition (salt + strength), pack and pricing.
  // T3 commerce, not PII/PHI: no field-level encryption (phiFields covers
  // government IDs + bank details only, and RETENTION.md treats medicine
  // catalog rows as organization records).
  composition: { type: String, default: '' },
  strength: { type: String, default: '' },
  packSize: { type: String, default: '' },
  mrp: { type: Number, min: 0 },
  gstRate: { type: Number, min: 0, max: 28 }, // GST slab, percent
  hsn: { type: String, default: '' },
  habitForming: { type: Boolean }, // no default: unknown must not read as "safe"
  atcCode: { type: String, default: '' }, // WHO ATC, e.g. J01CR02

  manufacturer: { type: String, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  currentStock: { type: Number, required: true, default: 0 },
  // currentStock is sellable stock; checkout reservations decrement it in the
  // same transaction as the PharmacyOrder, then cancellation/expiry restores it.
  reorderLevel: { type: Number, default: 10 },
  prescriptionReq: { type: Boolean, default: false },
  rackLocation: { type: String, default: '' },
  interactions: [{ type: String }], // Drug interactions with other medicines
  contraindications: [{ type: String }], // Conditions where medicine should not be used
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', index: true },
  facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', index: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Medicine', medicineSchema);
