/** Medical records feature — API response types. */
export interface MedicalRecord {
  _id: string;
  createdAt?: string;
  reportUrl?: string;
  doctor?: string;
  doctorId?: string | { specialization?: string };
  doctorName?: string;
  patient?: string;
  type?: string;
  diagnosis?: string;
  date?: string;
  prescription?: string;
  notes?: string;
  attachments?: { url?: string }[];
  fileUrl?: string;
  data?: MedicalRecordData;
}

export interface MedicalRecordData {
  patient?: {
    name?: string;
    age?: string;
    gender?: string;
    phone?: string;
  };
  chiefComplaints?: string;
  diagnosis?: string;
  medications?: Array<string | MedicalRecordMedication>;
  advice?: string;
  followUp?: string;
  fileUrl?: string;
  uploadedFile?: { url?: string; filepath?: string };
  doctor?: { name?: string; specialization?: string };
  status?: string;
  testName?: string;
  labName?: string;
  facilityName?: string;
  tests?: MedicalRecordTest[];
}

export interface MedicalRecordMedication {
  name?: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
}

export interface MedicalRecordTest {
  name?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
}

export interface PatientVisit {
  _id: string;
  doctor: string;
  date: string;
  time?: string;
  department?: string;
  status?: string;
  symptoms?: string;
}

export interface DoctorGroup {
  doctor: string;
  specialization: string;
  records: MedicalRecord[];
}
