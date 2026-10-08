import { z } from 'zod';
import { CATEGORY_TYPES, CATEGORY_TIERS, CATEGORY_CODE_RE } from '../lib/taxonomy.js';
import { PROVIDER_KINDS, PROVIDER_GROUPS, PROVIDER_STATUS, SERVICE_MODES, APPLICATION_DECISIONS, CHECKLIST_STATUSES } from '../lib/providerTypes.js';
// FLOW-B/E/G block at the end of this file takes EVENT_TYPES from the same
// module the model uses, so the write path and the schema cannot drift.
import { EVENT_TYPES } from '../lib/flowStates.js';
// A5: appointment statuses come from the same pure module as the model enum
// and the transition table, so this schema cannot accept a value the model
// rejects (it used to — `Rescheduled`).
import { APPOINTMENT_STATUSES } from '../lib/appointmentLifecycle.js';
// 8.md §5/§6 queue vocabulary. moderationRules.js is PURE (no model), which is
// exactly why the import is safe here — see its header.
import { MODERATION_ACTIONS, MODERATION_TARGET_TYPES, MODERATION_CATEGORIES, MODERATION_SEVERITIES } from '../lib/moderationRules.js';

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    const message = err.issues?.[0]?.message || 'Validation failed';
    return res.status(400).json({ message, errors: err.issues || [] });
  }
};

// â”€â”€â”€ Reusable Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ─── P1-6: bounded replacements for `z.any()` in request schemas ───────────
// Keys stay open, but VALUES are type/length-checked: flat scalars, one level
// of arrays/records, no deep nesting, no unbounded strings. This rejects
// prototype-pollution-shaped objects, 10MB-string DoS payloads and type-
// confusion values while accepting every legitimate clinical payload
// (vitals maps, checklists, meal items, schedules, assessments).
export const boundedScalar = z.union([
  z.string().trim().max(4000),
  z.number().finite(),
  z.boolean(),
]);
export const boundedShallow = z.union([
  boundedScalar,
  z.null(),
  z.array(z.union([z.string().trim().max(4000), z.number().finite(), z.boolean(), z.null()])).max(500),
  z.record(z.string().max(200), z.union([z.string().trim().max(8000), z.number().finite(), z.boolean(), z.null()])),
]);
export const boundedText = (max = 2000) => z.string().trim().max(max);
// Vitals-shaped readings: flat string/number map (bp, pulse, temp, spo2…).
export const vitalsShape = z.record(
  z.string().max(120),
  z.union([z.string().trim().max(200), z.number().finite(), z.boolean(), z.null()]),
);
// Checklist as stored by housekeeping/OT: { itemKey: done|note }.
export const checklistMapShape = z.record(
  z.string().max(200),
  z.union([z.boolean(), z.string().trim().max(1000), z.number().finite()]),
);

export const emailSchema = z.string().email('Valid email is required').transform(e => e.toLowerCase());
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
// 7.md 3: mirrors models/User.js role enum (hand-copied like every other
// model/vocab pair in this file). Login sends it as a hint; unknown spellings
// 400 here rather than failing closed downstream.
export const USER_ROLE_OPTIONS = [
  'superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient',
  'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist',
  'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian',
  'physiotherapist', 'counselor', 'counsellor', 'psychiatrist', 'accountant',
  'security', 'technician', 'helper', 'delivery_boy', 'rider', 'assistant',
  'lawyer', 'ambulance',
  'dentist', 'dental_clinic_admin', 'optician', 'optical_shop_owner',
  'phlebotomist', 'home_nursing_admin', 'yoga_instructor', 'yoga_studio_admin',
  'gym_owner', 'trainer', 'wellness_admin', 'therapist', 'equipment_vendor',
  'product_vendor', 'event_organizer', 'ngo_admin', 'group_host', 'trainer_org',
  'blood_bank_admin', 'dialysis_admin', 'fertility_admin', 'maternity_admin',
  'rehab_admin', 'govt_facility_staff', 'tpa_agent', 'medical_reviewer',
  // Ops-console roles were missing from the old inline list (any login
  // sending role:'support_agent' 400d) — the hint is optional, so widening
  // it cannot lock anyone out.
  'kyc_reviewer', 'moderator', 'support_agent', 'finance_admin',
  'catalog_manager', 'compliance_officer', 'content_editor', 'city_manager',
];
export const phoneSchema = z.string().min(10, 'Phone must be at least 10 digits').max(15).optional();
export const positiveNumber = z.number().positive('Must be a positive number');
export const nonNegativeNumber = z.number().nonnegative('Must be non-negative');

// ─── Write-path vocabularies ────────────────────────────────────────────────
// These mirror enums on the Mongoose models. The models are deliberately NOT
// imported here: importing one would register a mongoose model as a side
// effect of request validation (the same reason lib/providerTypes.js exists).
// test/unit/validateVocab.spec.js pins every array below to its model schema
// so the two lists cannot drift.
export const VEHICLE_TYPE_OPTIONS = [
  'bike', 'auto', 'e_rickshaw', 'car', 'van', 'ambulance',
  'wheelchair_stretcher_van', 'ambulance_bls', 'ambulance_als', 'ambulance_nicu',
  'bus', 'mini_truck',
];
export const AMBULANCE_TYPE_OPTIONS = [
  'BLS', 'ALS', 'PATIENT_TRANSPORT', 'MORTUARY', 'NICU', 'NEONATAL', 'AIR',
  'BIKE_RESPONDER', 'CARDIAC_AMBULANCE',
];
// subcatogary.md §19 additions; the first five display-style tokens predate
// the model's lowercase list and are kept so old clients do not start 400ing.
export const RECORD_TYPE_OPTIONS = [
  'Diagnosis', 'Prescription', 'Lab Report', 'Imaging', 'Discharge Summary',
  'diagnosis', 'prescription', 'lab_report', 'imaging', 'discharge_summary',
  'bill_invoice', 'payment_invoice',
  'vaccination_record', 'consent_form', 'referral_letter', 'operative_note',
  'histopathology_report', 'ecg_echo_report', 'mlc_report', 'medical_certificate',
  'allergy_list', 'growth_chart', 'insurance_claim_docs', 'pre_auth',
  'death_birth_intimation', 'abha_linked_document', 'patient_external_report',
  'wearable_export',
];
export const MEDICINE_RX_SCHEDULES = [
  'otc', 'rx', 'schedule_h', 'h1', 'x', 'schedule_g', 'narcotic_ndps', 'ayurvedic',
  // R0 taxonomy (subcatogary.md §5.2 / T0.1): display spellings accepted as
  // aliases, canonicalized onto the base tokens by canonicalRxSchedule below.
  // Hand-copied from models/Medicine.js RX_SCHEDULE_ALIASES and pinned by
  // validateVocab.spec.js — the model cannot be imported here.
  'OTC', 'H', 'H1', 'X', 'G', 'NDPS', 'NON_SCHEDULED_RX', 'AYUSH',
];
// Case-insensitive on the way in, canonical (lowercase base token) on the way
// out: staff sending 'H1' or 'h1' store the same value the model enum and the
// H1-register checks read.
export const canonicalRxSchedule = (raw) => {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const base = ['otc', 'rx', 'schedule_h', 'h1', 'x', 'schedule_g', 'narcotic_ndps', 'ayurvedic'];
  const aliases = {
    OTC: 'otc', H: 'schedule_h', H1: 'h1', X: 'x',
    G: 'schedule_g', NDPS: 'narcotic_ndps', NON_SCHEDULED_RX: 'rx', AYUSH: 'ayurvedic',
  };
  if (Object.prototype.hasOwnProperty.call(aliases, trimmed)) return aliases[trimmed];
  const lower = trimmed.toLowerCase();
  return base.includes(lower) ? lower : raw;
};
export const rxScheduleSchema = z.string().transform(canonicalRxSchedule).pipe(z.enum(MEDICINE_RX_SCHEDULES));
// subcatogary.md §79: Test.sampleType free-text → enum. The '' tail is the
// FACILITY_OWNERSHIP_OPTIONS precedent: catalog rows predate the enum by
// thousands, and omit-means-unknown must keep validating.
export const TEST_SAMPLE_TYPES = [
  'Blood', 'Serum', 'Plasma', 'Urine', 'Stool', 'Sputum', 'Swab', 'CSF',
  'Tissue', 'Semen', 'Body Fluid', 'Saliva',
  '',
];
// Case-insensitive on the way in, canonical on the way out: staff typing
// 'blood' at collection time keep working, the stored value is always the
// catalog spelling the Test model enum enforces.
export const canonicalSampleType = (raw) => {
  const t = String(raw ?? '').trim();
  return TEST_SAMPLE_TYPES.find((v) => v && v.toLowerCase() === t.toLowerCase()) ?? t;
};
export const sampleTypeSchema = z.string().transform(canonicalSampleType).pipe(z.enum(TEST_SAMPLE_TYPES));
// R0 taxonomy (subcatogary.md A1 #10 / D1 step 6): appointment-mode
// normalization — `home` -> `home_visit`, `voice`/`call` -> `audio`.
// Canonical implementation lives in lib/appointmentModes.js (pure, no model
// side effects); re-exported here so write-path code has one import.
export {
  normalizeMode,
  normalizeModes,
  CANONICAL_APPOINTMENT_MODES,
} from '../lib/appointmentModes.js';
export const MEDICINE_PRODUCT_LINES = [
  'Prescription', 'OTC', 'Generic', 'Branded', 'Ayurvedic', 'Homeopathic',
  'Unani/Siddha', 'Supplements', 'Baby Care', 'Personal Care',
  'Sexual Wellness', "Women's Hygiene", 'Elder Care', 'Diabetic Care',
  'Surgical/Ortho', 'Medical Devices', 'First Aid', 'Hygiene',
  'Health Foods', 'Other',
];
export const FACILITY_OWNERSHIP_OPTIONS = [
  'government', 'private', 'trust_charitable', 'corporate_chain', 'cooperative',
  'ppp', 'military_railway_esi', '',
];
export const FACILITY_SYSTEMS_OF_MEDICINE = [
  'allopathy', 'ayurveda', 'homeopathy', 'unani', 'siddha', 'yoga_naturopathy',
  'sowa_rigpa', 'integrative', '',
];
export const FACILITY_SCHEME_OPTIONS = [
  'pmjay', 'cghs', 'esi', 'echs', 'state_scheme', 'insurance_cashless',
  'tpa_empanelled', 'corporate_tie_up',
];

// â”€â”€â”€ Auth Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: emailSchema,
  password: passwordSchema,
  // AUTH-B-02: public self-registration may NOT pick a tenant/platform role
  // (hospital_admin / clinic_doctor / superadmin). Those are only created by an
  // admin invite flow (e.g. /api/platform/hospitals/register) after an email OTP.
  // `superadmin` was already reachable through this endpoint because the route
  // whitelist accepted it even though the schema rejected it.
  role: z.enum(['patient', 'doctor', 'technician', 'rider', 'assistant', 'lawyer', 'counselor', 'counsellor', 'psychiatrist']).optional().default('patient'),
  phone: phoneSchema,
  gender: z.enum(['Male', 'Female', 'Other', '']).optional().default(''),
  dateOfBirth: z.string().optional(),
  address: z.string().optional().default(''),
  specialization: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  qualifications: z.string().optional().default(''),
  licenseNumber: z.string().optional().default(''),
  consultationFee: z.union([z.string(), z.number()]).optional().default(0),

  // Referral program (optional, for existing users to refer new signups)
  referralCode: z.string().optional(),

  // Rider-specific legal fields (Doc 02)
  govtIdType: z.enum(['Aadhaar', 'PAN', 'Voter ID', 'Passport']).optional(),
  govtIdNumber: z.string().optional(),
  govtIdDocUrl: z.string().optional(),
  drivingLicenseNumber: z.string().optional(),
  drivingLicenseDocUrl: z.string().optional(),
  drivingLicenseExpiry: z.string().optional(),

  // Rider vehicle fields (Doc 02)
  vehicleType: z.enum(VEHICLE_TYPE_OPTIONS).optional(),
  vehicleBrand: z.string().optional(),
  vehicleModel: z.string().optional(),
  rcNumber: z.string().optional(),
  rcDocUrl: z.string().optional(),
  insuranceNumber: z.string().optional(),
  insuranceDocUrl: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehiclePhotos: z.array(z.string()).optional(),
  seatingCapacity: z.union([z.string(), z.number()]).optional(),
  fuelType: z.string().optional(),
  extraFields: z.record(z.string().max(200), boundedScalar).optional(),

  // Assistant-specific fields (Doc 02)
  policeVerificationDocUrl: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  experienceYears: z.union([z.string(), z.number()]).optional(),
  experienceTypes: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  bio: z.string().optional(),
  serviceCategories: z.array(z.string()).optional(),
  hospitalsCovered: z.array(z.string()).optional(),
  shiftTypes: z.array(z.string()).optional(),
  pricePerHour: z.union([z.string(), z.number()]).optional(),
  pricePerFullDay: z.union([z.string(), z.number()]).optional(),
  extraSkills: z.record(z.string().max(200), boundedScalar).optional(),

  // Banking & Availability (Doc 02)
  bankAccountHolder: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankUpi: z.string().optional(),
  operatingArea: z.string().optional(),
  availableDays: z.array(z.string()).optional(),
  availableTimeSlot: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  availableTimeSlots: z.array(z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  })).optional(),
}).passthrough();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: z.enum(USER_ROLE_OPTIONS).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().min(1, 'OTP is required'),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().min(1, 'OTP is required'),
});

// â”€â”€â”€ Doctor Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createDoctorSchema = z.object({
  name: z.string().trim().min(2, 'Doctor name is required'),
  email: emailSchema,
  specialization: z.string().trim().min(2, 'Specialization is required'),
  phone: phoneSchema,
  fees: positiveNumber.optional(),
  experience: z.string().optional(),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
  consultationFee: positiveNumber.optional(),
  available: z.boolean().optional(),
  location: z.string().optional(),
});

// DOC-B-01: `updateDoctorSchema` was `.passthrough()`, and the handler wrote
// `req.body` straight onto the Doctor document. `authorize()` is a role check, so
// any doctor who passed the `isSelf` test could send:
//   { approved: true }            â†’ self-approve out of the admin review queue
//   { hospitalId: <other> }       â†’ re-parent the profile into another tenant
//   { rating: { avg: 5, count: 1 } } â†’ fabricate their own public reputation
//   { user_id: <someone else> }    â†’ hijack the profile->account link
//   { reviewsCount, doctor_type, autoConfirmAppointment, fees, signatureUrl }
// The server-owned fields are declared here so a schema violation is a 400 with a
// clear message, rather than a silent privilege grant. Admin-only changes belong
// on the admin endpoints that already exist and are superadmin-gated.
export const DOCTOR_SERVER_OWNED_FIELDS = Object.freeze([
  // approval + verification
  'approved', 'approvedAt', 'approvedBy', 'status', 'verificationStatus',
  // tenancy + identity linkage
  'hospitalId', 'facilityId', 'user_id', 'userId', 'email',
  // reputation â€” derived from real ratings only
  'rating', 'reviewsCount', 'totalReviews', 'averageRating',
  // commercial terms an admin negotiates, not a doctor self-declares
  'fees', 'consultation_fees', 'consultationFee', 'settlementPayout',
  'commissionPercent',
  // payouts
  'payoutAccount', 'payoutIfsc', 'payoutUpi',
  // trust markers
  'signatureUrl', 'doctor_type', 'verified',
]);

export const updateDoctorSchema = z.object({
  name: z.string().trim().min(2).optional(),
  specialization: z.string().trim().min(2).optional(),
  phone: phoneSchema,
  fees: positiveNumber.optional(),
  consultation_fees: positiveNumber.optional(),
  experience: z.string().optional(),
  qualification: z.string().optional(),
  consultationFee: positiveNumber.optional(),
  available: z.boolean().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  appointmentModes: z.array(z.string()).optional(),
  appointmentFees: z.object({
    chat: positiveNumber.optional(),
    video: positiveNumber.optional(),
    offline: positiveNumber.optional(),
    home_visit: positiveNumber.optional(),
    // SERVICE_MODES includes audio; the model stores a fee per mode and this
    // object used to reject the only audio price a doctor could set.
    audio: positiveNumber.optional(),
  }).optional(),
  chat_fee: positiveNumber.optional(),
  video_fee: positiveNumber.optional(),
  offline_fee: positiveNumber.optional(),
  home_visit_fee: positiveNumber.optional(),
  emergency_fee: positiveNumber.optional(),
  emergencySupport: z.boolean().optional(),
  refundOnMissedOrCancelled: z.boolean().optional(),
})
  // DOC-B-01: still `.passthrough()` so the ~40 legacy flat settings keys above
  // keep working, but every server-owned field is rejected explicitly.
  .passthrough()
  .superRefine((data, ctx) => {
    for (const field of DOCTOR_SERVER_OWNED_FIELDS) {
      if (data[field] !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is server-managed and cannot be changed through this endpoint`,
        });
      }
    }
  });

// â”€â”€â”€ Patient Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createPatientSchema = z.object({
  name: z.string().trim().min(2, 'Patient name is required'),
  age: positiveNumber,
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: phoneSchema,
  disease: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  doctor: z.string().optional(),
});

export const updatePatientSchema = z.object({
  name: z.string().trim().min(2).optional(),
  age: positiveNumber.optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  phone: phoneSchema,
  disease: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['Active', 'Discharged', 'Critical']).optional(),
});

// â”€â”€â”€ Appointment Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * APPT-B-06: a slot is a real calendar value, not a free string.
 *
 * `date` and `time` were `z.string().min(1)`, so `"next tuesday"`, `"2026-13-45"`
 * or `"99:99"` were accepted and stored verbatim. Downstream that meant slot
 * comparisons, the unique slot index, the doctor's `dateDisabledSlots` lookup and
 * the capacity reservation all silently failed to match â€” a booking that the UI
 * showed as "confirmed" while no slot logic could see it.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const slotDate = z.string()
  .trim()
  .regex(ISO_DATE, 'Date must be YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Date is not a real calendar date');

const slotTime = z.string()
  .trim()
  .regex(HHMM, 'Time must be HH:MM in 24-hour format');

export const createAppointmentSchema = z.object({
  patient: z.string().min(1, 'Patient is required'),
  doctor: z.string().min(1, 'Doctor is required'),
  doctorId: z.string().optional(),
  department: z.string().optional(),
  // APPT-B-06: real calendar values.
  date: slotDate,
  time: slotTime,
  type: z.string().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  priority: z.string().optional(),
  // A3-part-2: provider-service attribution. Optional (non-strict schema
  // strips nothing else); validated against the catalog in the route.
  serviceId: objectIdSchema.optional(),
});

// â”€â”€â”€ Walk-in Booking Schema (doctor/clinic se: patient + appointment ek saath) â”€â”€
export const walkInSchema = z.object({
  patient: z.object({
    name: z.string().trim().min(2, 'Patient name is required'),
    age: positiveNumber.optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    bloodGroup: z.string().optional(),
    address: z.string().optional(),
  }).refine(d => d.phone || d.email, { message: 'Phone or Email is required' }),
  doctorId: z.string().optional(),
  doctor: z.string().optional(),
  department: z.string().optional(),
  // APPT-B-06: the same calendar rules as the self-booking path â€” a walk-in slot
  // that no slot logic can match is worse than a rejected one.
  date: slotDate,
  time: slotTime,
  type: z.string().optional(),
  symptoms: z.string().optional(),
  priority: z.string().optional(),
  // REMOVED (A5): `fees` was client-supplied and stored verbatim — a walk-in
  // could be booked at any price the caller named. The route now resolves the
  // doctor's listed fee through pricingService (5.md §15, server-side price);
  // a body still carrying `fees` has the key stripped here, not rejected, so
  // older clients keep working at the correct price.
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  // `Rescheduled` is legacy-only: it is NOT in APPOINTMENT_STATUSES, so the
  // transition guard answers a structured 409 ILLEGAL_STATE_TRANSITION instead
  // of the model enum failing the write with a cast error (5.md §2.1: a
  // reschedule is a move that produces a new CONFIRMED booking, not a state).
  status: z.enum([...APPOINTMENT_STATUSES, 'Rescheduled']).optional(),
  // APPT-B-06 (partial): reschedule via PUT /:id used bare strings, so 2026-13-45
  // / 99:99 bypassed the calendar check that both booking paths enforce. Same
  // slotDate/slotTime rules here — a rescheduled slot must be matchable too.
  date: slotDate.optional(),
  time: slotTime.optional(),
  notes: z.string().optional(),
  // A5 (5.md §2.4): why the booking was cancelled, recorded on the row
  // alongside cancelledBy/tier/fee. Previously this key was stripped silently,
  // so every cancel lost its reason.
  cancellationReason: z.string().trim().max(500).optional(),
});

// â”€â”€â”€ Billing Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createBillSchema = z.object({
  patient: z.string().min(1, 'Patient is required'),
  patientId: z.string().optional(),
  service: z.string().min(1, 'Service is required'),
  amount: positiveNumber,
  doctor: z.string().optional(),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  source: z.string().optional(),
  date: z.string().optional(),
  paid: nonNegativeNumber.optional().default(0),
  status: z.enum(['Pending', 'Paid', 'Partial', 'Overdue']).optional().default('Pending'),
  dueDate: z.string().optional(),
  services: z.array(z.object({
    name: z.string().optional(),
    price: z.number().optional(),
    category: z.string().optional(),
  })).optional(),
});

// â”€â”€â”€ Hospital Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const registerHospitalSchema = z.object({
  name: z.string().trim().min(2, 'Hospital name is required'),
  email: emailSchema,
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  description: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  establishedYear: z.number().optional(),
  hospitalType: z.string().optional(),
  bedAvailability: z.number().optional(),
  emergency24x7: z.boolean().optional(),
  ambulanceService: z.boolean().optional(),
  accreditations: z.array(z.string()).optional(),
  workingHours: z.object({
    weekdays: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  }).optional(),
  insuranceAccepted: z.array(z.object({
    provider: z.string(),
    planType: z.string().optional(),
  }).or(z.string())).optional(),
  logo: z.string().optional(),
  image: z.string().optional(),
  paymentModes: z.array(z.string()).optional(),
});

// â”€â”€â”€ Test Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createTestSchema = z.object({
  name: z.string().trim().min(2, 'Test name is required'),
  category: z.string().min(1, 'Category is required'),
  department: z.string().optional(),
  price: positiveNumber,
  mrp: positiveNumber.optional(),
  description: z.string().optional(),
  preparation: z.string().optional(),
  // subcatogary.md §79: the catalog create used to STRIP sampleType (unknown
  // key on a non-strict schema); it is a first-class field now.
  sampleType: sampleTypeSchema.optional(),
  reportTime: z.string().optional(),
  prescriptionReq: z.boolean().optional(),
  homeCollection: z.boolean().optional(),
  homeCollectionFee: nonNegativeNumber.optional(),
  popular: z.boolean().optional(),
  nablAccredited: z.boolean().optional(),
});

// ── Women's health (6.md §2.9, opt-in) ───────────────────────────────────────
// validate.js cannot import the models (a request schema must not register a
// model as a side effect), so WOMENS_HEALTH_LOG_KINDS is hand-copied from
// models/WomensHealthLog.js and pinned by validateVocab.spec.js — the same
// arrangement as RECORD_TYPE_OPTIONS.
export const WOMENS_HEALTH_LOG_KINDS = ['period', 'symptom', 'pregnancy', 'postpartum', 'visit'];

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');
const womensNote = z.string().trim().max(500).optional();

const womensHealthDetails = {
  period: z.object({
    flow: z.enum(['light', 'medium', 'heavy']).optional(),
    symptoms: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    pain: z.number().int().min(0).max(10).optional(),
    notes: womensNote,
  }).strict(),
  symptom: z.object({
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
    severity: z.number().int().min(1).max(5).optional(),
    notes: womensNote,
  }).strict(),
  pregnancy: z.object({
    week: z.number().int().min(1).max(42).optional(),
    weightKg: z.number().positive().max(300).optional(),
    systolic: z.number().int().min(70).max(250).optional(),
    diastolic: z.number().int().min(40).max(150).optional(),
    notes: womensNote,
  }).strict(),
  postpartum: z.object({
    day: z.number().int().min(0).max(365).optional(),
    mood: z.number().int().min(1).max(5).optional(),
    feeding: z.enum(['exclusive', 'mixed', 'formula']).optional(),
    notes: womensNote,
  }).strict(),
  visit: z.object({
    provider: z.string().trim().max(120).optional(),
    purpose: z.string().trim().max(120).optional(),
    nextDue: isoDay.optional(),
    notes: womensNote,
  }).strict(),
};

export const womensHealthLogSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('period'), date: isoDay, details: womensHealthDetails.period.default({}) }),
  z.object({ kind: z.literal('symptom'), date: isoDay, details: womensHealthDetails.symptom.default({}) }),
  z.object({ kind: z.literal('pregnancy'), date: isoDay, details: womensHealthDetails.pregnancy.default({}) }),
  z.object({ kind: z.literal('postpartum'), date: isoDay, details: womensHealthDetails.postpartum.default({}) }),
  z.object({ kind: z.literal('visit'), date: isoDay, details: womensHealthDetails.visit.default({}) }),
]);

export const womensHealthProfileSchema = z.object({
  cycleLengthDays: z.number().int().min(20).max(45),
}).strict();

// ── Second opinions (7.md:39 doctor inbox) ───────────────────────────────────
// personId stays a loose string: 'self'/malformed values are the
// profileAccess helper's 404 decision, not the schema's 400.
// SECOND_OPINION_STATUSES is hand-copied from models/SecondOpinionRequest.js
// and pinned by validateVocab.spec.js (the model cannot be imported here,
// and the route cannot import it from the model — specs mock the model with
// a default-only factory).
export const SECOND_OPINION_STATUSES = ['REQUESTED', 'ANSWERED', 'DECLINED', 'CANCELLED'];
export const secondOpinionCreateSchema = z.object({
  doctorId: objectIdSchema,
  personId: z.string().optional(),
  recordIds: z.array(objectIdSchema).min(1, 'Share at least one record').max(20),
  question: z.string().trim().min(10, 'Question must be at least 10 characters').max(1000),
}).strict();

export const secondOpinionAnswerSchema = z.object({
  answer: z.string().trim().min(10, 'Answer must be at least 10 characters').max(2000),
}).strict();

// ── Dental (7.md §3.1) ───────────────────────────────────────────────────────
// Hand-copied from models/Dental{Chart,TreatmentPlan,LabWork}.js and
// models/SterilisationLog.js, pinned by validateVocab.spec.js — models cannot
// be imported here. FDI numbering: permanent 11-18/21-28/31-38/41-48,
// primary 51-55/61-65/71-75/81-85.
export const DENTAL_TOOTH_CONDITIONS = [
  'healthy', 'caries', 'filling', 'crown', 'implant', 'missing',
  'rct', 'fracture', 'extraction_planned', 'other',
];
export const DENTAL_PLAN_STATUSES = ['draft', 'active', 'completed', 'cancelled'];
export const DENTAL_STAGE_STATUSES = ['planned', 'in_progress', 'done'];
export const DENTAL_LAB_WORK_TYPES = ['crown', 'aligner', 'denture', 'bridge', 'implant', 'other'];
export const DENTAL_LAB_STATUSES = ['sent', 'received', 'fitted'];
export const STERILISATION_METHODS = ['autoclave', 'dry_heat', 'chemical'];
export const STERILISATION_INDICATORS = ['pass', 'fail'];

const fdiTooth = z.string().regex(/^([1-4][1-8]|[5-8][1-5])$/, 'tooth must be FDI notation');

export const createDentalChartSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  teeth: z.array(z.object({
    fdi: fdiTooth,
    condition: z.enum(DENTAL_TOOTH_CONDITIONS).optional(),
    notes: z.string().trim().max(300).optional(),
  }).strict()).min(1).max(40),
  images: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  photoConsent: z.object({
    granted: z.boolean(),
    grantedAt: z.string().optional(),
  }).strict().optional(),
}).strict();

export const createDentalPlanSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  title: z.string().trim().max(160).optional(),
  stages: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    teeth: z.array(fdiTooth).max(8).optional(),
    costAmount: z.number().min(0).max(100000000).optional(),
    status: z.enum(DENTAL_STAGE_STATUSES).optional(),
  }).strict()).min(1).max(20),
  status: z.enum(DENTAL_PLAN_STATUSES).optional(),
}).strict();

export const dentalPlanStatusSchema = z.object({
  status: z.enum(DENTAL_PLAN_STATUSES),
}).strict();

export const createDentalLabWorkSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  workType: z.enum(DENTAL_LAB_WORK_TYPES),
  teeth: z.array(fdiTooth).max(16).optional(),
  labName: z.string().trim().max(160).optional(),
  costAmount: z.number().min(0).max(100000000).optional(),
}).strict();

export const dentalLabStatusSchema = z.object({
  status: z.enum(['received', 'fitted']),
}).strict();

export const createSterilisationSchema = z.object({
  providerId: objectIdSchema,
  method: z.enum(STERILISATION_METHODS),
  temperatureC: z.number().min(0).max(300).optional(),
  durationMin: z.number().int().min(1).max(600).optional(),
  indicator: z.enum(STERILISATION_INDICATORS),
  machineId: z.string().trim().max(80).optional(),
  loadContents: z.string().trim().max(500).optional(),
  operatedBy: z.string().trim().max(120).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  notes: z.string().trim().max(500).optional(),
}).strict();

// ── Eye (7.md §3.2) ─────────────────────────────────────────────────────────
// Hand-copied from models/Eye{Exam,SurgeryLead}.js and
// models/OpticalJobCard.js, pinned by validateVocab.spec.js.
export const OPTICAL_JOB_STATUSES = ['booked', 'in_lab', 'ready', 'delivered', 'cancelled'];
export const EYE_SURGERY_PROCEDURES = ['cataract', 'lasik', 'other'];
export const EYE_SIDES = ['od', 'os', 'both'];
export const EYE_SURGERY_STAGES = ['lead', 'pre_op', 'scheduled', 'completed', 'follow_up', 'cancelled'];

const eyeRefraction = z.object({
  sph: z.number().min(-20).max(20).optional(),
  cyl: z.number().min(-10).max(10).optional(),
  axis: z.number().min(0).max(180).optional(),
  va: z.string().trim().max(12).optional(),
}).strict();

export const createEyeExamSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  od: eyeRefraction.optional(),
  os: eyeRefraction.optional(),
  iopOd: z.number().min(0).max(80).optional(),
  iopOs: z.number().min(0).max(80).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  prescriptionIssued: z.boolean().optional(),
  prescriptionType: z.enum(['glasses', 'contacts', 'none']).optional(),
  nextReviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
}).strict();

const opticalLens = z.object({
  sph: z.number().min(-20).max(20).optional(),
  cyl: z.number().min(-10).max(10).optional(),
  axis: z.number().min(0).max(180).optional(),
}).strict();

export const createOpticalJobSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  frames: z.string().trim().max(200).optional(),
  lensOd: opticalLens.optional(),
  lensOs: opticalLens.optional(),
  lensMaterial: z.string().trim().max(80).optional(),
  coating: z.string().trim().max(80).optional(),
  priceAmount: z.number().min(0).max(100000000).optional(),
}).strict();

export const opticalJobStatusSchema = z.object({
  status: z.enum(['in_lab', 'ready', 'delivered', 'cancelled']),
}).strict();

export const createSurgeryLeadSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  procedure: z.enum(EYE_SURGERY_PROCEDURES),
  eye: z.enum(EYE_SIDES),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const surgeryStageSchema = z.object({
  stage: z.enum(EYE_SURGERY_STAGES),
}).strict();

// ── Dialysis (7.md §3.16) ───────────────────────────────────────────────────
// Hand-copied from models/DialysisSession.js, pinned by validateVocab.spec.js.
export const DIALYSIS_ISOLATION = ['none', 'hbv', 'hcv', 'hbv_hcv', 'other'];

const dialysisBp = {
  preSystolic: z.number().int().min(50).max(300).optional(),
  preDiastolic: z.number().int().min(30).max(200).optional(),
  postSystolic: z.number().int().min(50).max(300).optional(),
  postDiastolic: z.number().int().min(30).max(200).optional(),
};

export const createDialysisSessionSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  machineId: z.string().trim().max(80).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  preWeightKg: z.number().min(20).max(300),
  postWeightKg: z.number().min(20).max(300),
  ...dialysisBp,
  ufLitres: z.number().min(0).max(10).optional(),
  durationMin: z.number().int().min(30).max(600).optional(),
  isolation: z.enum(DIALYSIS_ISOLATION).optional(),
  complications: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const createDialysisWaterQualitySchema = z.object({
  providerId: objectIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  freeChlorinePpm: z.number().min(0).max(10).optional(),
  tdsPpm: z.number().min(0).max(2000).optional(),
  bacterialCountCfuMl: z.number().int().min(0).max(1000000).optional(),
  pass: z.boolean(),
  notes: z.string().trim().max(500).optional(),
}).strict();

// ── Fertility (7.md §3.17) ──────────────────────────────────────────────────
// Hand-copied from models/FertilityCycle.js, pinned by validateVocab.spec.js.
export const FERTILITY_CYCLE_TYPES = ['ivf', 'icsi', 'iui', 'frozen_embryo', 'other'];
export const FERTILITY_CYCLE_STATUSES = ['active', 'completed', 'cancelled'];
export const FERTILITY_OUTCOMES = ['positive', 'negative', 'biochemical', 'ectopic', 'ongoing'];

export const createFertilityCycleSchema = z.object({
  patientId: objectIdSchema,
  providerId: objectIdSchema,
  cycleNo: z.number().int().min(1).max(50),
  cycleType: z.enum(FERTILITY_CYCLE_TYPES),
  procedures: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD').optional(),
    status: z.enum(['planned', 'done', 'skipped']).optional(),
  }).strict()).max(30).optional(),
  artConsent: z.object({
    granted: z.boolean(),
    grantedAt: z.string().optional(),
  }).strict().optional(),
  artDocuments: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const fertilityCycleStatusSchema = z.object({
  status: z.enum(FERTILITY_CYCLE_STATUSES),
}).strict();

export const fertilityOutcomeSchema = z.object({
  result: z.enum(FERTILITY_OUTCOMES),
}).strict();

// ── CME (7.md:39 doctor tracker) ────────────────────────────────────────────
export const createCMECreditSchema = z.object({
  doctorId: objectIdSchema,
  title: z.string().trim().min(2).max(200),
  organizer: z.string().trim().max(200).optional(),
  credits: z.number().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  certificateUrl: z.string().trim().max(500).optional(),
}).strict();

// ── Quality checklists (7.md §3.41) ─────────────────────────────────────────
// Hand-copied from models/QualityChecklist.js, pinned by validateVocab.spec.js.
export const QUALITY_CHECKLIST_TYPES = ['nabh', 'kayakalp', 'fire_safety', 'bmw', 'infection_control', 'other'];
export const QUALITY_ITEM_STATUSES = ['compliant', 'partial', 'non_compliant', 'na'];

export const createQualityChecklistSchema = z.object({
  providerId: objectIdSchema,
  checklistType: z.enum(QUALITY_CHECKLIST_TYPES),
  title: z.string().trim().max(200).optional(),
  items: z.array(z.object({
    code: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(200),
    status: z.enum(QUALITY_ITEM_STATUSES),
    evidence: z.string().trim().max(500).optional(),
    remarks: z.string().trim().max(500).optional(),
  }).strict()).min(1).max(200),
}).strict();

// ── Fitness + nutrition (6.md §2.10 opt-in, §2.11) ───────────────────────────
// Kinds are globally unique so the domain DERIVES from the kind —
// WELLNESS_KIND_DOMAIN is the single map, hand-copied kinds pinned by
// validateVocab.spec.js like every other model/vocab pair in this file.
export const WELLNESS_KINDS = [
  'steps', 'workout', 'class_attendance',
  'meal', 'water', 'grocery',
];
export const WELLNESS_KIND_DOMAIN = {
  steps: 'fitness', workout: 'fitness', class_attendance: 'fitness',
  meal: 'nutrition', water: 'nutrition', grocery: 'nutrition',
};
export const WELLNESS_FITNESS_KINDS = ['steps', 'workout', 'class_attendance'];

const wellnessNote = z.string().trim().max(500).optional();

export const wellnessLogSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('steps'), date: isoDay,
    details: z.object({
      count: z.number().int().min(0).max(100000),
      source: z.enum(['manual', 'wearable']).optional(),
      notes: wellnessNote,
    }).strict().default({}),
  }),
  z.object({
    kind: z.literal('workout'), date: isoDay,
    details: z.object({
      activity: z.string().trim().min(1).max(60),
      minutes: z.number().int().min(1).max(600),
      calories: z.number().int().min(0).max(5000).optional(),
      notes: wellnessNote,
    }).strict().default({}),
  }),
  z.object({
    kind: z.literal('class_attendance'), date: isoDay,
    details: z.object({
      className: z.string().trim().min(1).max(80),
      minutes: z.number().int().min(1).max(300).optional(),
      notes: wellnessNote,
    }).strict().default({}),
  }),
  z.object({
    kind: z.literal('meal'), date: isoDay,
    details: z.object({
      meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
      items: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
      calories: z.number().int().min(0).max(5000).optional(),
      notes: wellnessNote,
    }).strict().default({}),
  }),
  z.object({
    kind: z.literal('water'), date: isoDay,
    details: z.object({ ml: z.number().int().min(50).max(5000), notes: wellnessNote }).strict().default({}),
  }),
  z.object({
    kind: z.literal('grocery'), date: isoDay,
    details: z.object({
      items: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
      notes: wellnessNote,
    }).strict().default({}),
  }),
]);

// â”€â”€â”€ Medicine Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createMedicineSchema = z.object({
  name: z.string().trim().min(2, 'Medicine name is required'),
  category: z.string().min(1, 'Category is required'),
  price: positiveNumber,
  stock: z.number().int().nonnegative('Stock must be non-negative'),
  manufacturer: z.string().optional(),
  expiryDate: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  description: z.string().optional(),
  // subcatogary.md §5.2 / D1.5 / D3 - the dimensions that replace guessing
  // "is this Rx?" from a free-text category. Enum arrays come from the vocab
  // block above and are pinned to models/Medicine.js by validateVocab.spec.js.
  therapeuticClass: z.string().trim().max(80).optional(),
  rxSchedule: rxScheduleSchema.optional(),
  productLine: z.enum(MEDICINE_PRODUCT_LINES).optional(),
  composition: z.string().trim().max(400).optional(),
  strength: z.string().trim().max(80).optional(),
  packSize: z.string().trim().max(80).optional(),
  mrp: nonNegativeNumber.optional(),
  gstRate: z.number().min(0).max(28).optional(),
  hsn: z.string().trim().max(12).optional(),
  habitForming: z.boolean().optional(),
  atcCode: z.string().trim().max(12).optional(),
});

// â”€â”€â”€ Review Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createReviewSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  // The model requires it and the handler stores it verbatim — the schema used
  // to strip it (zod's default), so every POST /api/reviews died on the model's
  // required check. The clients already send it.
  doctorName: z.string().trim().min(1, 'Doctor name is required').max(160),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(2, 'Comment is required'),
  date: z.string().trim().max(20).optional(),
});

// â”€â”€â”€ Department Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required'),
  description: z.string().optional(),
  head: z.string().optional(),
  fees_structure: positiveNumber.optional(),
  active: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().optional(),
  head: z.string().optional(),
  fees_structure: positiveNumber.optional(),
  active: z.boolean().optional(),
});

// â”€â”€â”€ Emergency Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createEmergencySchema = z.object({
  patientName: z.string().trim().min(2, 'Patient name is required'),
  condition: z.string().min(2, 'Condition is required'),
  severity: z.enum(['Critical', 'Serious', 'Stable']),
  phone: phoneSchema,
  address: z.string().optional(),
});

// â”€â”€â”€ Bed Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createBedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required'),
  ward: z.string().min(1, 'Ward is required'),
  bedType: z.string().min(1, 'Bed type is required'),
  dailyRate: positiveNumber,
  floor: z.string().optional(),
  isAC: z.boolean().optional(),
  hospitalId: z.string().optional(),
});

export const updateBedSchema = z.object({
  bedNumber: z.string().optional(),
  ward: z.string().optional(),
  bedType: z.string().optional(),
  dailyRate: positiveNumber.optional(),
  floor: z.string().optional(),
  isAC: z.boolean().optional(),
  status: z.string().optional(),
});

// â”€â”€â”€ Record Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createRecordSchema = z.object({
  patient: z.string().min(1, 'Patient is required'),
  patientId: z.string().optional(),
  doctor: z.string().optional(),
  doctorId: z.string().optional(),
  date: z.string().optional(),
  diagnosis: z.string().optional().default(''),
  prescription: z.string().optional().default(''),
  type: z.enum(RECORD_TYPE_OPTIONS).optional().default('Diagnosis'),
  notes: z.string().optional().default(''),
  vitals: z.object({
    bp: z.string().optional(),
    temp: z.number().optional(),
    weight: z.number().optional(),
    spo2: z.number().optional(),
    pulse: z.number().optional(),
    respiration: z.number().optional(),
    height: z.number().optional(),
  }).optional(),
  icdCodes: z.array(z.object({
    code: z.string(),
    description: z.string().optional(),
    diagnosis: z.string().optional().default(''),
  })).optional(),
  examination: z.object({
    general: z.string().optional(),
    systemic: z.string().optional(),
    local: z.string().optional(),
    cardiovascular: z.string().optional(),
    respiratory: z.string().optional(),
    abdominal: z.string().optional(),
    neurological: z.string().optional(),
    musculoskeletal: z.string().optional(),
  }).optional(),
  data: z.object({}).passthrough().optional(),
  attachments: z.array(z.string()).optional(),
});

// â”€â”€â”€ Support Ticket Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Lab Order Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createLabOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  tests: z.array(z.object({
    testName: z.string().min(1),
    category: z.string().optional(),
    priority: z.string().optional(),
  })).min(1, 'At least one test required'),
  clinicalNotes: z.string().optional(),
  priority: z.string().optional(),
});

// â”€â”€â”€ Medicine Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const updateMedicineSchema = z.object({
  name: z.string().optional(),
  genericName: z.string().optional(),
  category: z.string().optional(),
  price: positiveNumber.optional(),
  currentStock: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  manufacturer: z.string().optional(),
  expiryDate: z.string().optional(),
  requiresPrescription: z.boolean().optional(),
  description: z.string().optional(),
  interactions: z.array(z.string()).optional(),
});

// â”€â”€â”€ Housekeeping Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createHousekeepingSchema = z.object({
  room: z.string().min(1, 'Room is required'),
  bedNumber: z.string().optional(),
  ward: z.string().optional(),
  type: z.string().min(1, 'Type is required'),
  priority: z.string().optional(),
  checklist: checklistMapShape.optional(),
});

export const createSupportTicketSchema = z.object({
  subject: z.string().trim().min(2, 'Subject is required'),
  message: z.string().trim().min(2, 'Message is required'),
  category: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
});

// â”€â”€â”€ Leave Request Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createLeaveRequestSchema = z.object({
  leaveType: z.enum(['Sick Leave', 'Casual Leave', 'Earned Leave', 'Personal Leave', 'Maternity/Paternity Leave', 'Other']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().trim().min(2, 'Reason is required'),
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  adminNotes: z.string().optional().default(''),
});

// â”€â”€â”€ Schedule Change Request Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createScheduleChangeRequestSchema = z.object({
  requestedChanges: z.object({
    slotDuration: z.number().optional(),
    workingHours: z.object({ start: z.string(), end: z.string() }).optional(),
    breakTime: z.object({ start: z.string(), end: z.string() }).optional(),
    bookingWindow: z.object({ unit: z.enum(['hours', 'days', 'weeks', 'months']), value: z.number().min(0) }).optional(),
    weekly_schedule: z.record(z.string().max(20), z.array(z.string().trim().max(20)).max(100)).optional(),
    leaves: z.array(z.union([z.string().trim().max(30), boundedShallow])).max(200).optional(),
    dateDisabledSlots: z.record(z.string().max(30), z.array(z.string().trim().max(20)).max(100)).optional(),
    bufferPerHour: z.number().optional(),
  }).passthrough(),
});

export const updateScheduleChangeStatusSchema = z.object({
  appliedFields: z.array(z.string()).optional().default([]),
  adminNote: z.string().optional().default(''),
  rejectionNote: z.string().optional().default(''),
  decision: z.enum(['approve', 'reject']),
});

// â”€â”€â”€ Payment Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createPaymentSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  patient_name: z.string().trim().max(120, 'Patient name cannot exceed 120 characters').optional(),
  amount: positiveNumber,
  method: z.enum(['card', 'upi', 'netbanking', 'cash', 'wallet']).optional(),
  invoice_id: z.string().trim().max(100, 'Invoice ID cannot exceed 100 characters').optional(),
  description: z.string().trim().max(250, 'Description cannot exceed 250 characters').optional(),
  appointment_id: z.string().optional(),
  bill_id: z.string().optional(),
  provider: z.string().trim().max(120, 'Provider cannot exceed 120 characters').optional(),
  serviceType: z.string().trim().max(50, 'Service type cannot exceed 50 characters').optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  method: z.string().optional(),
  transaction_id: z.string().optional(),
  description: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  // A5: optional. When omitted the route refunds the full remaining balance —
  // the common case for an admin clicking "refund" — and an explicit amount
  // keeps its old meaning (positive, later capped against the capture and the
  // already-refunded total).
  refund_amount: z.number().positive('Refund amount must be greater than 0').optional(),
  reason: z.string().trim().max(500).optional(),
  reasonCode: z.string().trim().max(60).optional(),
});

// â”€â”€â”€ Blood Bank Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createBloodUnitSchema = z.object({
  bloodGroup: z.string().min(1, 'Blood group is required'),
  bloodType: z.string().optional(),
  volume: z.number().positive().optional(),
  donorName: z.string().optional(),
  donationDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.string().optional(),
  hospitalId: z.string().optional(),
});

export const createBloodRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  patientName: z.string().optional(),
  bloodGroup: z.string().min(1, 'Blood group is required'),
  unitsRequired: z.number().positive().optional(),
  reason: z.string().optional(),
  priority: z.string().optional(),
});

// â”€â”€â”€ Diet Order Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createDietOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  admissionId: z.string().optional(),
  ward: z.string().optional(),
  bedNumber: z.string().optional(),
  dietType: z.string().min(1, 'Diet type is required'),
  mealTimes: z.array(z.string()).optional(),
  instructions: z.string().optional(),
  allergies: z.string().optional(),
});

// â”€â”€â”€ Insurance Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createInsuranceSchema = z.object({
  // INS-M-02: patientId is optional here because the handler decides it (a
  // patient is always forced to their OWN id - LAW-006; staff must supply one
  // and get a 400 from the handler if they don't). Requiring it in zod made
  // every patient-side create fail validation before the owner override ran.
  patientId: z.string().min(1, 'Patient is required').optional(),
  patientName: z.string().optional(),
  insuranceProvider: z.string().min(1, 'Insurance provider is required'),
  policyNumber: z.string().min(1, 'Policy number is required'),
  insuranceId: z.string().optional(),
  tpaName: z.string().optional(),
  tpaContact: z.string().optional(),
  // INS-M-02: the coverage type drives the workflow branch (cashless needs
  // empanelment + pre-auth; reimbursement does not), so it is validated as the
  // closed enum it already was in the schema, not free text.
  coverageType: z.enum(['Cashless', 'Reimbursement']).optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  estimatedCost: z.number().optional(),
  admissionId: z.string().optional(),
});

// â”€â”€â”€ Inventory Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createInventoryItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  itemCode: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unitPrice: positiveNumber.optional(),
  currentStock: z.number().nonnegative().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  hospitalId: z.string().optional(),
});

export const updateInventoryItemSchema = z.object({
  itemName: z.string().optional(),
  itemCode: z.string().optional(),
  category: z.string().optional(),
  unitPrice: positiveNumber.optional(),
  currentStock: z.number().nonnegative().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  unit: z.string().optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  hospitalId: z.string().optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierName: z.string().optional(),
  items: z.array(z.object({
    inventoryItemId: z.string().optional(),
    itemName: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    discount: z.number().optional(),
  })).min(1, 'At least one item required'),
  expectedDelivery: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().optional(),
});

// â”€â”€â”€ IPD / Admission Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createAdmissionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  bedId: z.string().optional(),
  primaryDiagnosis: z.string().optional(),
  source: z.string().optional(),
  attendantName: z.string().optional(),
  attendantPhone: z.string().optional(),
  estimatedStay: z.number().optional(),
  admissionNotes: z.string().optional(),
  priority: z.string().optional(),
});

// â”€â”€â”€ OT Surgery Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createSurgerySchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  surgeryName: z.string().min(1, 'Surgery name is required'),
  surgeryType: z.string().optional(),
  anaesthesiaType: z.string().optional(),
  assistants: z.array(z.string()).optional(),
  otNumber: z.string().optional(),
  scheduledDate: z.string().optional(),
});

// â”€â”€â”€ Token Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createTokenSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().min(1, 'Patient name is required'),
  uhid: z.string().optional(),
  doctorId: z.string().optional(),
  doctorName: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  appointmentId: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
});

// â”€â”€â”€ Triage Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// P1 #6: shared vitals shape for triage POST/PUT. The form's number inputs
// submit STRING values (TriagePage `Input type=number` → e.target.value), so
// each field is number|string and mongoose does the numeric cast — the same
// union pattern the pharmacy price fields use, instead of `z.any()` (which
// accepted objects/arrays too deep or large to be a vital) or plain
// z.number() (which 400'd every form submission).
export const triageVitalsSchema = z.object({
  bpSystolic: z.union([z.number(), z.string().max(10)]).optional(),
  bpDiastolic: z.union([z.number(), z.string().max(10)]).optional(),
  heartRate: z.union([z.number(), z.string().max(10)]).optional(),
  respRate: z.union([z.number(), z.string().max(10)]).optional(),
  temperature: z.union([z.number(), z.string().max(10)]).optional(),
  spO2: z.union([z.number(), z.string().max(10)]).optional(),
  bloodSugar: z.union([z.number(), z.string().max(10)]).optional(),
  painScale: z.union([z.number().min(0).max(10), z.string().max(4)]).optional(),
});

export const createTriageSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  // TriagePage keeps age as a string in state (`age: ''`, Input onChange →
  // e.target.value), and z.number() rejected EVERY create. Union lets the
  // string through; mongoose casts (and '' → null), non-numeric strings 400.
  age: z.union([z.number().int().nonnegative().max(150), z.string().max(10)]).optional(),
  gender: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
  patientId: z.string().max(40).optional(),
  arrivalMode: z.enum(['Walk-in', 'Ambulance', 'Police', 'Referral']).optional(),
  broughtBy: z.string().max(200).optional(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required').max(1000),
  triageLevel: z.enum(['P1-Immediate', 'P2-Urgent', 'P3-Less Urgent', 'P4-Non Urgent', 'P5-Deceased']),
  triageNotes: z.string().max(4000).optional(),
  vitals: triageVitalsSchema.optional(),
  isMLCO: z.boolean().optional(),
});

// â”€â”€â”€ Radiology Order Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createRadiologyOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  modality: z.string().min(1, 'Modality is required'),
  bodyPart: z.string().min(1, 'Body part is required'),
  clinicalHistory: z.string().optional(),
  priority: z.string().optional(),
});

// â”€â”€â”€ Physiotherapy Referral Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createPhysioReferralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

// â”€â”€â”€ Mental Health Referral Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createMentalHealthReferralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  referralSource: z.string().optional(),
  referrerName: z.string().optional(),
});

// â”€â”€â”€ Facility Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const registerFacilitySchema = z.object({
  name: z.string().trim().min(2, 'Facility name is required'),
  type: z.enum(['hospital', 'clinic', 'diagnostic', 'pharmacy', 'pathology', 'imaging']),
  email: emailSchema,
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  description: z.string().optional(),
  subType: z.string().trim().max(80).optional(),
  ownership: z.enum(FACILITY_OWNERSHIP_OPTIONS).optional(),
  systemOfMedicine: z.enum(FACILITY_SYSTEMS_OF_MEDICINE).optional(),
  schemesAccepted: z.array(z.enum(FACILITY_SCHEME_OPTIONS)).max(30).optional(),
  establishedYear: z.union([z.string(), z.number()]).optional(),
  logo: z.string().optional(),
  image: z.string().optional(),
  nablNumber: z.string().optional(),
  aerbNumber: z.string().optional(),
  workingHours: z.union([z.string().trim().max(500), z.record(z.string().max(100), z.string().trim().max(100))]).optional(),
  pathologistName: z.string().optional(),
  pathologistQualification: z.string().optional(),
  radiologistName: z.string().optional(),
  radiologistQualification: z.string().optional(),
  cardiologistName: z.string().optional(),
  cardiologistQualification: z.string().optional(),
  technicianName: z.string().optional(),
  technicianRole: z.string().optional(),
  technicianQualification: z.string().optional(),
  technicianExperience: z.string().optional(),
  timing: z.union([z.string().trim().max(500), z.record(z.string().max(100), z.string().trim().max(100))]).optional(),
  amenities: z.union([z.string().trim().max(2000), z.array(z.string().trim().max(200)).max(100)]).optional(),
  socialLinks: z.record(z.string().max(100), z.string().trim().max(500)).optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPhone: z.string().optional(),
  details: boundedShallow.optional(),
});

export const updateFacilitySchema = z.object({
  name: z.string().optional(),
  // catogary.md L29-L42 / L182 + subcatogary.md §1.1-1.2 - the catalogue
  // dimensions. Without these the API parse at validate() line 7 silently
  // dropped everything models/Facility.js now stores.
  subType: z.string().trim().max(80).optional(),
  ownership: z.enum(FACILITY_OWNERSHIP_OPTIONS).optional(),
  systemOfMedicine: z.enum(FACILITY_SYSTEMS_OF_MEDICINE).optional(),
  schemesAccepted: z.array(z.enum(FACILITY_SCHEME_OPTIONS)).max(30).optional(),
  email: emailSchema.optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  establishedYear: z.number().optional(),
  accreditations: z.array(z.string()).optional(),
  licenseNumber: z.string().optional(),
  workingHours: z.string().optional(),
  nablNumber: z.string().optional(),
  aerbNumber: z.string().optional(),
  pathologistName: z.string().optional(),
  pathologistQualification: z.string().optional(),
  radiologistName: z.string().optional(),
  radiologistQualification: z.string().optional(),
  cardiologistName: z.string().optional(),
  cardiologistQualification: z.string().optional(),
  technicianName: z.string().optional(),
  technicianRole: z.string().optional(),
  technicianQualification: z.string().optional(),
  technicianExperience: z.string().optional(),
  timing: z.union([z.string().trim().max(500), z.record(z.string().max(100), z.string().trim().max(100))]).optional(),
  amenities: z.union([z.string().trim().max(2000), z.array(z.string().trim().max(200)).max(100)]).optional(),
  socialLinks: z.record(z.string().max(100), z.string().trim().max(500)).optional(),
  details: boundedShallow.optional(),
});

// â”€â”€â”€ Announcement Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createAnnouncementSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  message: z.string().min(2, 'Message is required'),
  priority: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
});

// â”€â”€â”€ Category Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const categoryExternalCodesSchema = z.object({
  snomed: z.string().max(64).optional(),
  atc: z.string().max(64).optional(),
  loinc: z.string().max(64).optional(),
  icd10: z.string().max(64).optional(),
  hsn: z.string().max(64).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(160),
  type: z.enum(CATEGORY_TYPES),
  code: z.string().trim().max(64).regex(CATEGORY_CODE_RE, 'code must look like SPEC.CARDIO').optional(),
  nameHi: z.string().max(160).optional(),
  aliases: z.array(z.string().trim().min(1).max(120)).max(50).optional(),
  description: z.string().max(2000).optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(),
  parent: z.string().max(64).optional(),
  isActive: z.boolean().optional(),
  tier: z.enum(CATEGORY_TIERS).optional(),
  regulatedBy: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  adClaimsRestricted: z.boolean().optional(),
  externalCodes: categoryExternalCodesSchema.optional(),
});

// code/level/path are server-owned; the pick allowlist in routes/categories.js
// is the second layer, so a schema relaxation cannot re-open them.
export const updateCategorySchema = createCategorySchema.omit({ code: true }).partial();

export const mergeCategorySchema = z.object({
  sourceIds: z.array(z.string()).min(1, 'At least one source ID required'),
  targetId: z.string().min(1, 'Target ID is required'),
});

// â”€â”€â”€ Staff Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  salary: z.number().optional(),
  // ADM-B-07: `hospitalId` is no longer accepted from the body â€” the tenant is
  // always derived from the session (superadmin may target one explicitly via
  // ?hospitalId=). Otherwise any hospital admin could file a staff row inside a
  // competitor's tenant.
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  salary: z.number().optional(),
  status: z.string().optional(),
});

// â”€â”€â”€ Clinic Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const updateClinicProfileSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  logo: z.string().optional(),
  description: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  image: z.string().optional(),
  details: boundedShallow.optional(),
});

// AUTH-B-19: facility staff endpoints may only mint facility-scoped roles.
// Tenant/platform roles (superadmin, hospital_admin, clinic_doctor, ...) are
// invite-only. A free-form `role: z.string()` here let ANY hospital_admin â€”
// including a self-registered one with no hospital â€” create a fully verified
// `superadmin` account, which bypasses every authorize() check.
export const CLINIC_STAFF_ROLES = ['nurse', 'technician', 'helper', 'accountant', 'lab_receptionist', 'pharmacist'];
const clinicStaffRole = (optional = false) => (optional
  ? z.enum(CLINIC_STAFF_ROLES).optional()
  : z.enum(CLINIC_STAFF_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${CLINIC_STAFF_ROLES.join(', ')}` }),
  }));

export const createClinicStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: emailSchema,
  phone: z.string().optional(),
  role: clinicStaffRole(false),
});

export const updateClinicStaffSchema = z.object({
  name: z.string().optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  role: clinicStaffRole(true),
});

// â”€â”€â”€ Notification Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().optional(),
  read: z.boolean().optional(),
  date: z.string().optional(),
});

// â”€â”€â”€ Billing Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DLB-26: `POST /api/billing` used to spread the raw request body into
// `Billing.create({ ...req.body })` with NO validation, so a caller could set
// `hospitalId` / `facilityId` (move the revenue to another tenant), `paid`,
// `status`, `balance`, `_id`, `createdAt` â€” i.e. forge a settled invoice.
export const createBillingSchema = z.object({
  patient: z.string().trim().min(1, 'Patient is required'),
  patientId: z.string().optional(),
  doctor: z.string().optional(),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  admissionId: z.string().optional(),
  service: z.string().trim().min(1, 'Service is required'),
  services: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    price: positiveNumber,
    quantity: z.number().int().positive().optional(),
    category: z.string().optional(),
    discount: nonNegativeNumber.optional(),
  })).optional(),
  source: z.enum(['manual', 'appointment', 'lab', 'pharmacy', 'ipd', 'ot', 'radiology', 'physio', 'diet']).optional(),
  amount: z.number().nonnegative('Amount must be non-negative'),
  subTotal: nonNegativeNumber.optional(),
  discount: nonNegativeNumber.optional(),
  tax: nonNegativeNumber.optional(),
  taxRate: nonNegativeNumber.optional(),
  taxableAmount: nonNegativeNumber.optional(),
  // Payment state is accepted here only because this endpoint is the "record a
  // bill" flow; the tenant and balance are ALWAYS server-derived below.
  paid: nonNegativeNumber.optional(),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Partial', 'Cancelled', 'Refunded']).optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  paymentMethod: z.enum(['Cash', 'Card', 'UPI', 'Cheque', 'Insurance', 'Online', 'Other']).optional(),
  transactionId: z.string().optional(),
  insuranceClaimId: z.string().optional(),
  insuranceApprovedAmount: nonNegativeNumber.optional(),
  insuranceStatus: z.enum(['Not Submitted', 'Submitted', 'Approved', 'Rejected', 'Partial']).optional(),
  invoiceId: z.string().optional(),
}).strip(); // drop unknown keys (_id, hospitalId, balance, createdAt, ...)

// â”€â”€â”€ Additional Auth Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const resendOtpSchema = z.object({
  email: emailSchema,
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
  accessToken: z.string().optional(),
  role: z.enum(['patient', 'doctor', 'hospital_admin', 'technician']).optional().default('patient'),
});

// AUTH-B-01 / AUTH-B-02: the account is identified by a VERIFIED Google
// id_token (never by a body email), and self-service can only create a patient.
export const googleRegisterSchema = z.object({
  // Optional at the schema layer on purpose: a MISSING Google proof must be
  // answered with 401 (unauthenticated) by the handler, not 400 (bad request).
  // A malformed body (e.g. missing name/phone) is still rejected with 400.
  googleIdToken: z.string().optional(),
  name: z.string().trim().min(2, 'Name is required'),
  phone: phoneSchema,
  gender: z.enum(['Male', 'Female', 'Other']).optional().default(''),
  dateOfBirth: z.string().optional(),
  avatar: z.string().optional(),
});

export const doctorSetupSchema = z.object({
  token: z.string().min(1, 'Setup token is required'),
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: phoneSchema,
  avatar: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),
  qualification: z.string().optional(),
  licenseNumber: z.string().optional(),
  consultationFee: z.union([z.string(), z.number()]).optional(),
  chatFee: z.union([z.string(), z.number()]).optional(),
  videoFee: z.union([z.string(), z.number()]).optional(),
  homeVisitFee: z.union([z.string(), z.number()]).optional(),
  appointmentModes: z.array(z.string()).optional(),
  emergencySupport: z.boolean().optional(),
  refundOnMissedOrCancelled: z.boolean().optional(),
  ambulanceService: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
}).passthrough();

export const changeEmailSchema = z.object({
  email: emailSchema,
});

// â”€â”€â”€ Patient Search Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const patientSearchSchema = z.object({
  q: z.string().optional(),
  hospitalId: objectIdSchema.optional(),
  phone: z.string().optional(),
  uhid: z.string().optional(),
  status: z.enum(['Active', 'Discharged', 'Critical']).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

// â”€â”€â”€ Vehicle Booking Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const estimateRideSchema = z.object({
  pickup: z.object({
    address: z.string().min(1, 'Pickup address is required'),
    lat: z.number(),
    lng: z.number(),
  }),
  drop: z.object({
    address: z.string().min(1, 'Drop address is required'),
    lat: z.number(),
    lng: z.number(),
  }),
  vehicleType: z.enum(VEHICLE_TYPE_OPTIONS).optional(),
  isEmergency: z.boolean().optional().default(false),
});

export const bookRideSchema = z.object({
  pickup: z.object({
    address: z.string().min(1, 'Pickup address is required'),
    lat: z.number(),
    lng: z.number(),
  }),
  drop: z.object({
    address: z.string().min(1, 'Drop address is required'),
    lat: z.number(),
    lng: z.number(),
  }),
  vehicleType: z.enum(VEHICLE_TYPE_OPTIONS),
  isEmergency: z.boolean().optional().default(false),
  // RIDE-B-07: an emergency booking must name the SOS it belongs to. The server
  // resolves that record and verifies the caller is its subject before granting
  // emergency pricing or ambulance-grade dispatch priority. Without this, ANY
  // client could set `isEmergency: true` and buy the emergency tariff (and jump
  // the dispatch queue) with no incident behind it.
  sosId: z.string().optional(),
  // RIDE-B-04: `distanceKm` and `durationMin` are ACCEPTED so an existing client
  // that still sends them does not 400, but they are STRIPPED by the parser and
  // the server always recomputes them from the haversine distance. A client value
  // that reached the fare/receipt maths would be fare manipulation.
  distanceKm: z.number().optional(),
  durationMin: z.number().optional(),
}).strip();

export const rateRideSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});

export const demoPaySchema = z.object({
  rideId: z.string().optional(),
  bookingId: z.string().optional(),
  doctorRequestId: z.string().optional(),
  lawyerBookingId: z.string().optional(),
  bookingType: z.enum(['ride', 'assistant', 'lawyer', 'emergency_doctor']).optional().default('ride'),
  method: z.enum(['demo_wallet', 'cash']).default('demo_wallet'),
});

export const riderStatusSchema = z.object({
  isOnline: z.boolean(),
});

export const riderLocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().positive().max(1000).optional(),
});

// â”€â”€â”€ Assistant Booking Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const searchAssistantSchema = z.object({
  hospital: z.string().optional(),
  categories: z.array(z.string()).optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  durationType: z.enum(['2hr', '4hr', 'full_day', 'overnight']).optional(),
  isUrgent: z.boolean().optional().default(false),
  minRating: z.number().optional(),
  maxPrice: z.number().optional(),
  language: z.string().optional(),
});

export const bookAssistantSchema = z.object({
  assistantId: z.string().optional().nullable(),
  hospital: z.string().min(1, 'Hospital name is required'),
  serviceCategories: z
    .array(z.string())
    .min(1, 'At least one service category is required'),
  isUrgent: z.boolean().optional().default(false),
  targetAssistantOnly: z.boolean().optional().default(false),
  intakeSource: z.enum(['quick_urgent_card', 'scheduled_profile_form', 'booking_wizard']).optional().default('scheduled_profile_form'),
  urgencyWindow: z.enum(['asap', 'specific_time']).optional().default('asap'),
  onBehalfOf: z.enum(['self', 'family', 'other']).optional().default('self'),
  familyMemberId: z.string().optional().nullable(),
  otherPatient: z.object({
    name: z.string().optional().default(''),
    phone: z.string().optional().default(''),
    age: z.string().optional().default(''),
  }).optional(),
  taskDescription: z.string().max(1000).optional().default(''),
  phone: z.string().optional().default(''),
  documents: z.array(z.string()).optional().default([]),
  scheduledDate: z.string().optional(),
  startTime: z.string().optional(),
  durationType: z.enum(['2hr', '4hr', 'full_day', 'overnight']).default('4hr'),
  specialInstructions: z.string().max(1000).optional().default(''),
});

export const assistantStatusSchema = z.object({
  isAvailable: z.boolean(),
});

export const customTaskSchema = z.object({
  label: z.string().trim().min(2, 'Task description is required').max(200),
  category: z.string().optional().default('custom'),
});

export const rateAssistantSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});

// â”€â”€â”€ Lawyer Booking Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const searchLawyerSchema = z.object({
  category: z.string().optional(),
  mode: z.enum(['video', 'phone', 'in_person', 'chat']).optional(),
  date: z.string().optional(),
  city: z.string().optional(),
  isUrgent: z.boolean().optional().default(false),
  minRating: z.number().optional(),
  maxFee: z.number().optional(),
  minExperience: z.number().optional(),
  language: z.string().optional(),
  court: z.string().optional(),
});

export const bookLawyerSchema = z.object({
  lawyerId: z.string().optional().nullable(),
  category: z.string().min(1, 'Category is required'),
  caseDescription: z.string().min(5, 'Brief description of your issue is required'),
  urgency: z.enum(['normal', 'urgent']).optional().default('normal'),
  isUrgent: z.boolean().optional(),
  consultationMode: z.enum(['video', 'phone', 'in_person', 'chat']).optional(),
  contactMode: z.enum(['video', 'phone', 'in_person', 'chat']).optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  targetLawyerOnly: z.boolean().optional(),
  intakeSource: z.enum(['quick_urgent_card', 'scheduled_profile_form']).optional(),
  bookingFor: z.enum(['self', 'family', 'other']).optional(),
  familyMemberId: z.string().optional().nullable(),
  otherPatient: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
      age: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
  phone: z.string().optional(),
  acknowledgeUrgent: z.boolean().optional(),
  budgetRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  documents: z.array(z.string()).optional().default([]),
  fee: z.number().optional(),
  isFollowUp: z.boolean().optional().default(false),
  caseThreadId: z.string().optional(),
}).passthrough();

export const proposeTimeSchema = z.object({
  date: z.string().min(1, 'Proposed date is required'),
  time: z.string().min(1, 'Proposed time is required'),
  reason: z.string().optional().default(''),
});

export const caseNoteSchema = z.object({
  note: z.string().trim().min(3, 'Case note content is required').max(2000),
  sessionNumber: z.number().optional().default(1),
});

export const rateLawyerSchema = z.object({
  stars: z.number().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});

export const lawyerStatusSchema = z.object({
  isAvailable: z.boolean(),
});

// â”€â”€â”€ Emergency SOS Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const emergencySOSSchema = z.object({
  reporterMode: z.enum(['self', 'other']),
  patientDetails: z
    .object({
      name: z.string().max(100).optional().default(''),
      age: z.union([z.number(), z.string().transform(v => (v ? Number(v) : null))]).optional().nullable(),
      gender: z.enum(['male', 'female', 'other', '']).optional(),
      bloodGroup: z.string().max(10).optional().default(''),
      knownAllergies: z.string().max(500).optional().default(''),
      knownConditions: z.string().max(500).optional().default(''),
      phone: z.string().max(20).optional().default(''),
    })
    .optional(),
  reporterOwnDetailsShared: z.boolean().optional().default(false),
  reporterDetails: z
    .object({
      name: z.string().optional().default(''),
      phone: z.string().optional().default(''),
    })
    .optional(),
  category: z
    .enum(['accident', 'heart_attack', 'breathing_issue', 'burn', 'fall', 'stroke', 'other', ''])
    .optional()
    .default(''),
  lat: z.number().optional(),
  lng: z.number().optional(),
  accuracy: z.number().optional(),
  address: z.string().optional().default(''),
  location: z
    .object({
      coordinates: z.array(z.number()).length(2),
      address: z.string().optional(),
    })
    .optional(),
}).refine(
  data => (data.lat !== undefined && data.lng !== undefined) || (data.location?.coordinates?.length === 2),
  { message: 'Valid GPS coordinates [lng, lat] or lat/lng required' }
);

export const createAmbulanceSchema = z.object({
  registrationNumber: z.string().trim().min(3).max(20),
  vehicleModel: z.string().max(100).optional().default(''),
  ambulanceType: z.enum(AMBULANCE_TYPE_OPTIONS).optional().default('BLS'),
  equipmentLevel: z.string().max(300).optional().default(''),
  currentDriverId: z.string().optional().nullable(),
  currentDriverPhone: z.string().optional().default(''),
  driverName: z.string().max(100).optional().default(''),
  driverPhone: z.string().max(20).optional().default(''),
  loginEmail: z.string().email().optional().or(z.literal('')).optional().default(''),
});

export const updateAmbulanceSchema = z.object({
  registrationNumber: z.string().trim().min(3).max(20).optional(),
  vehicleModel: z.string().max(100).optional(),
  ambulanceType: z.enum(AMBULANCE_TYPE_OPTIONS).optional(),
  equipmentLevel: z.string().max(300).optional(),
  currentDriverId: z.string().optional().nullable(),
  currentDriverPhone: z.string().optional(),
  driverName: z.string().max(100).optional(),
  driverPhone: z.string().max(20).optional(),
  loginEmail: z.string().email().optional().or(z.literal('')).optional(),
  isOnline: z.boolean().optional(),
  isOnDuty: z.boolean().optional(),
  emergencySupport: z.boolean().optional(),
});



// --- 10.md 2.1 / 2.2 - generic provider + join-wizard config ---

const geoSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
}).strict();

const providerAddressSchema = z.object({
  line1: z.string().trim().max(200).optional(),
  area: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(10).optional(),
  geo: geoSchema.optional(),
}).strict();

const serviceAreaSchema = z.object({
  radiusKm: z.number().min(0).max(500).optional(),
  pincodes: z.array(z.string().trim().max(10)).max(50).optional(),
}).strict();

const weeklyHoursSchema = z.object({
  day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']),
  open: z.string().max(8).optional(),
  close: z.string().max(8).optional(),
  closed: z.boolean().optional(),
}).strict();

const timingsSchema = z.object({
  weekly: z.array(weeklyHoursSchema).max(7).optional(),
  exceptions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    closed: z.boolean().optional(),
    open: z.string().max(8).optional(),
    close: z.string().max(8).optional(),
  }).strict()).max(60).optional(),
  is24x7: z.boolean().optional(),
}).strict();

const providerContactSchema = z.object({
  // relayPhone is deliberately absent: it is a private routing number the
  // server hands out only alongside a booking, never from a write payload.
  publicPhone: z.string().trim().max(20).optional(),
  email: z.string().trim().max(160).optional(),
}).strict();

// `kind`, `group` and `tier` are NOT client input - the route derives them from
// the active ProviderTypeConfig row for `type`, so a wizard cannot self-declare
// as clinical or quietly raise its own data tier.
export const createProviderSchema = z.object({
  type: z.string().trim().toLowerCase().min(2).max(60),
  name: z.string().trim().min(2).max(160),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().max(2000).optional(),
  categoryCodes: z.array(z.string().trim().max(64)).max(50).optional(),
  systemOfMedicine: z.string().trim().max(60).optional(),
  ownership: z.string().trim().max(60).optional(),
  accreditations: z.array(z.string().trim().max(120)).max(20).optional(),
  schemesAccepted: z.array(z.string().trim().max(120)).max(20).optional(),
  address: providerAddressSchema.optional(),
  serviceArea: serviceAreaSchema.optional(),
  timings: timingsSchema.optional(),
  languages: z.array(z.string().trim().max(60)).max(30).optional(),
  amenities: z.array(z.string().trim().max(60)).max(50).optional(),
  contact: providerContactSchema.optional(),
  media: z.array(z.object({
    url: z.string().trim().max(500),
    type: z.enum(['image', 'video', 'document']).optional(),
    alt: z.string().trim().max(160).optional(),
  }).strict()).max(30).optional(),
}).strict();

export const updateProviderSchema = createProviderSchema.partial();

const wizardFieldSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'boolean', 'file', 'phone', 'email', 'geo', 'address']),
  required: z.boolean().optional(),
  help: z.string().max(300).optional(),
  options: z.array(z.string().max(120)).max(50).optional(),
  defaultValue: boundedScalar.optional(),
}).strict();

const wizardStepSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  fields: z.array(z.string().max(60)).max(40).optional(),
}).strict();

const wizardDocSchema = z.object({
  key: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  mandatory: z.boolean().optional(),
  expiryRequired: z.boolean().optional(),
  maxMb: z.number().min(1).max(50).optional(),
}).strict();

export const createProviderTypeConfigSchema = z.object({
  typeKey: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_]{1,59}$/, 'typeKey must be snake_case'),
  kind: z.enum(PROVIDER_KINDS),
  group: z.enum(PROVIDER_GROUPS),
  tier: z.enum(CATEGORY_TIERS).optional(),
  label: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(60).optional(),
  description: z.string().max(500).optional(),
  steps: z.array(wizardStepSchema).max(20).optional(),
  fields: z.array(wizardFieldSchema).max(100).optional(),
  requiredDocs: z.array(wizardDocSchema).max(30).optional(),
  optionalDocs: z.array(wizardDocSchema).max(30).optional(),
  agreementTemplateId: z.string().trim().max(60).optional(),
  approvalPolicy: z.object({
    level: z.enum(['auto', 'single', 'dual']).optional(),
    slaHours: z.number().min(0).max(720).optional(),
    twoPerson: z.boolean().optional(),
  }).strict().optional(),
  enabledCities: z.array(z.string().trim().max(80)).max(100).optional(),
  allowedStatus: z.array(z.enum(PROVIDER_STATUS)).optional(),
  commissionDefaults: z.object({
    percent: z.number().min(0).max(100).optional(),
    fixed: z.number().min(0).optional(),
    currency: z.string().trim().length(3).optional(),
  }).strict().optional(),
}).strict();

export const updateProviderTypeConfigSchema = createProviderTypeConfigSchema
  .omit({ typeKey: true })
  .partial();

// --- 10.md 2.6 - Service / Offering ---
const serviceModeSchema = z.object({
  mode: z.enum(SERVICE_MODES),
  fee: z.number().min(0).max(1000000).optional(),
  durationMin: z.number().int().min(0).max(1440).optional(),
  followUpDays: z.number().int().min(0).max(90).optional(),
}).strict();

const servicePackageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sessions: z.number().int().min(1).max(500),
  price: z.number().min(0).max(1000000),
  validityDays: z.number().int().min(1).max(730).optional(),
}).strict();

// cancellationPolicyId is deliberately NOT writable: there is no policy
// catalogue to validate it against yet, and an unvalidated ObjectId would let
// a service inherit a cancellation rule that does not exist.
export const createServiceSchema = z.object({
  providerId: objectIdSchema,
  practitionerId: objectIdSchema.optional().nullable(),
  categoryCode: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(160),
  description: z.string().max(2000).optional(),
  modes: z.array(serviceModeSchema).max(10).optional(),
  durationMin: z.number().int().min(0).max(1440).optional(),
  price: z.object({
    amount: z.number().min(0).max(1000000).optional(),
    currency: z.string().trim().length(3).optional(),
    taxInclusive: z.boolean().optional(),
    gstRate: z.number().min(0).max(28).optional(),
  }).strict().optional(),
  packages: z.array(servicePackageSchema).max(20).optional(),
  eligibility: z.object({
    ageMin: z.number().int().min(0).max(120).optional(),
    ageMax: z.number().int().min(0).max(120).optional(),
    gender: z.enum(['any', 'male', 'female', 'other']).optional(),
  }).strict().optional(),
  prerequisites: z.array(z.string().trim().max(200)).max(20).optional(),
  prepInstructions: z.string().max(2000).optional(),
  requiresRx: z.boolean().optional(),
  isActive: z.boolean().optional(),
  capacity: z.object({
    perSlot: z.number().int().min(1).max(1000).optional(),
    perDay: z.number().int().min(0).max(10000).optional(),
  }).strict().optional(),
  regulatoryTags: z.array(z.string().trim().max(60)).max(20).optional(),
}).strict();

export const updateServiceSchema = createServiceSchema
  .omit({ providerId: true })
  .partial();

// --- 10.md 2.11 - FLOW-D plan catalogue (provider workspace CRUD) ---
//
// Strict, like the service schemas: a client that sends `status: 'live'` or a
// typo'd freeze bound gets a 400 rather than a silently-dropped field. The
// money caps match the model's; the type enum is THE spec list (gym/yoga/
// program/class_pack/meal), not a free string a route would have to whitelist.
export const createPlanSchema = z.object({
  providerId: objectIdSchema,
  type: z.enum(['gym', 'yoga', 'program', 'class_pack', 'meal']),
  name: z.string().trim().min(2).max(200),
  duration: z.object({
    value: z.number().int().min(1).max(730),
    unit: z.enum(['day', 'week', 'month', 'year']),
  }).strict(),
  price: z.number().min(0).max(10000000),
  joiningFee: z.number().min(0).max(1000000).optional(),
  sessionCredits: z.number().int().min(0).max(10000).optional(),
  inclusions: z.array(z.string().trim().max(300)).max(50).optional(),
  freezeRules: z.object({
    maxFreezeDaysPerYear: z.number().int().min(0).max(365).optional(),
    maxFreezesPerYear: z.number().int().min(0).max(60).optional(),
    minNoticeDays: z.number().int().min(0).max(90).optional(),
  }).strict().optional(),
  autoRenew: z.boolean().optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
}).strict();

export const updatePlanSchema = createPlanSchema
  .omit({ providerId: true })
  .partial();

// --- 10.md 2.7 - commerce product catalogue (provider workspace CRUD) ---
//
// `rxSchedule` reuses MEDICINE_RX_SCHEDULES so "is this Rx?" stays one
// vocabulary (validateVocab.spec keeps the model enum honest against it).
// Variants carry the stock: price/stock never live on the parent row, because
// two pack sizes of one product do not share an inventory number.
const productVariantSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  pack: z.string().trim().min(1).max(120),
  mrp: z.number().min(0).max(10000000).optional(),
  price: z.number().min(0).max(10000000),
  stock: z.number().int().min(0).max(10000000).optional(),
  batch: z.string().trim().max(80).optional(),
  expiry: z.coerce.date().optional(),
}).strict();

export const createProductSchema = z.object({
  vendorId: objectIdSchema,
  kind: z.enum(['medicine', 'supplement', 'food', 'skincare', 'device', 'optical', 'consumable']),
  categoryCodes: z.array(z.string().trim().max(64)).max(20).optional(),
  brand: z.string().trim().max(200).optional(),
  name: z.string().trim().min(2).max(300),
  variants: z.array(productVariantSchema).min(1).max(50),
  composition: z.string().max(4000).optional(),
  rxSchedule: z.enum(MEDICINE_RX_SCHEDULES).optional(),
  fssaiNo: z.string().trim().max(40).optional(),
  cdscoNo: z.string().trim().max(40).optional(),
  hsn: z.string().trim().max(20).optional(),
  gstRate: z.number().min(0).max(28).optional(),
  claims: z.array(z.string().trim().max(300)).max(20).optional(),
  images: z.array(z.string().trim().max(500)).max(20).optional(),
  storage: z.enum(['ambient', 'cold_chain']).optional(),
  warrantyMonths: z.number().int().min(0).max(120).optional(),
  rentable: z.object({
    perDay: z.number().min(0).max(1000000).optional(),
    deposit: z.number().min(0).max(1000000).optional(),
    available: z.boolean().optional(),
  }).strict().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
}).strict();

export const updateProductSchema = createProductSchema
  .omit({ vendorId: true })
  .partial();

// --- 10.md 2.3 - join application (2.md join flow, 8.md approval queue) ---
//
// The client picks ONLY the type and, on appeal, the application being
// appealed. kind/group/tier/approval policy are read from ProviderTypeConfig
// server-side (10.md 1, 2.md 14 "no privilege from client").
export const createApplicationSchema = z.object({
  typeKey: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_]{1,59}$/, 'typeKey must be snake_case'),
  appealOf: objectIdSchema.optional(),
}).strict();

// Wizard autosave (2.md 3). Keys are step names; values are whatever that step
// collected. Depth is bounded by DRAFT_MAX_BYTES in the route rather than by a
// schema depth rule, because wizard data is legitimately nested
// (address -> geo -> coordinates, timings -> weekly[] -> breaks[]).
export const updateApplicationDraftSchema = z.object({
  draft: z.record(z.string().trim().min(1).max(64), z.unknown()),
}).strict();

// 8.md 2 reviewer controls: four decisions, per-document needs-info comments
// (2.md 6 "reviewer comments per document"), and a checklist ticked against
// the type's configured documents.
export const applicationDecisionSchema = z.object({
  decision: z.enum(APPLICATION_DECISIONS),
  reason: z.string().trim().min(10).max(1000).optional(),
  needsInfo: z.array(z.object({
    docKey: z.string().trim().min(1).max(60),
    comment: z.string().trim().min(1).max(1000),
  }).strict()).max(30).optional(),
  checklist: z.array(z.object({
    key: z.string().trim().min(1).max(60),
    status: z.enum(CHECKLIST_STATUSES),
    note: z.string().trim().max(1000).optional(),
  }).strict()).max(50).optional(),
}).strict();

// Multipart body fields (10.md 4.2). WHICH docTypes are legitimate is decided
// by the application's own ProviderTypeConfig, not by this schema - see
// routes/join.js.
export const joinDocumentSchema = z.object({
  docType: z.string().trim().min(2).max(60).regex(/^[a-z0-9][a-z0-9_]*$/, 'docType must be snake_case'),
  // Form fields arrive as strings, and an empty box means "no expiry".
  expiryDate: z.union([z.string().max(0), z.coerce.date()]).optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value)),
}).strict();

// ==============================================================================
// FLOW-B / FLOW-E / FLOW-G - request & quote, events & camps, equipment rental.
// (5.md 3, 5.md 6, 5.md 8; 10.md 2.10, 2.12)
//
// Kept as one block at the end of the file so the new flows are reviewable as a
// unit and cannot disturb the existing schemas.
//
// The invariant these schemas exist to protect is 5.md 15's "server-owned
// pricing: ignore client amounts". Every one is `.strict()`, so a body carrying
// `totalAmount`, `rentalAmount`, `subtotal` or `status` is a 400 rather than a
// field that is silently dropped and then silently trusted. Prices the SERVER
// computes (quote totals, rental charge from the unit's rate) simply have no
// input field here; prices a principal legitimately sets (a vendor's day rate,
// an organiser's fee) are bounded and rounded at the write boundary.
// ==============================================================================

const quoteLineItemInput = z.object({
  description: z.string().trim().min(2).max(300),
  quantity: z.number().int().min(1).max(1000).optional(),
  unitPrice: z.number().min(0).max(10000000),
}).strict();

// The patient's request: what they want done, where, and what they can spend.
// Budget is a HINT to the provider, never a price - the quote is the price.
export const createQuoteRequestSchema = z.object({
  providerId: objectIdSchema,
  serviceDescription: z.string().trim().min(10).max(4000),
  preferredMode: z.enum(SERVICE_MODES).optional(),
  location: z.object({
    line1: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(10).optional(),
  }).strict().optional(),
  budget: z.object({
    min: nonNegativeNumber.optional(),
    max: nonNegativeNumber.optional(),
  }).strict().optional(),
  notes: z.string().max(2000).optional(),
  attachments: z.array(z.string().trim().max(400)).max(20).optional(),
}).strict();

// Line items in, totals out: computeQuoteTotals() derives subtotal/GST/total
// from these, so `totalAmount` in a body is a 400, not a price.
export const sendQuoteSchema = z.object({
  lineItems: z.array(quoteLineItemInput).min(1).max(50),
  gstRate: z.number().min(0).max(28).optional(),
  cancellationTerms: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  // 5.md 3: 48 h default, organiser/provider may shorten but not remove.
  validityHours: z.number().int().min(1).max(720).optional(),
}).strict();

// Accept is a decision, not a payload: an empty object is the whole schema.
export const acceptQuoteSchema = z.object({}).strict();

export const quoteDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

const eventScheduleRefine = (value) => !value.schedule?.end || !value.schedule?.start
  || value.schedule.end.getTime() > value.schedule.start.getTime();

const eventBody = z.object({
  organizerId: objectIdSchema,
  type: z.enum(EVENT_TYPES),
  title: z.string().trim().min(3).max(200),
  description: z.string().max(8000).optional(),
  schedule: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    tz: z.string().trim().max(60).optional(),
  }).strict(),
  venue: z.object({
    mode: z.enum(['venue', 'online']).optional(),
    address: z.string().trim().max(500).optional(),
    city: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(10).optional(),
    geo: z.object({
      type: z.literal('Point'),
      coordinates: z.array(z.number()).length(2),
    }).strict().optional(),
    onlineLink: z.string().trim().max(500).optional(),
  }).strict().optional(),
  capacity: z.number().int().min(1).max(100000),
  fee: z.object({
    amount: nonNegativeNumber.optional(),
    currency: z.string().trim().length(3).optional(),
  }).strict().optional(),
  eligibility: z.object({
    ageMin: z.number().int().min(0).max(120).optional(),
    ageMax: z.number().int().min(0).max(120).optional(),
    gender: z.enum(['any', 'male', 'female', 'other']).optional(),
  }).strict().optional(),
  agenda: z.array(z.object({
    at: z.string().trim().max(12).optional(),
    label: z.string().trim().max(200),
  }).strict()).max(50).optional(),
  speakers: z.array(z.object({
    title: z.string().trim().max(160).optional(),
    affiliation: z.string().trim().max(160).optional(),
    bio: z.string().max(1000).optional(),
  }).strict()).max(50).optional(),
  languages: z.array(z.string().trim().max(40)).max(10).optional(),
  consentText: z.string().max(4000).optional(),
  refundCutoffHours: z.number().int().min(0).max(720).optional(),
}).strict();

const scheduleWindow = { message: 'schedule.end must be after schedule.start', path: ['schedule', 'end'] };

export const createEventSchema = eventBody.refine(eventScheduleRefine, scheduleWindow);

// `organizerId` and `status` are not client-writable: an event changes owner by
// a migration and status through publish/cancel/end, never through a PATCH.
export const updateEventSchema = eventBody.omit({ organizerId: true })
  .partial()
  .refine(eventScheduleRefine, scheduleWindow);

export const eventActionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
}).strict();

// Registration carries consent and (for a paid event) the payment the server
// is about to verify - never a price: the fee is copied from the Event row.
export const registerEventSchema = z.object({
  consentGiven: z.boolean().optional(),
  paymentId: objectIdSchema.optional(),
}).strict();

export const cancelRegistrationSchema = z.object({
  reason: z.string().trim().max(500).optional(),
}).strict();

// The organiser's scanner submits the code from the ticket's QR. The CODE is
// compared server-side; nothing in this body decides who gets checked in.
export const checkInSchema = z.object({
  code: z.string().trim().min(6).max(32),
}).strict();

export const createAssetUnitSchema = z.object({
  vendorId: objectIdSchema,
  productId: objectIdSchema.optional(),
  productName: z.string().trim().min(2).max(160),
  kind: z.string().trim().max(60).optional(),
  serial: z.string().trim().min(2).max(60),
  ratePerDay: z.number().min(0).max(1000000),
  deposit: z.number().min(0).max(1000000).optional(),
  sanitisationCycleDays: z.number().int().min(0).max(365).optional(),
  location: z.string().trim().max(300).optional(),
  isListed: z.boolean().optional(),
}).strict();

// Neither the vendor nor the renter may repoint a unit to another vendor, and
// the serial is the unit's identity - both are set once.
export const updateAssetUnitSchema = createAssetUnitSchema
  .omit({ vendorId: true, serial: true })
  .partial();

// Dates only. The charge comes from AssetUnit.ratePerDay via
// computeRentalTotals(), so a body field like `rentalAmount` is a 400.
export const createRentalSchema = z.object({
  assetUnitId: objectIdSchema,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  conditionOut: z.array(z.string().trim().max(300)).max(30).optional(),
}).strict().refine(
  (value) => value.endAt.getTime() > value.startAt.getTime(),
  { message: 'endAt must be after startAt', path: ['endAt'] }
);

// One body shape for every rental transition: which optional fields apply is
// decided by the transition, not by which schema the client managed to hit.
// `damageAmount` is the vendor's assessment at inspection - it is clamped to the
// held deposit by computeDepositRefund(), never accepted as "refund = X".
export const rentalActionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(300).optional(),
  conditionOut: z.array(z.string().trim().max(300)).max(30).optional(),
  conditionIn: z.array(z.string().trim().max(300)).max(30).optional(),
  damageNotes: z.string().trim().max(2000).optional(),
  damageAmount: z.number().min(0).max(1000000).optional(),
}).strict();

// --- 8.md �5/�6 - moderation queue bodies -----------------------------------
// Canned actions only: a moderator cannot invent a verb, and the note is the
// thing the decision log and a later appeal read.

export const moderationActionSchema = z.object({
  action: z.enum(MODERATION_ACTIONS),
  note: z.string().trim().max(1000).optional(),
}).strict();

export const moderationNoteSchema = z.object({
  note: z.string().trim().min(1).max(2000),
}).strict();

export const moderationAppealSchema = z.object({
  note: z.string().trim().min(1).max(1000),
}).strict();

export const moderationAppealResolveSchema = z.object({
  outcome: z.enum(['upheld', 'overturned']),
  resolutionNote: z.string().trim().max(1000).optional(),
}).strict();

export const moderationEnqueueSchema = z.object({
  targetType: z.enum(MODERATION_TARGET_TYPES),
  targetId: z.string().trim().min(1).max(100),
  category: z.enum(MODERATION_CATEGORIES),
  severity: z.enum(MODERATION_SEVERITIES).optional(),
  reason: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  subjectUserId: objectIdSchema.optional(),
  subjectProviderId: objectIdSchema.optional(),
}).strict();

export const assetSanitiseSchema = z.object({
  performedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();

// --- A4 / rolesmd 10.md 4.3 + 4.4, 6.md 2.5/2.15/2.7 - patient portal --------
// Enum copies are pinned to their models by validateVocab.spec (the models
// cannot be imported here - see the write-path vocabulary block at the top).

export const VACCINATION_SCHEDULE_TYPES = ['child_uip', 'adult_booster', 'travel', 'covid', 'other'];
export const VACCINATION_SOURCES = ['uip', 'provider', 'manual', 'import'];
export const DSR_TYPES = ['access', 'correction', 'export'];
export const DSR_DECISION_ACTIONS = ['review', 'verify', 'fulfill', 'reject'];
export const DSR_VERIFICATION_METHODS = ['email_otp', 'sms_otp', 'in_person', 'manual'];
export const MEAL_DIET_TYPES = ['veg', 'non_veg', 'eggetarian', 'vegan', 'jain', 'custom'];
export const MEAL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// A schedule is CREATE-then-check-off: the doses and their due dates arrive
// together, every dose number is unique (a duplicate number makes "mark dose 2
// given" ambiguous), and `status` is deliberately absent - a client cannot
// create a row already `completed`.
export const createVaccinationScheduleSchema = z.object({
  vaccineName: z.string().trim().min(1).max(200),
  scheduleType: z.enum(VACCINATION_SCHEDULE_TYPES).optional(),
  source: z.enum(VACCINATION_SOURCES).optional(),
  familyMemberId: objectIdSchema.optional(),
  doses: z.array(z.object({
    number: z.number().int().min(1),
    dueAt: z.coerce.date(),
  }).strict()).min(1).max(24),
}).strict().refine(
  (value) => new Set(value.doses.map((dose) => dose.number)).size === value.doses.length,
  { message: 'dose numbers must be unique', path: ['doses'] },
);

// Marking a dose given: the recordId is a certificate (Record of type
// vaccination_record) the ROUTE verifies belongs to the caller - the schema
// only proves it is shaped like an id.
export const doseGivenSchema = z.object({
  centre: z.string().trim().max(300).optional(),
  batchNo: z.string().trim().max(80).optional(),
  recordId: objectIdSchema.optional(),
  givenAt: z.coerce.date().optional(),
}).strict();

// DPDP data-subject request (access | correction | export - erasure is
// deliberately NOT here, it has DeletionRequest's reviewed flow).
export const createDsrSchema = z.object({
  type: z.enum(DSR_TYPES),
  details: z.string().trim().max(4000).optional(),
}).strict();

// Conditional requirements (method for verify, exportRef for fulfilling an
// export) are checked in the route, which is the only place that knows the
// row's `type` and current status.
export const dsrDecisionSchema = z.object({
  action: z.enum(DSR_DECISION_ACTIONS),
  note: z.string().trim().max(2000).optional(),
  exportRef: z.string().trim().max(500).optional(),
  method: z.enum(DSR_VERIFICATION_METHODS).optional(),
}).strict();

export const dsrExtendSchema = z.object({
  reason: z.string().trim().min(1).max(500),
}).strict();

// The subscription's own shape. `providerId` is required by the model, `planId`
// is resolved against THAT provider (and must be a meal plan) in the route, and
// `status`/`userId` are server-owned - a client cannot sign itself up as
// someone else's row or start `cancelled`.
export const createMealSubscriptionSchema = z.object({
  providerId: objectIdSchema,
  planId: objectIdSchema.optional(),
  dietType: z.enum(MEAL_DIET_TYPES).optional(),
  allergies: z.array(z.string().trim().max(200)).max(30).optional(),
  notes: z.string().trim().max(2000).optional(),
  weeklyMenu: z.array(z.object({
    day: z.enum(MEAL_DAYS),
    items: z.array(z.string().trim().max(300)).max(20).optional(),
  }).strict()).max(7).optional(),
  deliverySlot: z.string().trim().max(120).optional(),
  deliveryAddress: z.string().trim().max(500).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
}).strict().refine(
  (value) => !value.endAt || value.endAt.getTime() > value.startAt.getTime(),
  { message: 'endAt must be after startAt', path: ['endAt'] },
).refine(
  (value) => !value.weeklyMenu
    || new Set(value.weeklyMenu.map((entry) => entry.day)).size === value.weeklyMenu.length,
  { message: 'weeklyMenu days must be unique', path: ['weeklyMenu'] },
);

// Pause is a hold WITH A WINDOW (6.md 2.7 "pause"), not a cancellation - the
// bounds travel together so a `to` can never be silently dropped.
export const mealPauseSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  reason: z.string().trim().max(300).optional(),
}).strict().refine(
  (value) => value.to.getTime() > value.from.getTime(),
  { message: 'to must be after from', path: ['to'] },
);

// Skip-days are a bounded, auditable list (the model keeps them as data, not
// an edit to the weekly menu). 30 per request; the route caps the running total.
export const mealSkipSchema = z.object({
  dates: z.array(z.coerce.date()).min(1).max(30),
}).strict();

// Membership purchase (6.md 2.8 / 10.md 4.3, 5.md Flow D). STRICT because the
// price must never be client-shaped: no `price`, no `pricePaid`, no `status` -
// the route computes every one of them from the Plan row. `startAt` is the
// "start date" 5.md lists; absent, the server uses now. `paymentId` names a
// completed payment (verified owner/status/amount server-side) and is only
// required when the plan actually costs something.
export const createMembershipSchema = z.object({
  planId: objectIdSchema,
  startAt: z.coerce.date().optional(),
  autoRenew: z.boolean().optional(),
  paymentId: objectIdSchema.optional(),
}).strict();

// 6.md 2.13/140: the patient adds THEIR OWN policy — insurer/TPA, member IDs,
// validity, PM-JAY/CGHS/ESI scheme card. STRICT because patientId, status and
// expiry are not client-shaped inputs: the session owns the row and expiry is
// derived from validTo at read, so a forged `status: 'active'` on a lapsed
// window is a 400, not a stored lie.
export const createPolicySchema = z.object({
  insurer: z.string().trim().min(1, 'Insurer is required').max(120),
  tpa: z.string().trim().max(120).optional(),
  policyNumber: z.string().trim().min(1, 'Policy number is required').max(60),
  memberIds: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  scheme: z.enum(['PM-JAY', 'CGHS', 'ESI']).nullish(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
}).strict().refine(
  (value) => value.validTo.getTime() > value.validFrom.getTime(),
  { message: 'validTo must be after validFrom', path: ['validTo'] },
);
