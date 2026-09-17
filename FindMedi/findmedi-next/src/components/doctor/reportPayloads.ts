/**
 * Doctor report payload builders — pure functions shared by the doctor
 * appointments screen (and any future consumer).
 */
import { getISTDateString } from '@/lib/dateUtils';
import type { Appointment } from '@/types/models/appointment';
import type { PrescriptionFormData } from './PrescriptionModal';
import type { LabReportFormData } from './LabReportModal';
import type { DischargeFormData } from './DischargeSummaryModal';

/** Resolve a displayable patient id from either a populated ref or a raw id. */
export function getAppointmentPatientId(apt: Appointment): string {
  return (apt.patientId as unknown as { _id?: string })?._id || (apt.patientId as unknown as string) || '';
}

export function buildPrescriptionRecord(data: PrescriptionFormData, apt: Appointment): Record<string, unknown> {
  const meds = data.medications.filter((m) => m.name.trim());
  return {
    patient: data.patientName,
    patientId: getAppointmentPatientId(apt),
    doctor: data.doctorName,
    diagnosis: data.diagnosis,
    prescription: meds
      .map((m) => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`)
      .join('\n'),
    type: 'prescription',
    notes: `Chief Complaints: ${data.chiefComplaints}\nAdvice: ${data.advice}\nFollow-up: ${data.followUp}`,
    data: {
      patient: {
        name: data.patientName,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
      doctor: { name: data.doctorName, specialization: data.specialization },
      chiefComplaints: data.chiefComplaints,
      diagnosis: data.diagnosis,
      medications: meds,
      advice: data.advice,
      followUp: data.followUp,
      date: getISTDateString(),
    },
  };
}

export function buildLabReportRecord(data: LabReportFormData): Record<string, unknown> {
  const tests = data.tests.filter((t) => t.name.trim());
  return {
    patient: data.patientName,
    doctor: data.doctorName,
    diagnosis: 'Lab Report',
    prescription: '',
    type: 'lab_report',
    notes: data.notes,
    data: {
      patient: { name: data.patientName, age: data.age, gender: data.gender, phone: data.phone, email: data.email },
      doctor: { name: data.doctorName, specialization: data.specialization },
      reportId: data.reportId,
      testDate: data.testDate,
      reportDate: data.reportDate,
      tests,
      notes: data.notes,
      date: data.reportDate,
    },
  };
}

export function buildDischargeRecord(data: DischargeFormData, apt: Appointment): Record<string, unknown> {
  const meds = data.medications.filter((m) => m.name.trim());
  return {
    patient: data.patientName,
    patientId: getAppointmentPatientId(apt),
    doctor: data.doctorName,
    diagnosis: data.diagnosis,
    prescription: meds.map((m) => `${m.name} - ${m.dosage} - ${m.frequency}`).join('\n'),
    type: 'discharge_summary',
    notes: `Chief Complaints: ${data.chiefComplaints}\nTreatment: ${data.treatmentGiven}\nSurgery: ${data.surgery}\nDischarge Advice: ${data.dischargeAdvice}\nFollow-up: ${data.followUpInstructions}`,
    data: {
      patient: {
        name: data.patientName,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
      },
      doctor: { name: data.doctorName, specialization: data.specialization },
      admissionId: data.admissionId,
      admissionDate: data.admissionDate,
      dischargeDate: data.dischargeDate,
      chiefComplaints: data.chiefComplaints,
      diagnosis: data.diagnosis,
      treatment: data.treatmentGiven,
      surgery: data.surgery,
      medications: meds,
      dischargeAdvice: data.dischargeAdvice,
      followUpInstructions: data.followUpInstructions,
      date: data.dischargeDate,
    },
  };
}

export function buildBillBody(apt: Appointment, doctorName: string | undefined, amount: number): Record<string, unknown> {
  return {
    patient: apt.patient,
    patientId: getAppointmentPatientId(apt),
    doctor: doctorName,
    service: `${apt.type} - ${apt.department || ''}`,
    amount,
    date: getISTDateString(),
    status: 'Pending',
  };
}
