/**
 * Triage feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { TriageEntry, TriageStats } from './types';

export const getAll = (params: { search?: string; triageLevel?: string } = {}): Promise<{ entries: TriageEntry[] }> => {
  void params;
  return Promise.resolve({ entries: [] });
};

export const create = (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const update = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const assign = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addMlc = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addNote = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<TriageStats> =>
  Promise.resolve({ total: 0, immediate: 0, urgent: 0, lessUrgent: 0, active: 0, today: 0, mlc: 0 });
