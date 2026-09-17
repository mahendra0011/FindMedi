/**
 * Nursing charts feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nursingApi } from './api';

export function useNursingCharts(chartType: string) {
  return useQuery({
    queryKey: ['nursing-charts', chartType],
    queryFn: () => nursingApi.getCharts({ chartType }),
    staleTime: 30_000,
  });
}

export function useNursingStats() {
  return useQuery({
    queryKey: ['nursing-stats'],
    queryFn: () => nursingApi.getStats(),
    staleTime: 60_000,
  });
}

function useCreateChart(
  mutationFn: (body: Record<string, unknown>) => Promise<Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nursing-charts', 'nursing-stats'] }),
  });
}

export function useCreateVitalsChart() {
  return useCreateChart((body) => nursingApi.createVitals(body));
}

export function useCreateMARChart() {
  return useCreateChart((body) => nursingApi.createMAR(body));
}

export function useCreateIOChart() {
  return useCreateChart((body) => nursingApi.createIO(body));
}

export function useCreateWoundChart() {
  return useCreateChart((body) => nursingApi.createWound(body));
}
