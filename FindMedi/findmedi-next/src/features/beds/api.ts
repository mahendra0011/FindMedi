/**
 * Bed management feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { BedItem, BedForm, BedStats } from './types';

export const getBeds = (params: { ward?: string; status?: string } = {}): Promise<BedItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getBedStats = (): Promise<BedStats> =>
  Promise.resolve({ total: 0, available: 0, occupied: 0, maintenance: 0 });

export const createBed = (body: BedForm): Promise<BedItem> => {
  const { bedNumber, ward, bedType, dailyRate, floor, isAC } = body;
  return Promise.resolve({
    _id: `bed-${crypto.randomUUID()}`,
    bedNumber,
    ward,
    bedType,
    dailyRate,
    floor,
    isAC,
    status: 'Available',
  });
};

export const updateBed = (id: string, body: BedForm): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const deleteBed = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
