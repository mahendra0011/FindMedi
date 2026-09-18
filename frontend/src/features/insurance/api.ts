/**
 * Insurance feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { InsuranceClaim, InsuranceClaimForm, InsuranceStats } from './types';

export const getAll = (params: { search?: string } = {}): Promise<{ claims: InsuranceClaim[] }> => {
  void params;
  return Promise.resolve({ claims: [] });
};

export const create = (body: InsuranceClaimForm): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const update = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const preAuth = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const fileClaim = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const settle = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<InsuranceStats> =>
  Promise.resolve({ total: 0, pending: 0, approved: 0, filed: 0, settled: 0, cashless: 0 });
