/**
 * Physiotherapy feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReferrals,
  getStats,
  createReferral,
  startAssessment,
  createPlan,
  addSession,
  midReview,
  discharge,
  addToBilling,
} from './api';

export function usePhysioReferrals(search = '', statusFilter = 'All') {
  return useQuery({
    queryKey: ['physio', search, statusFilter],
    queryFn: () => getReferrals({ search, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function usePhysioStats() {
  return useQuery({
    queryKey: ['physio-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

function usePhysioMutation(
  mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['physio'] }),
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createReferral(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['physio'] }),
  });
}

export function useStartAssessment() {
  return usePhysioMutation(({ id, ...body }) => startAssessment(id, body));
}

export function useCreatePlan() {
  return usePhysioMutation(({ id, ...body }) => createPlan(id, body));
}

export function useAddSession() {
  return usePhysioMutation(({ id, ...body }) => addSession(id, body));
}

export function useMidReview() {
  return usePhysioMutation(({ id, ...body }) => midReview(id, body));
}

export function usePhysioDischarge() {
  return usePhysioMutation(({ id, ...body }) => discharge(id, body));
}

export function useAddToBilling() {
  return usePhysioMutation(({ id, ...body }) => addToBilling(id, body));
}
