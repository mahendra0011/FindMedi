import type { BaseEntity } from '@/types/api';

export interface DoctorFees {
  chat: number;
  video: number;
  offline: number;
  home_visit: number;
}

export interface WeeklySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface LeaveBalance {
  sick: number;
  casual: number;
  earned: number;
  personal: number;
  maternity: number;
}

export interface Doctor extends BaseEntity {
  doctorId?: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  patients: number;
  available: boolean;
  phone: string;
  email: string;
  initials: string;
  department: string;
  consultation_fees: number;
  location: string;
  profile_photo: string;
  qualifications: string;
  bio: string;
  time_slots: string[];
  weekly_schedule: WeeklySchedule;
  leaves: string[];
  leaveBalance: LeaveBalance;
  approved: boolean;
  user_id?: string;
  hospitalId?: string;
  facilityId?: string;
  facilityType: string;
  reviews_count: number;
  signatureUrl: string;
  doctor_type: 'hospital' | 'clinic';
  languages: string[];
  practice_type: 'private' | 'corporate' | '';
  areas_of_expertise: string[];
  services_offered: string[];
  surgeries_procedures: string[];
  education: Array<Record<string, unknown>>;
  work_experience: Array<Record<string, unknown>>;
  memberships: string[];
  awards: string[];
  registrations: Record<string, unknown>;
  clinic_reception_phone: string;
  walk_in_accepted: boolean;
  in_house_pharmacy: boolean;
  in_house_lab: boolean;
  admission_available: boolean;
  emergency_consultation: boolean;
  emergencySupport: boolean;
  refundOnMissedOrCancelled: boolean;
  appointmentModes: string[];
  appointmentFees: DoctorFees;
  chat_fee: number;
  video_fee: number;
  offline_fee: number;
  home_visit_fee: number;
  emergency_fee: number;
  surgery_available: boolean;
  home_visit: boolean;
}
