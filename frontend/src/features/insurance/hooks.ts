/**
 * Insurance feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAll, getStats, create, preAuth, fileClaim, settle } from './api';
import type { InsuranceClaimForm } from './types';

export function useInsuranceClaims(search = '') {
  return useQuery({
    queryKey: ['insurance', search],
    queryFn: () => getAll({ search }),
    staleTime: 30_000,
  });
}

export function useInsuranceStats() {
  return useQuery({
    queryKey: ['insurance-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsuranceClaimForm) => create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance', 'insurance-stats'] }),
  });
}

function useClaimMutation(
  mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance'] }),
  });
}

export function usePreAuth() {
  return useClaimMutation(({ id, ...body }) => preAuth(id, body));
}

export function useFileClaim() {
  return useClaimMutation(({ id, ...body }) => fileClaim(id, body));
}

export function useSettleClaim() {
  return useClaimMutation(({ id, ...body }) => settle(id, body));
}
