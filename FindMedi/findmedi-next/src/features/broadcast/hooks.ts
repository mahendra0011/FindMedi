/**
 * broadcast feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getBroadcastList, getBroadcastStats } from './api';

export function useBroadcastList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['broadcast', params],
    queryFn: () => getBroadcastList(params),
    staleTime: 30_000,
  });
}

export function useBroadcastStats() {
  return useQuery({
    queryKey: ['broadcast-stats'],
    queryFn: () => getBroadcastStats(),
    staleTime: 60_000,
  });
}
