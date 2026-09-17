/**
 * My Appointments — renders the shared booking history scoped to appointments.
 * Mirrors client/src/pages/patient/PatientAppointments.jsx.
 */
'use client';

import { PatientBookingHistory } from '@/components/patient';

export default function MyAppointmentsPage() {
  return <PatientBookingHistory initialType="appointment" />;
}
