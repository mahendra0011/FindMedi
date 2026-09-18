/**
 * Mental health feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { MHCase, MHStats } from './types';

export const getCases = (params: { search?: string; status?: string } = {}): Promise<{ cases: MHCase[] }> => {
  void params;
  return Promise.resolve({ cases: [] });
};

export const createCase = (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const addAssessment = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addMse = (id: string, body: Record<string, string>): Promise<Record<string, unknown>> => {
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

export const updateConfidentiality = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<MHStats> =>
  Promise.resolve({ active: 0, critical: 0, followUp: 0, total: 0 });
