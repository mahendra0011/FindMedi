/**
 * Lab staff feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStaff, createStaff, updateStaff, deleteStaff } from './api';
import type { LabStaffForm } from './types';

export function useLabStaff() {
  return useQuery({
    queryKey: ['lab-staff'],
    queryFn: () => getStaff(),
    staleTime: 60_000,
  });
}

export function useCreateLabStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LabStaffForm) => createStaff(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-staff'] }),
  });
}

export function useUpdateLabStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & LabStaffForm) => updateStaff(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-staff'] }),
  });
}

export function useDeleteLabStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-staff'] }),
  });
}
