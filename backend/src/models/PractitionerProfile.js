import mongoose from 'mongoose';

/**
 * Non-Doctor practitioners (10.md 2.5): dentists, physios, dietitians,
 * nurses, counsellors, yoga teachers, trainers, lawyers — the roles the
 * provider-type catalogues admit but `Doctor` cannot model without lying about
 * an MBBS registration. Doctor stays the clinical credential row; this is the
 * bookable person's profile: what they are licensed as, what modes they work
 * in, and at what fee.
 *
 * Retention: the same Provider KYC class as Doctor/Staff — it is the person
 * behind the profile, on the "life of relationship + 1 year" clock.
 */
const practitionerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', index: true, default: null },

  roleType: {
    // 7.md:40 (AYUSH modules) + 7.md:42/103 (phlebotomist assignment): the two
    // bookable practitioner kinds the original nine could not model. Anything
    // beyond these needs its own spec row, not a drive-by enum push.
    type: String,
    enum: ['doctor', 'dentist', 'physio', 'dietitian', 'nurse', 'counsellor', 'yoga_teacher', 'trainer', 'lawyer', 'ayush_practitioner', 'phlebotomist'],
    required: true,
    index: true,
  },
  // Canonical taxonomy code (10.md 2.5; the same code Doctor.specialtyCode uses).
  specialtyCode: { type: String, maxlength: 64, default: '' },
  subSpecialtyCodes: [{ type: String, maxlength: 64 }],
  conditions: [{ type: String, maxlength: 200 }],

  // `numberEnc`: registration numbers are stored encrypted/at least masked —
  // they are verifiable identifiers, not display fields.
  registration: {
    council: { type: String, maxlength: 200, default: '' },
    numberEnc: { type: String, maxlength: 500, default: '' },
    verifiedAt: { type: Date, default: null },
  },

  qualifications: [{ type: String, maxlength: 200 }],
  experienceYears: { type: Number, min: 0, max: 80, default: 0 },
  languages: [{ type: String, maxlength: 60 }],
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },

  // Fee lives per MODE (in-person vs video vs home visit), never as one
  // number: a home visit is not the same price as a clinic consult.
  modes: [{
    mode: { type: String, enum: ['in_person', 'video', 'audio', 'chat', 'home_visit'], required: true },
    fee: { type: Number, required: true, min: 0 },
    duration: { type: Number, min: 5, max: 480, default: 15 },
    followUp: { type: Number, min: 0, default: 0 },
  }],

  locations: [{
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    schedule: { type: String, maxlength: 500, default: '' },
    fees: { type: Number, min: 0, default: 0 },
  }],

  bioI18n: { type: Map, of: String, default: undefined },
  badges: [{ type: String, maxlength: 80 }],

  // Profile lifecycle only — org-level live/suspended is Provider.status.
  status: { type: String, enum: ['draft', 'active', 'suspended', 'archived'], default: 'draft', index: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

practitionerProfileSchema.index({ roleType: 1, status: 1 });
practitionerProfileSchema.index({ specialtyCode: 1, status: 1 });

export default mongoose.models.PractitionerProfile || mongoose.model('PractitionerProfile', practitionerProfileSchema);
