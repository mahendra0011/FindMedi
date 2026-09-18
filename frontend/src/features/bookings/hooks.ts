/**
 * Bookings feature — React hooks.
 * Uses TanStack Query for data fetching and mutation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, getLabBookings, cancelAppointment, rescheduleAppointment, updateIntake } from './api';

export function useAppointments(params = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => getAppointments(params),
    staleTime: 30_000,
  });
}

export function useLabBookings(params = {}) {
  return useQuery({
    queryKey: ['lab-bookings', params],
    queryFn: () => getLabBookings(params),
    staleTime: 30_000,
  });
}

function useBookingsMutation(mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

export function useCancelAppointment(id: string) {
  return useBookingsMutation(() => cancelAppointment(id));
}

export function useRescheduleAppointment(id: string, body: Record<string, unknown>) {
  return useBookingsMutation(() => rescheduleAppointment(id, body));
}

export function useUpdateIntake(id: string, body: Record<string, string>) {
  return useBookingsMutation(() => updateIntake(id, body));
}