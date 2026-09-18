/**
 * Triage feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAll, getStats, create, update, assign, addMlc, addNote } from './api';

export function useTriageEntries(search = '', triageFilter = 'All') {
  return useQuery({
    queryKey: ['triage', search, triageFilter],
    queryFn: () => getAll({ search, triageLevel: triageFilter }),
    staleTime: 30_000,
  });
}

export function useTriageStats() {
  return useQuery({
    queryKey: ['triage-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useCreateTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage', 'triage-stats'] }),
  });
}

export function useAssignDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => assign(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage'] }),
  });
}

export function useMarkMlc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addMlc(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage'] }),
  });
}

export function useAddTriageNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage'] }),
  });
}

export function useDischargeTriage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      update(id, { status: 'Discharged', dischargedAt: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['triage', 'triage-stats'] }),
  });
}
