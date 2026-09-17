/**
 * Doctor feature — type re-exports.
 */
export type { Doctor, WeeklySchedule } from '@/types/models/doctor';

export interface ClinicProfileData {
  clinic_name?: string;
  clinic_address?: string;
  clinic_license?: string;
  established_year?: number;
  clinic_timing?: Record<string, string>;
  clinic_facilities?: string[];
  clinic_treatments?: string[];
  clinic_insurance?: string[];
}
