/**
 * OT (Operation Theatre) feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { Surgery, OTStats } from './types';

export const getSurgeries = (params: { search?: string; status?: string } = {}): Promise<{ surgeries: Surgery[] }> => {
  void params;
  return Promise.resolve({ surgeries: [] });
};

export const createSurgery = (body: {
  patientName: string;
  patientId: string;
  surgeryName: string;
  surgeryType: string;
  anaesthesiaType: string;
  otNumber: string;
  scheduledDate: string;
  surgeonName: string;
  notes: string;
}): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const startPreOp = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const startSurgery = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const completeSurgery = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const recoveryUpdate = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const checklistUpdate = (
  id: string,
  body: { checklist: Record<string, boolean> },
): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const shiftToWard = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const getStats = (): Promise<OTStats> =>
  Promise.resolve({ total: 0, scheduled: 0, inProgress: 0, completed: 0, today: 0 });
