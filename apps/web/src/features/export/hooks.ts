/**
 * export feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getExportList, getExportStats } from './api';

export function useExportList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['export', params],
    queryFn: () => getExportList(params),
    staleTime: 30_000,
  });
}

export function useExportStats() {
  return useQuery({
    queryKey: ['export-stats'],
    queryFn: () => getExportStats(),
    staleTime: 60_000,
  });
}
