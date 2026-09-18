/** Analytics feature — hooks. */
import { useQuery } from '@tanstack/react-query';
import { getAnalyticsStats } from './api';
export function useAnalyticsStats() { return useQuery({ queryKey: ['admin-analytics-stats'], queryFn: getAnalyticsStats, staleTime: 60_000 }); }
