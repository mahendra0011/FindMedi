/**
 * Medical records feature — API wrappers.
 * Reads through the prescriptions (records) endpoint group.
 */
import { prescriptions, appointments } from '@/lib/api';
import type { MedicalRecord, PatientVisit } from './types';
import type { Appointment } from '@/types/models/appointment';

export const getRecords = async (params: { search?: string; type?: string } = {}): Promise<MedicalRecord[]> => {
  const res = (await prescriptions.get({
    ...(params.search ? { search: params.search } : {}),
    ...(params.type ? { type: params.type } : {}),
  })) as unknown;
  if (Array.isArray(res)) return res as MedicalRecord[];
  const wrapped = res as { data?: MedicalRecord[]; records?: MedicalRecord[] };
  return wrapped.data ?? wrapped.records ?? [];
};

export const deleteRecord = (id: string): Promise<{ message: string }> => prescriptions.delete(id);

export const createRecord = (body: Record<string, unknown>): Promise<Record<string, unknown>> =>
  prescriptions.create(body) as unknown as Promise<Record<string, unknown>>;

export const downloadRecordPdf = (recordId: string): Promise<void> =>
  prescriptions.downloadPdf(recordId);

export const getPatientVisits = async (): Promise<PatientVisit[]> => {
  const list: Appointment[] = await appointments.get();
  return list.map((apt) => ({
    _id: apt._id,
    doctor: typeof apt.doctor === 'string' ? apt.doctor : (apt.doctor?.name ?? ''),
    date: apt.date,
    time: apt.time,
    department: apt.department,
    status: apt.status,
    symptoms: apt.symptoms,
  }));
};
