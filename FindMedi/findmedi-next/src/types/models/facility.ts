import type { BaseEntity } from '@/types/api';
import type { FacilityType, FacilityStatus, SubscriptionPlan } from '@/types/enums';

export interface FacilityFees {
  chat: number;
  video: number;
  offline: number;
  home_visit: number;
}

export interface Facility extends BaseEntity {
  facilityId?: string;
  name: string;
  slug: string;
  type: FacilityType;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  licenseNumber: string;
  logo: string;
  description: string;
  specialties: string[];
  status: FacilityStatus;
  rejectionReason: string;
  rating: number;
  reviewsCount: number;
  subscriptionPlan: SubscriptionPlan;
  establishedYear?: number;
  totalDoctors: number;
  accreditations: string[];
  hospitalType: string;
  emergency24x7: boolean;
  emergencySupport: boolean;
  refundOnMissedOrCancelled: boolean;
  appointmentModes: string[];
  appointmentFees: FacilityFees;
  bedAvailability: number;
  ambulanceService: boolean;
  image: string;
  // Lab-specific
  nablNumber?: string;
  aerbNumber?: string;
  workingHours?: string;
  pathologistName?: string;
  pathologistQualification?: string;
  radiologistName?: string;
  radiologistQualification?: string;
  cardiologistName?: string;
  cardiologistQualification?: string;
  technicianName?: string;
}
