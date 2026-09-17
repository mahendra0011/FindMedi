/** OPD registration feature — API response types. */
export interface OPDPatient {
  _id: string;
  name: string;
  uhid?: string;
  phone?: string;
  bloodGroup?: string;
  age?: string;
  gender?: string;
  address?: string;
  dateOfBirth?: string;
}

export interface OPDToken {
  _id: string;
  tokenNumber?: string;
  patientName?: string;
  patientId?: string;
  uhid?: string;
  doctorName?: string;
  status?: string;
  department?: string;
  estimatedWaitTime?: number;
  queuePosition?: number;
  priority?: string;
  type?: string;
  createdAt?: string;
}

export interface TokenStats {
  waiting: number;
  inConsultation: number;
  completed: number;
  skipped: number;
  total: number;
}

export interface RegStats {
  total: number;
  today: number;
  newThisMonth: number;
}
