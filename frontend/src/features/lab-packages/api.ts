/**
 * Lab packages feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { LabPackage, LabPackageForm } from './types';

export const getPackages = (): Promise<{ packages: LabPackage[] }> => Promise.resolve({ packages: [] });

export const createPackage = (body: LabPackageForm): Promise<LabPackage> => {
  const { name, description, tests, discount, price } = body;
  return Promise.resolve({
    _id: `pkg-${crypto.randomUUID()}`,
    name,
    description,
    tests,
    discount,
    price,
  });
};

export const updatePackage = (id: string, body: LabPackageForm): Promise<LabPackage> => {
  const { name, description, tests, discount, price } = body;
  return Promise.resolve({ _id: id, name, description, tests, discount, price });
};
