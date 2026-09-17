/** Clinic settings placeholder */
import type { ClinicSettings } from './types';
export const getClinicSettings = (): Promise<ClinicSettings> =>
  Promise.resolve({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', licenseNumber: '', description: '', website: '', logo: '', image: '', establishedYear: '', specialties: [] });
export const updateClinicSettings = (_id: string, body: Partial<ClinicSettings>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};
