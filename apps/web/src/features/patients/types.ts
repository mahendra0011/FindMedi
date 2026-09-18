/** Doctor patients feature — API response types. */
export interface DoctorPatient {
  _id: string;
  name: string;
  age?: number | string;
  gender?: string;
  disease?: string;
  doctor?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  status?: string;
  admitted?: string;
}

export interface DoctorPatientStats {
  total: number;
  active: number;
  discharged: number;
  critical: number;
}
