/**
 * Physiotherapy feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { PhysioReferral, PhysioStats } from './types';

export const getReferrals = (
  params: { search?: string; status?: string } = {},
): Promise<{ referrals: PhysioReferral[] }> => {
  void params;
  return Promise.resolve({ referrals: [] });
};

export const createReferral = (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const startAssessment = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const createPlan = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addSession = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const midReview = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const discharge = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addToBilling = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<PhysioStats> =>
  Promise.resolve({ active: 0, inProgress: 0, completed: 0, total: 0 });
