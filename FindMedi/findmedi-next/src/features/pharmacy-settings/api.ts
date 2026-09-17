/** Pharmacy settings placeholder */
import type { PharmacySettings } from './types';
export const getPharmacySettings = (): Promise<PharmacySettings> =>
  Promise.resolve({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', licenseNumber: '', website: '', description: '', logo: '', image: '', establishedYear: '', workingHours: '8:00 AM - 10:00 PM' });
export const updatePharmacySettings = (_id: string, body: Partial<PharmacySettings>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};
