/** Nursing charts feature — API response types. */
export type NursingChartType = 'Vitals' | 'MAR' | 'InputOutput' | 'WoundDressing';

export interface NursingChart {
  _id?: string;
  patientId?: string;
  patientName?: string;
  admissionId?: string;
  shift?: string;
  recordedByName?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface NursingStats {
  vitals: number;
  mar: number;
  io: number;
  woundDressing: number;
}
