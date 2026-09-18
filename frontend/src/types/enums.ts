/**
 * Enum mirrors the Mongoose User.role enum from server/models/User.js.
 * Used for role-based access control throughout the Next.js app.
 */
export type UserRole =
  | 'superadmin'
  | 'hospital_admin'
  | 'doctor'
  | 'clinic_doctor'
  | 'patient'
  | 'lab_owner'
  | 'lab_receptionist'
  | 'lab_technician'
  | 'pathologist'
  | 'pharmacy_owner'
  | 'pharmacist'
  | 'nurse'
  | 'radiologist'
  | 'dietitian'
  | 'physiotherapist'
  | 'counselor'
  | 'accountant'
  | 'security'
  | 'technician'
  | 'helper'
  | 'delivery_boy';

/** Dashboard roles that get their own route group in (dashboard)/ */
export const DASHBOARD_ROLES: UserRole[] = [
  'hospital_admin',
  'doctor',
  'clinic_doctor',
  'patient',
  'lab_owner',
  'pharmacy_owner',
  'delivery_boy',
  'superadmin',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  hospital_admin: 'Hospital Admin',
  doctor: 'Doctor',
  clinic_doctor: 'Clinic Doctor',
  patient: 'Patient',
  lab_owner: 'Lab Owner',
  lab_receptionist: 'Lab Receptionist',
  lab_technician: 'Lab Technician',
  pathologist: 'Pathologist',
  pharmacy_owner: 'Pharmacy Owner',
  pharmacist: 'Pharmacist',
  nurse: 'Nurse',
  radiologist: 'Radiologist',
  dietitian: 'Dietitian',
  physiotherapist: 'Physiotherapist',
  counselor: 'Counselor',
  accountant: 'Accountant',
  security: 'Security',
  technician: 'Technician',
  helper: 'Helper',
  delivery_boy: 'Delivery Partner',
};

/** Facility types from server/models/Facility.js */
export type FacilityType = 'hospital' | 'clinic' | 'lab' | 'pharmacy';

/** Facility approval status from server models */
export type FacilityStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/** Appointment status from server/models/Appointment.js */
export type AppointmentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Cancelled'
  | 'Completed'
  | 'In Queue'
  | 'Serving'
  | 'Missed';

/** Appointment type */
export type AppointmentType = 'Consultation' | 'Follow-up' | 'Check-up' | 'Emergency';

/** Appointment mode (how the patient meets the doctor) */
export type AppointmentMode = 'chat' | 'video' | 'offline' | 'home_visit' | 'home';

/** Appointment priority */
export type AppointmentPriority = 'Normal' | 'Urgent' | 'Emergency';

/** Billing / invoice status */
export type BillingStatus = 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'Cancelled' | 'Refunded';

/** Payment method */
export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Cheque' | 'Insurance' | 'Online' | 'Other';

/** Prescription status */
export type PrescriptionStatus = 'Active' | 'Dispensed' | 'Partially Dispensed' | 'Cancelled';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

/** Medication route */
export type MedicationRoute =
  | 'Oral'
  | 'IV'
  | 'IM'
  | 'Topical'
  | 'Sublingual'
  | 'Inhalation'
  | 'Other';

/** User account status */
export type UserStatus = 'active' | 'blocked';

/** User approval status (for doctors/clinics pending admin approval) */
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

/** Subscription plans for facilities */
export type SubscriptionPlan = 'free' | 'basic' | 'premium';

/** Density setting */
export type Density = 'compact' | 'comfortable' | 'spacious';

/** Theme mode */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Theme preset */
export type ThemePreset = 'default' | 'calm' | 'sage' | 'sky' | 'blush';
