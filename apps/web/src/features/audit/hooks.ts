/**
 * audit feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getAuditList, getAuditStats } from './api';

export function useAuditList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: () => getAuditList(params),
    staleTime: 30_000,
  });
}

export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => getAuditStats(),
    staleTime: 60_000,
  });
}
