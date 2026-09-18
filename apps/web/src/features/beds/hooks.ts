/**
 * Bed management feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBeds, getBedStats, createBed, updateBed, deleteBed } from './api';
import type { BedForm } from './types';

export function useBeds(wardFilter = '', statusFilter = '') {
  return useQuery({
    queryKey: ['beds', wardFilter, statusFilter],
    queryFn: () => getBeds({ ...(wardFilter ? { ward: wardFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}) }),
    staleTime: 30_000,
  });
}

export function useBedStats() {
  return useQuery({
    queryKey: ['bed-stats'],
    queryFn: () => getBedStats(),
    staleTime: 60_000,
  });
}

export function useCreateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BedForm) => createBed(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beds', 'bed-stats'] }),
  });
}

export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & BedForm) => updateBed(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beds', 'bed-stats'] }),
  });
}

export function useDeleteBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beds', 'bed-stats'] }),
  });
}
