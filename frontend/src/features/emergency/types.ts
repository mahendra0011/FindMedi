/** Emergency feature — API response types. */
export interface EmergencyNote {
  text?: string;
  doctorName?: string;
  timestamp?: string;
}

export interface EmergencyCase {
  _id: string;
  patientId?: string;
  severity?: string;
  status: string;
  condition?: string;
  patientName?: string;
  phone?: string;
  createdAt?: string;
  assignedDoctorName?: string;
  notes?: EmergencyNote[];
}
