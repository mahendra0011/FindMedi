/** Lab settings placeholder */
import type { LabSettings } from './types';
export const getLabSettings = (): Promise<LabSettings> =>
  Promise.resolve({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', licenseNumber: '', website: '', description: '', logo: '', image: '', establishedYear: '' });
export const updateLabSettings = (_id: string, body: Partial<LabSettings>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};
