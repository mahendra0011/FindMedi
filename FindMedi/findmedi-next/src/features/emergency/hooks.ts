/**
 * Emergency feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyApi } from './api';
import type { EmergencyCase } from './types';

export function useEmergencies() {
  return useQuery({
    queryKey: ['emergency'],
    queryFn: async () => {
      const list = await emergencyApi.get({ status: 'All' });
      return list as unknown as EmergencyCase[];
    },
    staleTime: 15_000,
  });
}

function useEmergencyMutation(
  mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency'] }),
  });
}

export function useAcceptEmergency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, doctorId, doctorName }: { id: string; doctorId: string; doctorName: string }) =>
      emergencyApi.assignDoctor(id, doctorId, doctorName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency'] }),
  });
}

export function useRejectEmergency() {
  return useEmergencyMutation(({ id }) => emergencyApi.updateStatus(id, 'Rejected'));
}

export function useUpdateEmergencyStatus() {
  return useEmergencyMutation(({ id, status }) =>
    emergencyApi.updateStatus(id, status as string),
  );
}

export function useAddEmergencyNote() {
  return useEmergencyMutation(({ id, text }) => emergencyApi.addNote(id, text as string));
}

export function useCreateEmergency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => emergencyApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergency'] }),
  });
}
