/**
 * Doctor patients feature — API wrappers.
 * Uses the real users endpoint group.
 */
import { users } from '@/lib/api';
import type { DoctorPatient } from './types';

export const getDoctorPatients = async (params: { search?: string; status?: string } = {}): Promise<DoctorPatient[]> => {
  const res = await users.get({
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
  return res as unknown as DoctorPatient[];
};

export const createDoctorPatient = (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
  users.create(body as unknown as Partial<import('@/types/models/user').User>) as unknown as Promise<
    Record<string, unknown>
  >;

export const deleteDoctorPatient = (id: string): Promise<{ message: string }> => users.delete(id);
