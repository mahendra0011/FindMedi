import { z } from 'zod';

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
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string().email('Valid email is required').transform(e => e.toLowerCase());
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
export const phoneSchema = z.string().min(10, 'Phone must be at least 10 digits').max(15).optional();
export const positiveNumber = z.number().positive('Must be a positive number');
export const nonNegativeNumber = z.number().nonnegative('Must be non-negative');

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
  vehicleType: z.enum(['bike', 'auto', 'e_rickshaw', 'car', 'van', 'ambulance']).optional(),
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
  extraFields: z.record(z.any()).optional(),

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
  extraSkills: z.record(z.any()).optional(),

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
  role: z.enum(['superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian', 'physiotherapist', 'counselor', 'counsellor', 'psychiatrist', 'accountant', 'security', 'technician', 'helper', 'delivery_boy', 'rider', 'assistant', 'lawyer', 'ambulance']).optional(),
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
  fees: z.number().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'In Queue', 'Serving', 'Missed']).optional(),
  // APPT-B-06 (partial): reschedule via PUT /:id used bare strings, so 2026-13-45
  // / 99:99 bypassed the calendar check that both booking paths enforce. Same
  // slotDate/slotTime rules here â€” a rescheduled slot must be matchable too.
  date: slotDate.optional(),
  time: slotTime.optional(),
  notes: z.string().optional(),
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
  reportTime: z.string().optional(),
  prescriptionReq: z.boolean().optional(),
  homeCollection: z.boolean().optional(),
  homeCollectionFee: nonNegativeNumber.optional(),
  popular: z.boolean().optional(),
  nablAccredited: z.boolean().optional(),
});

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
});

// â”€â”€â”€ Review Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createReviewSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(2, 'Comment is required'),
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
  type: z.enum(['Diagnosis', 'Prescription', 'Lab Report', 'Imaging', 'Discharge Summary', 'prescription', 'lab_report', 'discharge_summary', 'bill_invoice', 'payment_invoice']).optional().default('Diagnosis'),
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
  checklist: z.any().optional(),
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
    weekly_schedule: z.any().optional(),
    leaves: z.any().optional(),
    dateDisabledSlots: z.any().optional(),
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
  refund_amount: z.number().positive('Refund amount must be greater than 0'),
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
export const createTriageSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  age: z.number().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  patientId: z.string().optional(),
  arrivalMode: z.string().optional(),
  broughtBy: z.string().optional(),
  chiefComplaint: z.string().min(1, 'Chief complaint is required'),
  triageLevel: z.string().min(1, 'Triage level is required'),
  triageNotes: z.string().optional(),
  vitals: z.any().optional(),
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
  establishedYear: z.union([z.string(), z.number()]).optional(),
  logo: z.string().optional(),
  image: z.string().optional(),
  nablNumber: z.string().optional(),
  aerbNumber: z.string().optional(),
  workingHours: z.any().optional(),
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
  timing: z.any().optional(),
  amenities: z.any().optional(),
  socialLinks: z.any().optional(),
  adminName: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPhone: z.string().optional(),
  details: z.any().optional(),
});

export const updateFacilitySchema = z.object({
  name: z.string().optional(),
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
  timing: z.any().optional(),
  amenities: z.any().optional(),
  socialLinks: z.any().optional(),
  details: z.any().optional(),
});

// â”€â”€â”€ Announcement Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createAnnouncementSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  message: z.string().min(2, 'Message is required'),
  priority: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
});

// â”€â”€â”€ Category Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  type: z.string().optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  parent: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  parent: z.string().optional(),
  isActive: z.boolean().optional(),
});

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
  details: z.any().optional(),
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
  vehicleType: z.enum(['bike', 'auto', 'e_rickshaw', 'car', 'van', 'ambulance']).optional(),
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
  vehicleType: z.enum(['bike', 'auto', 'e_rickshaw', 'car', 'van', 'ambulance']),
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
  ambulanceType: z.enum(['BLS', 'ALS', 'PATIENT_TRANSPORT', 'MORTUARY']).optional().default('BLS'),
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
  ambulanceType: z.enum(['BLS', 'ALS', 'PATIENT_TRANSPORT', 'MORTUARY']).optional(),
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


