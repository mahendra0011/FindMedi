/**
 * Doctor patients feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDoctorPatients, createDoctorPatient, deleteDoctorPatient } from './api';

export function useDoctorPatients(search = '', statusFilter = '') {
  return useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => getDoctorPatients({ ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) }),
    staleTime: 30_000,
  });
}

export function useCreateDoctorPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createDoctorPatient(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useDeleteDoctorPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoctorPatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
