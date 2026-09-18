/**
 * IPD feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBeds,
  getAdmissions,
  getStats,
  createBed,
  createAdmission,
  discharge,
  addVitals,
  addMar,
  addIO,
  addNursingNote,
  addDoctorNote,
} from './api';

export function useIPDBeds(wardFilter = 'All') {
  return useQuery({
    queryKey: ['ipd-beds', wardFilter],
    queryFn: () => getBeds({ ward: wardFilter }),
    staleTime: 30_000,
  });
}

export function useIPDAdmissions(search = '') {
  return useQuery({
    queryKey: ['ipd-admissions', search],
    queryFn: () => getAdmissions({ search }),
    staleTime: 30_000,
  });
}

export function useIPDStats() {
  return useQuery({
    queryKey: ['ipd-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

export function useAddBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bed: {
      bedNumber: string;
      ward: string;
      bedType: string;
      dailyRate: string;
      floor: string;
      isAC: boolean;
    }) => createBed(bed),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-beds'] }),
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (admission: {
      patientName: string;
      patientId: string;
      bedId?: string;
      primaryDiagnosis: string;
      source: string;
      attendantName: string;
      attendantPhone: string;
      estimatedStay: string;
    }) => createAdmission(admission),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions', 'ipd-beds'] }),
  });
}

export function useDischarge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => discharge(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions', 'ipd-beds'] }),
  });
}

export function useAddVitals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addVitals(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions'] }),
  });
}

export function useAddMar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addMar(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions'] }),
  });
}

export function useAddIO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addIO(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions'] }),
  });
}

export function useAddNursingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addNursingNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions'] }),
  });
}

export function useAddDoctorNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => addDoctorNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ipd-admissions'] }),
  });
}
