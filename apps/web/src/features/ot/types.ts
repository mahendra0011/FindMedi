/** OT (Operation Theatre) feature — API response types. */
export type SurgeryStatus =
  | 'Scheduled'
  | 'Pre-Op'
  | 'In Progress'
  | 'Recovery'
  | 'Ward Shifted'
  | 'Completed'
  | 'Cancelled';

export interface CountPair {
  before: number;
  after: number;
  correct?: boolean;
}

export interface RecoveryVitals {
  bp?: string;
  pulse?: string;
  spO2?: string;
  consciousness?: string;
  painLevel?: string;
  notes?: string;
}

export interface Surgery {
  _id: string;
  surgeryName: string;
  patientName: string;
  patientId?: string;
  surgeryType: string;
  anaesthesiaType: string;
  otNumber?: string;
  scheduledDate?: string;
  surgeonName?: string;
  doctorName?: string;
  status: SurgeryStatus;
  notes?: string;
  createdAt: string;
  totalDuration?: number;
  findings?: string;
  postOpInstructions?: string;
  preOpChecklist?: Record<string, boolean>;
  instrumentsCount?: CountPair;
  spongeCount?: CountPair;
  recoveryVitals?: RecoveryVitals;
}

export interface OTStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  today: number;
}

export interface PreOpChecklistItem {
  key: string;
  label: string;
}
