/**
 * Housekeeping feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { housekeepingApi } from './api';

export function useHousekeepingTasks(search = '', statusFilter = 'All') {
  return useQuery({
    queryKey: ['hk', search, statusFilter],
    queryFn: () => housekeepingApi.getTasks({ search, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function useHousekeepingStats() {
  return useQuery({
    queryKey: ['hk-stats'],
    queryFn: () => housekeepingApi.getStats(),
    staleTime: 60_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => housekeepingApi.createTask(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hk'] }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) =>
      housekeepingApi.completeTask(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hk'] }),
  });
}

export function useVerifyTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => housekeepingApi.verifyTask(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hk'] }),
  });
}

export function useAutoCreateOnDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => housekeepingApi.autoCreateOnDischarge(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hk'] }),
  });
}
