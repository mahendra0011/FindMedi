/**
 * moderation feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getModerationList, getModerationStats } from './api';

export function useModerationList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['moderation', params],
    queryFn: () => getModerationList(params),
    staleTime: 30_000,
  });
}

export function useModerationStats() {
  return useQuery({
    queryKey: ['moderation-stats'],
    queryFn: () => getModerationStats(),
    staleTime: 60_000,
  });
}
