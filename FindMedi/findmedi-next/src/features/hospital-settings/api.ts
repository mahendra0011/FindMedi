/** Hospital settings placeholder */
import type { HospitalSettings } from './types';
export const getHospitalSettings = (): Promise<HospitalSettings> =>
  Promise.resolve({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', licenseNumber: '', website: '', description: '', logo: '', image: '', establishedYear: '', hospitalType: 'Private', bedAvailability: 0, emergency24x7: false });
export const updateHospitalSettings = (_id: string, body: Partial<HospitalSettings>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};
