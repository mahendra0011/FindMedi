/** Doctor feature barrel. */
export type { Doctor, WeeklySchedule, ClinicProfileData } from './types';
export {
  getMyDoctor,
  updateDoctor,
  updateDoctorClinicProfile,
  uploadDoctorSignature,
  getAutoConfirm,
  getSlotCapacity,
  updateAutoConfirmSetting,
  updateSlotCapacitySetting,
  updateUserProfile,
} from './api';
export { useMyDoctor, useUpdateDoctor, useUploadDoctorSignature, useAutoConfirmSettings } from './hooks';
