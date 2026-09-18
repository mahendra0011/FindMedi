/**
 * Radiology feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getStats, createOrder, schedule, startScan, completeScan, submitReport, deliver } from './api';

export function useRadiologyOrders(search = '', modalityFilter = 'All', statusFilter = 'All') {
  return useQuery({
    queryKey: ['radiology', search, modalityFilter, statusFilter],
    queryFn: () => getOrders({ search, modality: modalityFilter, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function useRadiologyStats() {
  return useQuery({
    queryKey: ['radiology-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}

export function useScheduleScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => schedule(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}

export function useStartScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startScan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}

export function useCompleteScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => completeScan(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}

export function useSubmitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => submitReport(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}

export function useDeliverReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliver(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['radiology'] }),
  });
}
