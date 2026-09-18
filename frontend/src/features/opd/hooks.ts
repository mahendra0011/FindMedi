/**
 * OPD registration feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPatients,
  getTokens,
  createPatient,
  generateToken,
  getTokenQueue,
  callToken,
  startTokenConsultation,
  completeToken,
  skipToken,
  recallToken,
  getTokenStats,
  searchPatients,
  getRegStats,
} from './api';

export function useOPDPatients(search = '') {
  return useQuery({
    queryKey: ['opd-patients', search],
    queryFn: () => getPatients({ search }),
    staleTime: 30_000,
  });
}

export function useOPDTokens() {
  return useQuery({
    queryKey: ['opd-tokens'],
    queryFn: () => getTokens(),
    staleTime: 30_000,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      age: string;
      gender: string;
      phone: string;
      address: string;
      bloodGroup: string;
      uhid: string;
      email?: string;
      dateOfBirth?: string;
      emergencyContact?: string;
      emergencyPhone?: string;
    }) => createPatient(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opd-patients'] }),
  });
}

export function useGenerateToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { patientName: string; patientId: string; uhid?: string }) => generateToken(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opd-tokens'] }),
  });
}

export function useTokenQueue(search = '', deptFilter = 'All') {
  return useQuery({
    queryKey: ['tokens', search, deptFilter],
    queryFn: () => getTokenQueue({ search, department: deptFilter }),
    staleTime: 15_000,
  });
}

export function useTokenStats() {
  return useQuery({
    queryKey: ['token-stats'],
    queryFn: () => getTokenStats(),
    staleTime: 30_000,
  });
}

export function useCallToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  });
}

export function useStartConsultation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startTokenConsultation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  });
}

export function useCompleteToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens', 'token-stats'] }),
  });
}

export function useSkipToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => skipToken(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  });
}

export function useRecallToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recallToken(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tokens'] }),
  });
}

export function usePatientSearch(search: string) {
  return useQuery({
    queryKey: ['patient-search', search],
    queryFn: () => searchPatients(search),
    enabled: search.length > 2,
    staleTime: 30_000,
  });
}

export function useRegStats() {
  return useQuery({
    queryKey: ['reg-stats'],
    queryFn: () => getRegStats(),
    staleTime: 60_000,
  });
}
