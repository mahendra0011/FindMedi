import type { BaseEntity } from '@/types/api';
import type { UserRole, UserStatus, ApprovalStatus } from '@/types/enums';

/**
 * Mirrors server/models/User.js — the single User schema handles all roles:
 * patient, doctor, hospital_admin, lab_owner, pharmacy_owner, delivery_boy, etc.
 */
export interface UserSettings {
  emailNotifications: boolean;
  smsAlerts: boolean;
  systemNotifications: boolean;
  weeklyReports: boolean;
  appointmentReminders: boolean;
  labResultEmails: boolean;
  criticalAlerts: boolean;
  adminDigest: boolean;
  doctorScheduleAlerts: boolean;
  patientRecordSharing: boolean;
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  language: string;
  timezone: string;
  defaultDashboard: string;
  twoFactorEnabled: boolean;
  dataSharing: boolean;
  profileVisibility: 'care_team' | 'public' | 'private';
}

export interface Allergy {
  allergen: string;
  reaction?: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  notes?: string;
}

export interface DeliveryBoyDocs {
  aadharFront?: string;
  aadharBack?: string;
  panCard?: string;
  photo?: string;
  drivingLicense?: string;
  rc?: string;
  addressProof?: string;
}

export interface BankDetails {
  accountNumber?: string;
  ifsc?: string;
  accountHolderName?: string;
  upiId?: string;
}

export interface CurrentLocation {
  lat: number | null;
  lng: number | null;
}

export interface WorkingHours {
  availability: 'full-time' | 'part-time';
  startTime: string;
  endTime: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  role: UserRole;
  hospitalId?: string | null;
  facilityId?: string | null;
  facilityType: 'hospital' | 'clinic' | 'lab' | 'pharmacy' | '';
  avatar: string;
  phone: string;
  address: string;
  uhid?: string;
  gender: '' | 'Male' | 'Female' | 'Other';
  bloodGroup: string;
  dateOfBirth?: string;

  // Doctor fields (when role includes 'doctor' or 'clinic_doctor')
  specialization?: string;
  experience?: string;
  qualification?: string;
  licenseNumber?: string;
  consultationFee?: number;

  // Status & verification
  isVerified: boolean;
  status: UserStatus;
  flagged: boolean;
  flagReason: string;
  approvalStatus: ApprovalStatus;

  // 2FA
  twoFactorEnabled: boolean;

  // Google Drive tokens
  driveTokens?: Record<string, unknown> | null;

  // Settings
  settings: UserSettings;

  // Delivery boy fields
  vehicleType?: 'bike' | 'scooter' | 'bicycle' | 'on-foot' | '';
  vehicleNumber?: string;
  drivingLicenseNumber?: string;
  docs?: DeliveryBoyDocs;
  bankDetails?: BankDetails;
  pharmacyId?: string;
  currentLocation?: CurrentLocation;
  isOnline?: boolean;
  deliveryZone?: string[];
  workingHours?: WorkingHours;
  emergencyContact?: EmergencyContact;

  // Allergies (primarily for patients)
  allergies?: Allergy[];
}

/** Shape returned by /auth/login, /auth/me, /auth/verify-otp */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  requiresVerification?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  hospitalId?: string;
  facilityId?: string;
  specialization?: string;
  licenseNumber?: string;
}
