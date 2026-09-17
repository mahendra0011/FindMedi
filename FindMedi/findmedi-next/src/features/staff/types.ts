/** Staff feature — API response types. */
export interface AttendanceEntry {
  date?: string;
  status: string;
}

export interface LeaveEntry {
  type: string;
  startDate?: string;
  endDate?: string;
  approved?: boolean;
}

export interface TrainingEntry {
  course: string;
  date?: string;
  expiryDate?: string;
  provider?: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
  employeeId?: string;
  joiningDate?: string;
  salary?: string;
  status: string;
  shift?: string;
  attendance?: AttendanceEntry[];
  leaves?: LeaveEntry[];
  trainings?: TrainingEntry[];
}

export interface StaffStats {
  total: number;
  active: number;
  onDuty: number;
  onLeave: number;
}
