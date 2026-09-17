/**
 * Staff feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAll, getStats, create, markAttendance, applyLeave, assignShift, addTraining } from './api';

export function useStaffList(search = '', deptFilter = 'All') {
  return useQuery({
    queryKey: ['staff', search, deptFilter],
    queryFn: () => getAll({ search, department: deptFilter }),
    staleTime: 30_000,
  });
}

export function useStaffStats() {
  return useQuery({
    queryKey: ['staff-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => markAttendance(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => applyLeave(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useAssignShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => assignShift(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}

export function useAddTraining() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addTraining(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
