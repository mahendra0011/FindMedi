import type { BaseEntity } from '@/types/api';
import type { FacilityStatus, SubscriptionPlan } from '@/types/enums';

export interface HospitalFees {
  chat: number;
  video: number;
  offline: number;
  home_visit: number;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number];
}

export interface InsuranceAccepted {
  provider: string;
  planType: string;
}

export interface WorkingHours {
  weekdays: string;
  saturday: string;
  sunday: string;
}

export interface HospitalSettings {
  autoConfirmAppointment: boolean;
}

export interface Hospital extends BaseEntity {
  hospitalId?: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  licenseNumber: string;
  website: string;
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
  appointmentFees: HospitalFees;
  bedAvailability: number;
  ambulanceService: boolean;
  image: string;
  amenities: string[];
  socialLinks: SocialLinks;
  location?: GeoLocation;
  insuranceAccepted: InsuranceAccepted[];
  paymentModes: string[];
  settings: HospitalSettings;
  workingHours: WorkingHours;
}
