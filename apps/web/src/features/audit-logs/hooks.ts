/**
 * audit-logs feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getAuditLogsList, getAuditLogsStats } from './api';

export function useAuditLogsList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogsList(params),
    staleTime: 30_000,
  });
}

export function useAuditLogsStats() {
  return useQuery({
    queryKey: ['audit-logs-stats'],
    queryFn: () => getAuditLogsStats(),
    staleTime: 60_000,
  });
}
