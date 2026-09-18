/**
 * OT (Operation Theatre) feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSurgeries,
  getStats,
  createSurgery,
  startPreOp,
  startSurgery,
  completeSurgery,
  recoveryUpdate,
  checklistUpdate,
  shiftToWard,
} from './api';

export function useSurgeries(search = '', statusFilter = 'All') {
  return useQuery({
    queryKey: ['ot', search, statusFilter],
    queryFn: () => getSurgeries({ search, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function useOTStats() {
  return useQuery({
    queryKey: ['ot-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useCreateSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      patientName: string;
      patientId: string;
      surgeryName: string;
      surgeryType: string;
      anaesthesiaType: string;
      otNumber: string;
      scheduledDate: string;
      surgeonName: string;
      notes: string;
    }) => createSurgery(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useStartPreOp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startPreOp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useStartSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startSurgery(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useCompleteSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      findings,
      procedure,
      instrumentsBefore,
      instrumentsAfter,
      spongesBefore,
      spongesAfter,
    }: {
      id: string;
      findings: string;
      procedure: string;
      instrumentsBefore: number;
      instrumentsAfter: number;
      spongesBefore: number;
      spongesAfter: number;
    }) =>
      completeSurgery(id, {
        findings,
        procedure,
        instrumentsBefore,
        instrumentsAfter,
        spongesBefore,
        spongesAfter,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useRecoveryUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => recoveryUpdate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useChecklistUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, checklist }: { id: string; checklist: Record<string, boolean> }) =>
      checklistUpdate(id, { checklist }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}

export function useShiftToWard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shiftToWard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ot'] }),
  });
}
