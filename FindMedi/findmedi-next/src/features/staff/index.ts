/** Staff feature barrel. */
export type { StaffMember, StaffStats, AttendanceEntry, LeaveEntry, TrainingEntry } from './types';
export { getAll, getStats, create, update, markAttendance, applyLeave, assignShift, addTraining } from './api';
export {
  useStaffList,
  useStaffStats,
  useCreateStaff,
  useMarkAttendance,
  useApplyLeave,
  useAssignShift,
  useAddTraining,
} from './hooks';
