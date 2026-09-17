/**
 * Appointment feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { appointments as appointmentsApi } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';
import type { Appointment } from '@/types/models/appointment';
import type { AppointmentStatus } from '@/types/enums';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.get(),
  });
}

export function useMyAppointments() {
  return useQuery({
    queryKey: ['appointments', 'my'],
    queryFn: () => appointmentsApi.getMy(),
  });
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ['appointments', 'stats'],
    queryFn: () => appointmentsApi.getStats(),
    staleTime: 60_000,
  });
}

/**
 * Doctor appointments screen — fetch + derived lists + status updates.
 * Subscribes to realtime updates and polls every 30s while the tab is visible.
 */
export function useDoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAppointments = useCallback(async (extraParams: Record<string, string | number> = {}) => {
    setLoading(true);
    try {
      const data = (await appointmentsApi.get({ status: 'All', limit: 100, ...extraParams })) as unknown as
        | { appointments?: Appointment[]; data?: Appointment[] }
        | Appointment[];
      setAppointments(Array.isArray(data) ? data : (data?.appointments || data?.data || []));
    } catch (e: unknown) {
      console.error(e);
      const status = (e as { status?: number })?.status;
      if (status && status >= 400 && status < 600) {
        toast.error('Failed to load appointments');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  useAppointmentRealtime(loadAppointments);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadAppointments();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  const today = getISTDateString();
  const pendingAppointments = appointments.filter((a) => (a.status || '').toLowerCase() === 'pending');
  const upcomingAppointments = appointments.filter(
    (a) =>
      a.date > today &&
      ((a.status || '').toLowerCase() === 'confirmed' || (a.status || '').toLowerCase() === 'approved'),
  );
  const todayAppointments = appointments.filter((a) => a.date === today);

  const handleStatus = useCallback(
    async (id: string, status: string, extra: Record<string, unknown> = {}) => {
      try {
        await appointmentsApi.update(id, { status: status as AppointmentStatus, ...extra });
        await loadAppointments();
      } catch (e) {
        console.error(e);
        toast.error('Failed to update appointment');
      }
    },
    [loadAppointments],
  );

  return {
    appointments,
    loading,
    loadAppointments,
    today,
    pendingAppointments,
    upcomingAppointments,
    todayAppointments,
    handleStatus,
  };
}
