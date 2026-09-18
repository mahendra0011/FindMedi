/** Doctor patients feature barrel. */
export type { DoctorPatient, DoctorPatientStats } from './types';
export { getDoctorPatients, createDoctorPatient, deleteDoctorPatient } from './api';
export { useDoctorPatients, useCreateDoctorPatient, useDeleteDoctorPatient } from './hooks';
