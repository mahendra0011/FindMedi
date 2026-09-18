/**
 * Blood Bank feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 * Placeholder implementations return empty arrays; real API endpoints
 * should be added to @/lib/api when the backend is ready.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUnits, getRequests, getStats, addUnit, createRequest, crossMatch, issueUnits, startTransfusion, completeTransfusion, reportReaction } from './api';


export function useBloodUnits(search = '') {
  return useQuery({
    queryKey: ['blood-units', search],
    queryFn: () => getUnits(search),
    staleTime: 30_000,
  });
}

export function useBloodRequests(search = '') {
  return useQuery({
    queryKey: ['blood-requests', search],
    queryFn: () => getRequests(search),
    staleTime: 30_000,
  });
}

export function useBloodBankStats() {
  return useQuery({
    queryKey: ['blood-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useAddBloodUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (unit: { bloodGroup: string; donorName: string; donationDate: string; expiryDate: string; volume: number; components: string[] }) => addUnit(unit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-units'] }),
  });
}

export function useCreateBloodRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { patientName: string; patientId: string; bloodGroup: string; unitsRequired: number; reason: string; priority: string }) => createRequest(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests'] }),
  });
}

export function useCrossMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patientGroup, donorUnitId, compatibility, technician }: {
      id: string;
      patientGroup: string;
      donorUnitId?: string;
      compatibility?: string;
      technician?: string;
    }) => crossMatch(id, { patientGroup, donorUnitId, compatibility, technician }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests'] }),
  });
}

export function useIssueUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, unitIds }: { id: string; unitIds: string[] }) => issueUnits(id, unitIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests', 'blood-units'] }),
  });
}

export function useStartTransfusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, endTime, vitals }: { id: string; endTime: string; vitals?: string }) => startTransfusion(id, { endTime, vitals }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests'] }),
  });
}

export function useCompleteTransfusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => completeTransfusion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests'] }),
  });
}

export function useReportReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reactionType, severity, symptoms, actionTaken, stopped }: {
      id: string;
      reactionType: string;
      severity: string;
      symptoms: string;
      actionTaken: string;
      stopped: boolean;
    }) => reportReaction(id, { reactionType, severity, symptoms, actionTaken, stopped }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blood-requests'] }),
  });
}