/** Emergency feature barrel. */
export type { EmergencyCase, EmergencyNote } from './types';
export { emergencyApi } from './api';
export {
  useEmergencies,
  useAcceptEmergency,
  useRejectEmergency,
  useUpdateEmergencyStatus,
  useAddEmergencyNote,
  useCreateEmergency,
} from './hooks';
