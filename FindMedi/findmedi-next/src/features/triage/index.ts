/** Triage feature barrel. */
export type { TriageEntry, TriageLevel, TriageStats, TriageVitals } from './types';
export { getAll, getStats, create, update, assign, addMlc, addNote } from './api';
export {
  useTriageEntries,
  useTriageStats,
  useCreateTriage,
  useAssignDoctor,
  useMarkMlc,
  useAddTriageNote,
  useDischargeTriage,
} from './hooks';
