/**
 * Mental health feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCases, getStats, createCase, addAssessment, addMse, createPlan, addSession, updateConfidentiality } from './api';

export function useMHCases(search = '', statusFilter = 'All') {
  return useQuery({
    queryKey: ['mental', search, statusFilter],
    queryFn: () => getCases({ search, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function useMHStats() {
  return useQuery({
    queryKey: ['mental-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

function useMHMutation(mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mental'] }),
  });
}

export function useCreateMHCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createCase(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mental'] }),
  });
}

export function useAddAssessment() {
  return useMHMutation(({ id, ...body }) => addAssessment(id, body));
}

export function useAddMse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: string }) => addMse(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mental'] }),
  });
}

export function useCreateMHPlan() {
  return useMHMutation(({ id, ...body }) => createPlan(id, body));
}

export function useAddMHSession() {
  return useMHMutation(({ id, ...body }) => addSession(id, body));
}

export function useUpdateConfidentiality() {
  return useMHMutation(({ id, ...body }) => updateConfidentiality(id, body));
}
