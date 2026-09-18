/** IPD feature — API response types. */
export interface IPDBed {
  _id: string;
  bedNumber: string;
  ward: 'General' | 'Semi-Private' | 'Private' | 'ICU' | 'NICU' | 'PICU' | 'Emergency';
  bedType: string;
  dailyRate: string;
  floor: string;
  isAC: boolean;
  status: 'Available' | 'Occupied' | 'Under Cleaning' | 'Maintenance';
  currentPatientName?: string;
  occupiedSince?: string;
}

export interface IPDAdmission {
  _id: string;
  admissionId: string;
  patientName: string;
  patientId: string;
  bedNumber?: string;
  ward: string;
  primaryDiagnosis: string;
  source: 'OPD' | 'Emergency' | 'Direct' | 'Referral';
  admittingDoctor: string;
  status: 'Admitted' | 'Discharged' | 'Transferred';
  createdAt: string;
  estimatedStay?: string;
  attendantName?: string;
  attendantPhone?: string;
}

export interface IPDStats {
  totalBeds: number;
  available: number;
  occupied: number;
  cleaning: number;
  maintenance: number;
  totalAdmissions: number;
  activePatients: number;
}
