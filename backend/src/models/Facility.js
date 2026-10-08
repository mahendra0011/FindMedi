import mongoose from 'mongoose';
import { generate16DigitId } from '../utils/idGenerator.js';
import { SERVICE_MODES } from '../lib/providerTypes.js';
import { normalizeModes } from '../lib/appointmentModes.js';

// A1 #11 (rolesmd/subcatogary.md) — `type` is only the 4-way top level, so
// nursing homes, dental clinics, Jan Aushadhi kendras and PHCs had nowhere to
// go. catogary.md §1 (rows L29-L42, L182) + subcatogary.md §1.1 supply the row
// beneath it. Optional: existing facilities simply have no subType yet.
const FACILITY_SUBTYPES = [
  // hospital / primary govt (catogary.md L29, L31-L35, L41-L42, L182)
  'multi_specialty', 'super_specialty', 'single_specialty', 'nursing_home',
  'maternity_hospital', 'day_care_surgery', 'government_hospital',
  'district_hospital', 'medical_college', 'phc', 'chc', 'uphc', 'sub_centre',
  'arogya_mandir', 'mohalla_community_clinic', 'trauma_centre',
  'rehabilitation_hospital', 'psychiatric_hospital', 'tb_chest_hospital',
  'infectious_disease_hospital', 'cancer_centre', 'railway_esi_cghs_defence',
  // clinic (catogary.md L30, L36-L40; subcatogary.md §1.1)
  'single_doctor_clinic', 'polyclinic', 'specialty_clinic', 'dental_clinic',
  'eye_clinic', 'ayush_clinic', 'physiotherapy_clinic', 'fertility_clinic',
  'urgent_care_clinic', 'corporate_clinic', 'campus_clinic',
  'telemedicine_clinic',
  // lab / diagnostic (subcatogary.md §1.1)
  'pathology_lab', 'imaging_centre', 'diagnostic_centre', 'collection_centre',
  'home_collection_lab', 'mobile_diagnostic_van', 'cardiac_diagnostic_centre',
  'sleep_lab', 'genetic_molecular_lab', 'blood_bank',
  // pharmacy (subcatogary.md §1.1)
  'retail_pharmacy', 'hospital_pharmacy', 'jan_aushadhi_kendra',
  'generic_store', 'pharmacy_24x7', 'online_pharmacy',
  'ayurvedic_homeopathic_store', 'surgical_ortho_store', 'chain_pharmacy',
  'wholesale_pharmacy',
  // wellness / rehab / long-term care (subcatogary.md §1.1)
  'wellness_centre', 'fitness_centre', 'elder_care_home', 'assisted_living',
  'hospice_palliative', 'de_addiction_centre', 'child_development_centre',
  'rehabilitation_centre',
  '', // house convention for an optional enum: '' = not specified yet
];

// subcatogary.md §1.2 ownership — feeds the "government/private/trust"
// search facet (B4).
const FACILITY_OWNERSHIP = [
  'government', 'private', 'trust_charitable', 'corporate_chain',
  'cooperative', 'ppp', 'military_railway_esi',
  '', // not specified yet
];

// subcatogary.md §1.3 system of medicine — a separate dimension from
// specialty (B1.4), so "Ayurveda clinic" is not smuggled into specialities.
const SYSTEMS_OF_MEDICINE = [
  'allopathy', 'ayurveda', 'homeopathy', 'unani', 'siddha',
  'yoga_naturopathy', 'sowa_rigpa', 'integrative',
  '', // not specified yet
];

// subcatogary.md §1.5 schemes accepted — the Ayushman/CGHS/TPA filter (B4)
// and the catogary.md L330 "TPA / cashless desk" gap. `pmjay`, `cghs` and
// `state_scheme` reuse the tokens lib/providerTypeCatalog.js already uses so
// the two vocabularies do not drift.
const FACILITY_SCHEMES = [
  'pmjay', 'cghs', 'esi', 'echs', 'state_scheme', 'insurance_cashless',
  'tpa_empanelled', 'corporate_tie_up',
];

// A1 #10 — `home` duplicated `home_visit` and `voice`/`call` duplicated
// `audio`. The canonical list is SERVICE_MODES (lib/providerTypes.js); these
// four are the legacy spellings. They stay in the enum because stored
// documents still hold them (an enum removal would fail validation on every
// old row) and because `offline` is still the key `Appointment.appointmentMode`,
// `appointmentFees.offline` and the clinic UI read. `home`/`voice`/`call` are
// rewritten onto `home_visit`/`audio` by scripts/migrate-enum-normalization.mjs.
const LEGACY_APPOINTMENT_MODES = ['offline', 'home', 'voice', 'call'];

const facilitySchema = new mongoose.Schema({
  facilityId: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  type: { type: String, enum: ['hospital', 'clinic', 'lab', 'pharmacy'], required: true, index: true },
  subType: { type: String, enum: FACILITY_SUBTYPES, default: '' },
  ownership: { type: String, enum: FACILITY_OWNERSHIP, default: '' },
  systemOfMedicine: { type: String, enum: SYSTEMS_OF_MEDICINE, default: '' },
  schemesAccepted: [{ type: String, enum: FACILITY_SCHEMES }],
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, index: true },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  licenseNumber: { type: String, required: true },
  logo: { type: String, default: '' },
  description: { type: String, default: '' },
  specialties: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  rejectionReason: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  subscriptionPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  createdAt: { type: Date, default: Date.now, index: true },

  establishedYear: { type: Number, default: null },
  totalDoctors: { type: Number, default: 0 },
  accreditations: [{ type: String }],
  hospitalType: { type: String, default: 'Private' },
  emergency24x7: { type: Boolean, default: false },
  emergencySupport: { type: Boolean, default: false },
  refundOnMissedOrCancelled: { type: Boolean, default: true },
  appointmentModes: {
    type: [String],
    enum: [...SERVICE_MODES, ...LEGACY_APPOINTMENT_MODES],
    default: ['chat', 'video', 'offline', 'home_visit', 'audio'],
  },
  appointmentFees: {
    chat: { type: Number, default: 300 },
    video: { type: Number, default: 500 },
    audio: { type: Number, default: 400 },
    offline: { type: Number, default: 500 },
    home_visit: { type: Number, default: 800 },
  },
  bedAvailability: { type: Number, default: 0 },
  ambulanceService: { type: Boolean, default: false },
  image: { type: String, default: '' },

  // Lab-specific fields
  nablNumber: { type: String, default: '' },
  aerbNumber: { type: String, default: '' },
  workingHours: { type: String, default: '8:00 AM - 8:00 PM' },

  pathologistName: { type: String, default: '' },
  pathologistQualification: { type: String, default: '' },
  radiologistName: { type: String, default: '' },
  radiologistQualification: { type: String, default: '' },
  cardiologistName: { type: String, default: '' },
  cardiologistQualification: { type: String, default: '' },

  technicianName: { type: String, default: '' },
  technicianRole: { type: String, default: '' },
  technicianQualification: { type: String, default: '' },
  technicianExperience: { type: String, default: '' },

  timing: {
    monday: { type: String, default: '8:00 AM - 8:00 PM' },
    tuesday: { type: String, default: '8:00 AM - 8:00 PM' },
    wednesday: { type: String, default: '8:00 AM - 8:00 PM' },
    thursday: { type: String, default: '8:00 AM - 8:00 PM' },
    friday: { type: String, default: '8:00 AM - 8:00 PM' },
    saturday: { type: String, default: '9:00 AM - 6:00 PM' },
    sunday: { type: String, default: 'Closed' },
  },

  amenities: {
    parking: { type: Boolean, default: false },
    acWaitingArea: { type: Boolean, default: false },
    wheelchairAccess: { type: Boolean, default: false },
    cardPayment: { type: Boolean, default: false },
    inHousePharmacy: { type: Boolean, default: false },
    drinkingWater: { type: Boolean, default: false },
    wifi: { type: Boolean, default: false },
    homeVisit: { type: Boolean, default: false },
    homeDelivery: { type: Boolean, default: false },
    prescriptionUpload: { type: Boolean, default: false },
  },

  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
  },

  settings: {
    autoConfirmAppointment: { type: Boolean, default: true },
  },

  details: {
    type: Object,
    default: {},
  },
}, { timestamps: true });

facilitySchema.pre('save', async function (next) {
  if (!this.facilityId) {
    this.facilityId = generate16DigitId();
  }
  // R0 taxonomy (A1 #10): canonicalize legacy appointment-mode spellings
  // (home -> home_visit, voice/call -> audio) on write. Best-effort only.
  try {
    if (Array.isArray(this.appointmentModes)) {
      this.appointmentModes = normalizeModes(this.appointmentModes);
    }
  } catch {
    // ignore: a normalization failure must not fail the write
  }
  next();
});

facilitySchema.index({ type: 1, status: 1 });
facilitySchema.index({ location: '2dsphere' });

export default mongoose.model('Facility', facilitySchema);
