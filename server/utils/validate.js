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

// ─── Reusable Types ────────────────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
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

// ─── Auth Schemas ──────────────────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['patient', 'doctor', 'admin']).optional().default('patient'),
  phone: phoneSchema,
  gender: z.enum(['Male', 'Female', 'Other']).optional().default(''),
  dateOfBirth: z.string().optional(),
  specialization: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  qualification: z.string().optional().default(''),
  qualifications: z.string().optional().default(''),
  licenseNumber: z.string().optional().default(''),
  consultationFee: z.union([z.string(), z.number()]).optional().default(0),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['patient', 'doctor', 'admin']).optional(),
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

// ─── Doctor Schemas ────────────────────────────────────────────────────────
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

export const updateDoctorSchema = z.object({
  name: z.string().trim().min(2).optional(),
  specialization: z.string().trim().min(2).optional(),
  phone: phoneSchema,
  fees: positiveNumber.optional(),
  experience: z.string().optional(),
  qualification: z.string().optional(),
  consultationFee: positiveNumber.optional(),
  available: z.boolean().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

// ─── Patient Schemas ───────────────────────────────────────────────────────
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

// ─── Appointment Schemas ───────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  patient: z.string().min(1, 'Patient is required'),
  doctor: z.string().min(1, 'Doctor is required'),
  department: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.string().optional(),
  notes: z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled']).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
});

// ─── Billing Schemas ───────────────────────────────────────────────────────
export const createBillSchema = z.object({
  patient: z.string().min(1, 'Patient is required'),
  service: z.string().min(1, 'Service is required'),
  amount: positiveNumber,
  doctor: z.string().optional(),
  paid: nonNegativeNumber.optional().default(0),
  status: z.enum(['Pending', 'Paid', 'Partial', 'Overdue']).optional().default('Pending'),
  dueDate: z.string().optional(),
});

// ─── Hospital Schemas ──────────────────────────────────────────────────────
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
});

// ─── Test Schemas ──────────────────────────────────────────────────────────
export const createTestSchema = z.object({
  name: z.string().trim().min(2, 'Test name is required'),
  category: z.string().min(1, 'Category is required'),
  department: z.string().min(1, 'Department is required'),
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

// ─── Medicine Schemas ──────────────────────────────────────────────────────
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

// ─── Review Schemas ────────────────────────────────────────────────────────
export const createReviewSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().min(2, 'Comment is required'),
});

// ─── Department Schemas ────────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required'),
  description: z.string().optional(),
  head: z.string().optional(),
  fees_structure: positiveNumber.optional(),
  active: z.boolean().optional(),
});

// ─── Emergency Schemas ─────────────────────────────────────────────────────
export const createEmergencySchema = z.object({
  patientName: z.string().trim().min(2, 'Patient name is required'),
  condition: z.string().min(2, 'Condition is required'),
  severity: z.enum(['Critical', 'Serious', 'Stable']),
  phone: phoneSchema,
  address: z.string().optional(),
});

// ─── Bed Schemas ───────────────────────────────────────────────────────────
export const createBedSchema = z.object({
  bedNumber: z.string().min(1, 'Bed number is required'),
  ward: z.string().min(1, 'Ward is required'),
  bedType: z.string().min(1, 'Bed type is required'),
  dailyRate: positiveNumber,
  floor: z.string().optional(),
  isAC: z.boolean().optional(),
  hospitalId: z.string().optional(),
});

// ─── Facility Schemas ──────────────────────────────────────────────────────
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
});