/** OT (Operation Theatre) feature barrel. */
export type { Surgery, SurgeryStatus, OTStats, PreOpChecklistItem, CountPair, RecoveryVitals } from './types';
export {
  getSurgeries,
  getStats,
  createSurgery,
  startPreOp,
  startSurgery,
  completeSurgery,
  recoveryUpdate,
  checklistUpdate,
  shiftToWard,
} from './api';
export {
  useSurgeries,
  useOTStats,
  useCreateSurgery,
  useStartPreOp,
  useStartSurgery,
  useCompleteSurgery,
  useRecoveryUpdate,
  useChecklistUpdate,
  useShiftToWard,
} from './hooks';
