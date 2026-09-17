/** Triage feature — API response types. */
export type TriageLevel = 'P1-Immediate' | 'P2-Urgent' | 'P3-Less Urgent' | 'P4-Non Urgent' | 'P5-Deceased';

export interface TriageVitals {
  bpSystolic?: string;
  bpDiastolic?: string;
  heartRate?: string;
  spO2?: string;
  temperature?: string;
}

export interface TriageEntry {
  _id: string;
  patientName: string;
  age?: string;
  gender?: string;
  phone?: string;
  arrivalMode?: string;
  broughtBy?: string;
  chiefComplaint?: string;
  triageLevel: TriageLevel;
  triageNotes?: string;
  status: string;
  createdAt: string;
  vitals?: TriageVitals;
  assignedDoctorName?: string;
  isMLCO?: boolean;
  mlcNumber?: string;
  mlc?: { caseType?: string };
}

export interface TriageStats {
  total: number;
  immediate: number;
  urgent: number;
  lessUrgent: number;
  active: number;
  today: number;
  mlc: number;
}
