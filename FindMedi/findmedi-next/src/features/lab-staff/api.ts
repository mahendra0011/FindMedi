/**
 * Lab staff feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { LabStaffMember, LabStaffForm } from './types';

export const getStaff = (): Promise<LabStaffMember[]> => Promise.resolve([]);

export const createStaff = (body: LabStaffForm): Promise<LabStaffMember> => {
  const { name, role, email, phone, department, qualification, status, joinDate } = body;
  return Promise.resolve({
    _id: `ls-${crypto.randomUUID()}`,
    name,
    role,
    email,
    phone,
    department,
    qualification,
    status,
    joinDate,
  });
};

export const updateStaff = (id: string, body: LabStaffForm): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const deleteStaff = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
