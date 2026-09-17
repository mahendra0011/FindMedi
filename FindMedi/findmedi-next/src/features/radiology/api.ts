/**
 * Radiology feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { RadiologyOrder, RadiologyStats } from './types';

export const getOrders = (
  params: { search?: string; modality?: string; status?: string } = {},
): Promise<{ orders: RadiologyOrder[] }> => {
  void params;
  return Promise.resolve({ orders: [] });
};

export const createOrder = (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const schedule = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const startScan = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const completeScan = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const submitReport = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const deliver = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const getStats = (): Promise<RadiologyStats> =>
  Promise.resolve({ total: 0, pending: 0, inProgress: 0, completed: 0, reported: 0 });
