/** Mental health feature — API response types. */
export type MHStatus = 'Active' | 'Under Treatment' | 'Follow-up' | 'Discharged' | 'Referred';
export type MHRisk = 'Low' | 'Medium' | 'High';

export interface MHAssessment {
  presentingComplaint?: string;
  history?: string;
  riskLevel?: string;
  diagnosis?: string;
  icdCode?: string;
}

export interface MHTreatmentPlan {
  treatmentType?: string;
  therapyType?: string;
  frequency?: string;
  duration?: string;
  goals?: string;
  medications?: string;
}

export interface MHSession {
  therapyType?: string;
  notes?: string;
  patientResponse?: string;
  nextSession?: string;
}

export interface MHConfidentiality {
  consentGiven?: boolean;
  shareWithFamily?: boolean;
  shareWithDoctor?: boolean;
  accessLevel?: string;
  notes?: string;
}

export interface MHCase {
  _id: string;
  patientName: string;
  source?: string;
  diagnosis?: string;
  riskLevel?: string;
  notes?: string;
  status: MHStatus;
  createdAt?: string;
  assessment?: MHAssessment;
  mse?: Record<string, string>;
  treatmentPlan?: MHTreatmentPlan;
  sessions?: MHSession[];
  confidentiality?: MHConfidentiality;
}

export interface MHStats {
  active: number;
  critical: number;
  followUp: number;
  total: number;
}
