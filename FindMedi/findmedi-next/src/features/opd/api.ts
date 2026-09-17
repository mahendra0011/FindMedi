/**
 * OPD registration feature — API wrappers.
 * Uses the real users + tokens endpoint groups.
 */
import { users, tokens } from '@/lib/api';
import type { OPDPatient, OPDToken, TokenStats, RegStats } from './types';

export const getPatients = async (params: { search?: string } = {}): Promise<OPDPatient[]> => {
  const res = await users.get({ search: params.search ?? '' });
  return res as unknown as OPDPatient[];
};

export const createPatient = (body: {
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  bloodGroup: string;
  uhid: string;
  email?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}): Promise<unknown> => users.create(body as unknown as Partial<import('@/types/models/user').User>);

export const getTokens = async (): Promise<OPDToken[]> => {
  const res = await tokens.get({});
  return res as unknown as OPDToken[];
};

export const generateToken = (body: {
  patientName: string;
  patientId: string;
  uhid?: string;
}): Promise<Record<string, unknown>> => tokens.generate(body);

export const getTokenQueue = async (params: { search?: string; department?: string } = {}): Promise<OPDToken[]> => {
  const res = await tokens.get({ search: params.search ?? '', department: params.department ?? '' });
  return res as unknown as OPDToken[];
};

export const callToken = (id: string): Promise<Record<string, unknown>> => tokens.call(id);

export const startTokenConsultation = (id: string): Promise<Record<string, unknown>> =>
  tokens.startConsultation(id);

export const completeToken = (id: string): Promise<Record<string, unknown>> => tokens.complete(id);

export const skipToken = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> =>
  tokens.skip(id, body);

export const recallToken = (id: string): Promise<Record<string, unknown>> => tokens.recall(id);

export const getTokenStats = async (): Promise<TokenStats> => {
  const res = await tokens.getStats();
  return {
    waiting: Number(res.waiting ?? 0),
    inConsultation: Number(res.inConsultation ?? 0),
    completed: Number(res.completed ?? 0),
    skipped: Number(res.skipped ?? 0),
    total: Number(res.total ?? 0),
  };
};

export const searchPatients = async (q: string): Promise<OPDPatient[]> => {
  const res = await users.get({ search: q });
  return res as unknown as OPDPatient[];
};

export const getRegStats = (): Promise<RegStats> =>
  Promise.resolve({ total: 0, today: 0, newThisMonth: 0 });
