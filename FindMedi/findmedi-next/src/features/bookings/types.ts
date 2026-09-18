/**
 * Bookings feature — Type definitions.
 */
export interface IntakeDetails {
  chiefComplaint?: string;
  symptomsDuration?: string;
}

export type BookingStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Sample Collected'
  | 'Report Ready'
  | 'Completed'
  | 'Cancelled'
  | 'Pending'
  | 'Processing'
  | 'In Queue'
  | 'Serving'
  | 'Missed';

export const STATUS_FILTERS = ['All', 'Scheduled', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];
export const DATE_RANGES = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

export interface Appointment {
  _id: string;
  patientName: string;
  date: string;
  time: string;
  status: BookingStatus;
  type: 'Follow-up' | 'Consultation' | 'Procedure' | 'Investigation';
}

export interface LabBooking {
  _id: string;
  patientName: string;
  testName: string;
  status: BookingStatus;
  requestedAt: string;
  reportedAt?: string;
}

export type BookingOverview = Appointment | LabBooking;