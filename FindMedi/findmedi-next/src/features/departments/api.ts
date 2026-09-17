/**
 * Departments feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { Department, DepartmentForm } from './types';

export const getDepartments = (): Promise<Department[]> => Promise.resolve([]);

export const createDepartment = (body: DepartmentForm): Promise<Department> => {
  const { name, description, head, active, fees_structure } = body;
  return Promise.resolve({
    _id: `dept-${crypto.randomUUID()}`,
    name,
    description,
    head,
    active,
    fees_structure,
  });
};

export const updateDepartment = (id: string, body: DepartmentForm): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const deleteDepartment = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};
