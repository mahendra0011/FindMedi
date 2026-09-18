/**
 * Bookings feature — API wrappers.
 * Uses the shared @/lib/api endpoints for appointments and lab bookings.
 */
import { api } from '@/lib/api/endpoints';
import type { Appointment as AppointmentModel } from '@/types/models/appointment';
import type { Appointment, LabBooking } from './types';

export const getAppointments = async (params: {
  status?: string;
  dateRange?: string;
  search?: string;
} = {}): Promise<{ appointments: Appointment[] }> => {
  const list = await api.appointments.get({
    ...(params.search ? { search: params.search } : {}),
    ...(params.status && params.status !== 'All' ? { status: params.status } : {}),
    ...(params.dateRange && params.dateRange !== 'All Time' ? { dateRange: params.dateRange } : {}),
  });
  return { appointments: (list as unknown) as Appointment[] };
};

export const getLabBookings = async (params: {
  status?: string;
  dateRange?: string;
  search?: string;
} = {}): Promise<{ bookings: LabBooking[] }> => {
  const list = await api.lab.getBookings({
    ...(params.search ? { search: params.search } : {}),
    ...(params.status && params.status !== 'All' ? { status: params.status } : {}),
    ...(params.dateRange && params.dateRange !== 'All Time' ? { dateRange: params.dateRange } : {}),
  });
  return { bookings: (list as unknown) as LabBooking[] };
};

export const cancelAppointment = async (id: string): Promise<Record<string, unknown>> => {
  const res = await api.appointments.delete(id);
  return (res as unknown) as Record<string, unknown>;
};

export const rescheduleAppointment = async (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await api.appointments.update(id, (body as unknown) as Partial<AppointmentModel>);
  return (res as unknown) as Record<string, unknown>;
};

export const updateIntake = async (id: string, body: Record<string, string>): Promise<Record<string, unknown>> => {
  const res = await api.appointments.submitIntakeForm(id, body);
  return (res as unknown) as Record<string, unknown>;
};
