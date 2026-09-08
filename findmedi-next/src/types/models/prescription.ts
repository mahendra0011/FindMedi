import type { BaseEntity } from '@/types/api';
import type { PrescriptionStatus, VerificationStatus, MedicationRoute } from '@/types/enums';

export interface Medicine {
  medicineId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: MedicationRoute;
  instructions?: string;
  quantity: number;
  isDispensed: boolean;
  dispensedAt?: string;
  dispensedBy?: string;
}

export interface Prescription extends BaseEntity {
  prescriptionId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  medicines: Medicine[];
  diagnosis?: string;
  clinicalNotes?: string;
  status: PrescriptionStatus;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  isEmergency: boolean;
  prescriptionFile?: string;
  hospitalId?: string;
  createdBy?: string;
}
