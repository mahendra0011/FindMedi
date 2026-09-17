/** Housekeeping feature — API response types. */
export type HKStatus = 'Pending' | 'In Progress' | 'Completed' | 'Verified';

export interface HousekeepingTask {
  _id: string;
  room?: string;
  bedNumber?: string;
  ward?: string;
  type?: string;
  priority?: string;
  assignedTo?: string;
  notes?: string;
  status: HKStatus;
  isInfectionCase?: boolean;
  createdAt?: string;
  checklist?: Record<string, boolean>;
  completedAt?: string;
  verified?: boolean;
  verificationRating?: string;
  verificationNotes?: string;
  bedStatusUpdated?: boolean;
}

export interface HousekeepingStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}
