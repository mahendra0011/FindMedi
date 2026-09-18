/** IPD feature barrel. */
export type { IPDBed, IPDAdmission, IPDStats } from './types';
export {
  getBeds,
  getAdmissions,
  getStats,
  createBed,
  createAdmission,
  discharge,
  addVitals,
  addMar,
  addIO,
  addNursingNote,
  addDoctorNote,
} from './api';
export {
  useIPDBeds,
  useIPDAdmissions,
  useIPDStats,
  useAddBed,
  useCreateAdmission,
  useDischarge,
  useAddVitals,
  useAddMar,
  useAddIO,
  useAddNursingNote,
  useAddDoctorNote,
} from './hooks';
