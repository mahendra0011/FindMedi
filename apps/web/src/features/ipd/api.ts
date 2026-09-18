/**
 * IPD feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { IPDBed, IPDAdmission, IPDStats } from './types';

export const getBeds = (params: { ward?: string } = {}): Promise<{ beds: IPDBed[] }> => {
  void params;
  return Promise.resolve({ beds: [] });
};

export const createBed = (bed: {
  bedNumber: string;
  ward: string;
  bedType: string;
  dailyRate: string;
  floor: string;
  isAC: boolean;
}): Promise<Record<string, unknown>> => {
  void bed;
  return Promise.resolve({});
};

export const getAdmissions = (params: { search?: string } = {}): Promise<{ admissions: IPDAdmission[] }> => {
  void params;
  return Promise.resolve({ admissions: [] });
};

export const createAdmission = (admission: {
  patientName: string;
  patientId: string;
  bedId?: string;
  primaryDiagnosis: string;
  source: string;
  attendantName: string;
  attendantPhone: string;
  estimatedStay: string;
}): Promise<Record<string, unknown>> => {
  void admission;
  return Promise.resolve({});
};

export const discharge = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addVitals = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addMar = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addIO = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addNursingNote = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addDoctorNote = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<IPDStats> =>
  Promise.resolve({
    totalBeds: 0,
    available: 0,
    occupied: 0,
    cleaning: 0,
    maintenance: 0,
    totalAdmissions: 0,
    activePatients: 0,
  });
