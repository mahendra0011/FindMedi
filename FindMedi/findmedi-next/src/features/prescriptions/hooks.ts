/**
 * Prescriptions feature — React hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prescriptionsApi } from './api';
import type { Prescription } from '@/types/models/prescription';

export function usePrescription(patientId: string) {
  return useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: () => prescriptionsApi.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Prescription>) => prescriptionsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

export function usePrescriptions(search = '') {
  return useQuery({
    queryKey: ['prescriptions', 'list', search],
    queryFn: () => prescriptionsApi.get(search ? { search } : {}),
    staleTime: 30_000,
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prescriptionsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}
