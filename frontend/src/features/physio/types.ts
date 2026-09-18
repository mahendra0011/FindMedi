/** Physiotherapy feature — API response types. */
export type PhysioStatus = 'Referred' | 'Assessed' | 'In Progress' | 'Mid Review' | 'Completed' | 'Discharged';

export interface PhysioAssessment {
  painScale?: string;
  rangeOfMotion?: string;
  strengthTest?: string;
  functionalAssessment?: string;
  objective?: string;
  notes?: string;
}

export interface PhysioPlan {
  therapyType?: string;
  sessionsTotal?: string;
  frequency?: string;
  duration?: string;
  goals?: string;
  precautions?: string;
}

export interface PhysioSession {
  exercises?: string;
  painBefore?: string;
  painAfter?: string;
  progress?: string;
  therapist?: string;
}

export interface PhysioMidReview {
  progress?: string;
  painComparison?: string;
  planAdjustment?: string;
  continueSessions?: boolean;
}

export interface PhysioDischarge {
  outcome?: string;
  homeExercisePlan?: string;
  precautions?: string;
  followUpDate?: string;
  summary?: string;
}

export interface PhysioReferral {
  _id: string;
  patientName: string;
  patientId?: string;
  diagnosis?: string;
  referringDoctor?: string;
  doctorName?: string;
  priority?: string;
  notes?: string;
  status: PhysioStatus;
  createdAt: string;
  sessions?: PhysioSession[];
  assessment?: PhysioAssessment;
  treatmentPlan?: PhysioPlan;
  midReview?: PhysioMidReview;
  dischargeSummary?: PhysioDischarge;
  billingAdded?: boolean;
}

export interface PhysioStats {
  active: number;
  inProgress: number;
  completed: number;
  total: number;
}
