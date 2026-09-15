/**
 * Appointment feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { appointments } from '@/lib/api';
import type { Appointment } from '@/types/models/appointment';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointments.get(),
  });
}

export function useMyAppointments() {
  return useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointments.getMy(),
  });
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ['appointments', 'stats'],
    queryFn: () => appointments.getStats(),
    staleTime: 60_000,
  });
}
