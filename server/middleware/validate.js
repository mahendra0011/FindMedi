import { z } from 'zod';

/**
 * Zod-based request validation middleware.
 * Usage: router.post('/login', validate(loginSchema), handler)
 */
export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({
        message: 'Validation failed',
        errors: messages,
      });
    }
    next(error);
  }
};

// ─── Auth Schemas ──────────────────────────────────────────────────────────
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
    role: z.string().optional(),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    role: z.enum(['patient', 'doctor', 'admin']).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  }),
});

// ─── User Schemas ──────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['patient', 'doctor', 'admin', 'staff']),
    phone: z.string().optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.string().optional(),
    specialization: z.string().optional(),
    experience: z.string().optional(),
    qualification: z.string().optional(),
    consultationFee: z.number().positive().optional(),
  }),
});

// ─── Doctor Schemas ────────────────────────────────────────────────────────
export const createDoctorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    specialization: z.string().min(2, 'Specialization is required'),
    phone: z.string().optional(),
    fees: z.number().positive().optional(),
    experience: z.string().optional(),
    qualification: z.string().optional(),
  }),
});

// ─── Patient Schemas ───────────────────────────────────────────────────────
export const createPatientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    age: z.number().positive('Age must be positive'),
    gender: z.enum(['Male', 'Female', 'Other']),
    disease: z.string().optional(),
    phone: z.string().optional(),
    bloodGroup: z.string().optional(),
  }),
});

// ─── Appointment Schemas ───────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  body: z.object({
    patient: z.string().min(1, 'Patient is required'),
    doctor: z.string().min(1, 'Doctor is required'),
    department: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    time: z.string().min(1, 'Time is required'),
    type: z.string().optional(),
  }),
});

// ─── Billing Schemas ───────────────────────────────────────────────────────
export const createBillSchema = z.object({
  body: z.object({
    patient: z.string().min(1, 'Patient is required'),
    service: z.string().min(1, 'Service is required'),
    amount: z.number().positive('Amount must be positive'),
    doctor: z.string().optional(),
  }),
});

// ─── Hospital Schemas ──────────────────────────────────────────────────────
export const registerHospitalSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Hospital name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    address: z.string().min(5, 'Address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    licenseNumber: z.string().min(1, 'License number is required'),
    description: z.string().optional(),
    specialties: z.array(z.string()).optional(),
  }),
});

// ─── Test Schemas ──────────────────────────────────────────────────────────
export const createTestSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Test name is required'),
    category: z.string().min(1, 'Category is required'),
    department: z.string().min(1, 'Department is required'),
    price: z.number().positive('Price must be positive'),
    mrp: z.number().positive('MRP must be positive').optional(),
    description: z.string().optional(),
    preparation: z.string().optional(),
    reportTime: z.string().optional(),
    prescriptionReq: z.boolean().optional(),
    homeCollection: z.boolean().optional(),
  }),
});

// ─── Medicine Schemas ──────────────────────────────────────────────────────
export const createMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Medicine name is required'),
    category: z.string().min(1, 'Category is required'),
    price: z.number().positive('Price must be positive'),
    stock: z.number().int().nonnegative('Stock must be non-negative'),
    manufacturer: z.string().optional(),
    expiryDate: z.string().optional(),
    requiresPrescription: z.boolean().optional(),
  }),
});