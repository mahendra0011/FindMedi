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
  role: z.enum(['patient', 'doctor', 'hospital_admin', 'technician']).optional().default('patient'),
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
  role: z.enum(['superadmin', 'hospital_admin', 'doctor', 'clinic_doctor', 'patient', 'lab_owner', 'lab_receptionist', 'lab_technician', 'pathologist', 'pharmacy_owner', 'pharmacist', 'nurse', 'radiologist', 'dietitian', 'physiotherapist', 'counselor', 'accountant', 'security', 'technician', 'helper', 'delivery_boy']).optional(),
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
  doctorId: z.string().optional(),
  department: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  type: z.string().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  priority: z.string().optional(),
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

// ─── Test Schemas ──────────────────────────────────────────────────────────
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

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(2).optional(),
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

export const updateBedSchema = z.object({
  bedNumber: z.string().optional(),
  ward: z.string().optional(),
  bedType: z.string().optional(),
  dailyRate: positiveNumber.optional(),
  floor: z.string().optional(),
  isAC: z.boolean().optional(),
  status: z.string().optional(),
});

// ─── Record Schemas ─────────────────────────────────────────────────────────
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

// ─── Support Ticket Schemas ──────────────────────────────────────────────────
// ─── Lab Order Schema ──────────────────────────────────────────────────────
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

// ─── Medicine Schema ──────────────────────────────────────────────────────
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

// ─── Housekeeping Schemas ────────────────────────────────────────────────────
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

// ─── Leave Request Schemas ───────────────────────────────────────────────────
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

// ─── Payment Schemas ─────────────────────────────────────────────────────────
export const createPaymentSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  patient_name: z.string().optional(),
  amount: positiveNumber,
  method: z.string().optional(),
  invoice_id: z.string().optional(),
  description: z.string().optional(),
  appointment_id: z.string().optional(),
  bill_id: z.string().optional(),
  status: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  method: z.string().optional(),
  transaction_id: z.string().optional(),
  description: z.string().optional(),
});

export const refundPaymentSchema = z.object({
  refund_amount: z.number().nonnegative('Refund amount must be non-negative'),
});

// ─── Blood Bank Schemas ─────────────────────────────────────────────────────
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

// ─── Diet Order Schema ──────────────────────────────────────────────────────
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

// ─── Insurance Schemas ──────────────────────────────────────────────────────
export const createInsuranceSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  insuranceProvider: z.string().min(1, 'Insurance provider is required'),
  policyNumber: z.string().min(1, 'Policy number is required'),
  insuranceId: z.string().optional(),
  tpaName: z.string().optional(),
  tpaContact: z.string().optional(),
  coverageType: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  estimatedCost: z.number().optional(),
  admissionId: z.string().optional(),
});

// ─── Inventory Schemas ──────────────────────────────────────────────────────
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

// ─── IPD / Admission Schemas ────────────────────────────────────────────────
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

// ─── OT Surgery Schema ──────────────────────────────────────────────────────
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

// ─── Token Schema ──────────────────────────────────────────────────────────
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

// ─── Triage Schema ──────────────────────────────────────────────────────────
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

// ─── Radiology Order Schema ─────────────────────────────────────────────────
export const createRadiologyOrderSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  modality: z.string().min(1, 'Modality is required'),
  bodyPart: z.string().min(1, 'Body part is required'),
  clinicalHistory: z.string().optional(),
  priority: z.string().optional(),
});

// ─── Physiotherapy Referral Schema ──────────────────────────────────────────
export const createPhysioReferralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
});

// ─── Mental Health Referral Schema ──────────────────────────────────────────
export const createMentalHealthReferralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  patientName: z.string().optional(),
  referralSource: z.string().optional(),
  referrerName: z.string().optional(),
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

// ─── Announcement Schema ──────────────────────────────────────────────────
export const createAnnouncementSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  message: z.string().min(2, 'Message is required'),
  priority: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
});

// ─── Category Schemas ────────────────────────────────────────────────────
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

// ─── Staff Schemas ─────────────────────────────────────────────────────────
export const createStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  salary: z.number().optional(),
  hospitalId: z.string().optional(),
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

// ─── Clinic Schemas ──────────────────────────────────────────────────────
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

export const createClinicStaffSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  email: emailSchema,
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
});

export const updateClinicStaffSchema = z.object({
  name: z.string().optional(),
  email: emailSchema.optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
});

// ─── Notification Schema ────────────────────────────────────────────────
export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.string().optional(),
  read: z.boolean().optional(),
  date: z.string().optional(),
});