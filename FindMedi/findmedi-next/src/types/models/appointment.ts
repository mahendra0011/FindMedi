import type { BaseEntity } from '@/types/api';
import type {
  AppointmentStatus,
  AppointmentType,
  AppointmentMode,
  AppointmentPriority,
} from '@/types/enums';

export interface PreConsultationDetails {
  chiefComplaint: string;
  chiefComplaintOther: string;
  symptomsDuration: string;
  pastMedicalHistory: {
    hasHistory: boolean;
    details: string;
  };
  currentTreatment: {
    hasPastTreatment: boolean;
    doctorName: string;
    cityState: string;
    when: string;
    prescriptionFile: string;
    takingMedicines: boolean;
  };
  testReports: {
    hasReports: boolean;
    reportFile: string;
  };
  currentMedications: {
    hasMedications: boolean;
    details: string;
  };
  allergies: {
    hasAllergies: boolean;
    details: string;
  };
  familyHistory: {
    hasHistory: boolean;
    details: string;
  };
  filledAt?: string;
  formId?: string;
}

export interface AppointmentPatientRef {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface AppointmentDoctorRef {
  _id: string;
  name: string;
  specialization?: string;
}

export interface LastVisitRef {
  date: string;
  diagnosis?: string;
  note?: string;
}

export interface Appointment extends BaseEntity {
  tokenNumber?: string;
  uhid?: string;
  patientId?: AppointmentPatientRef | string;
  patient?: string; // legacy display name
  doctor?: AppointmentDoctorRef | string;
  doctorId?: string;
  department: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  priority: AppointmentPriority;
  type: AppointmentType;
  appointmentMode: AppointmentMode;
  notes: string;
  symptoms: string;
  preConsultationDetails?: PreConsultationDetails;
  services: string[];
  fees: number;
  transactionId?: string;
  invoiceId?: string;
  queuePosition: number;
  estimatedWaitTime: number;
  checkedInAt?: string;
  consultationStartTime?: string;
  consultationEndTime?: string;
  hospitalId?: string;
  facilityId?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  lastVisit?: LastVisitRef | null;
  _delay?: number;
}

export interface AppointmentDisplay extends Appointment {
  patient?: string; // display name for card consumption
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  booked: number;
  maxBookings: number;
  available: boolean;
}

export interface BookedSlot {
  date: string;
  time: string;
  slots: TimeSlot[];
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  todayCount: number;
}
