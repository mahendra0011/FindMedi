/** Medical records feature barrel. */
export type {
  MedicalRecord,
  MedicalRecordData,
  MedicalRecordMedication,
  MedicalRecordTest,
  PatientVisit,
  DoctorGroup,
} from './types';
export { getRecords, deleteRecord, createRecord, downloadRecordPdf, getPatientVisits } from './api';
export { useMedicalRecords, useDeleteRecord, useCreateRecord, useDownloadRecordPdf, usePatientRecords } from './hooks';
