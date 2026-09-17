/**
 * Staff feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { StaffMember, StaffStats } from './types';

export const getAll = (params: { search?: string; department?: string } = {}): Promise<{ staff: StaffMember[] }> => {
  void params;
  return Promise.resolve({ staff: [] });
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

export const markAttendance = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const applyLeave = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const assignShift = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addTraining = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<StaffStats> =>
  Promise.resolve({ total: 0, active: 0, onDuty: 0, onLeave: 0 });
