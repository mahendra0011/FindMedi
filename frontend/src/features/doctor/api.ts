/**
 * Doctor feature — API wrappers.
 */
import { doctors, auth } from '@/lib/api';
import type { Doctor } from '@/types/models/doctor';
import type { ClinicProfileData } from './types';

/** Find the logged-in doctor's directory record by email, falling back to name match. */
export const getMyDoctor = async (email?: string, name?: string): Promise<Doctor | null> => {
  const list = await doctors.get({});
  return (
    list.find((d) => (email ? d.email === email : false)) ??
    list.find((d) => (name ? (d.name ?? '').includes(name) : false)) ??
    null
  );
};

export const updateDoctor = (id: string, body: Partial<Doctor>): Promise<Doctor> =>
  doctors.update(id, body);

export const updateDoctorClinicProfile = (id: string, profile: ClinicProfileData): Promise<Doctor> =>
  doctors.update(id, { clinicProfile: profile } as unknown as Partial<Doctor>);

export const uploadDoctorSignature = (id: string, file: File): Promise<{ url: string }> =>
  doctors.uploadSignature(id, file);

export const getAutoConfirm = (): Promise<Record<string, unknown>> => doctors.getMyAutoConfirm();

export const getSlotCapacity = (): Promise<{ maxBookingsPerSlot: number }> => doctors.getMySlotCapacity();

export const updateAutoConfirmSetting = (id: string, value: boolean): Promise<Doctor> =>
  doctors.updateAutoConfirm(id, value);

export const updateSlotCapacitySetting = (n: number): Promise<Record<string, unknown>> =>
  doctors.updateMySlotCapacity(n);

export const updateUserProfile = (body: { phone?: string; address?: string }): Promise<unknown> =>
  auth.updateProfile(body);
