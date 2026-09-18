/** Departments feature barrel. */
export type { Department, DepartmentForm } from './types';
export { getDepartments, createDepartment, updateDepartment, deleteDepartment } from './api';
export { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from './hooks';
