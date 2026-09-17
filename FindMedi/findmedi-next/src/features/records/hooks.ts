/**
 * Medical records feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecords, deleteRecord, createRecord, downloadRecordPdf, getPatientVisits } from './api';

export function useMedicalRecords(search = '', categoryFilter = 'All') {
  return useQuery({
    queryKey: ['records', search, categoryFilter],
    queryFn: () => getRecords({ ...(search ? { search } : {}), ...(categoryFilter !== 'All' ? { type: categoryFilter } : {}) }),
    staleTime: 30_000,
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRecord(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  });
}

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createRecord(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['records'] }),
  });
}

export function useDownloadRecordPdf() {
  return useMutation({
    mutationFn: (recordId: string) => downloadRecordPdf(recordId),
  });
}

export function usePatientRecords() {
  return useQuery({
    queryKey: ['patient-records'],
    queryFn: async () => {
      const [visits, records] = await Promise.all([getPatientVisits(), getRecords()]);
      return { visits, records };
    },
    staleTime: 30_000,
  });
}
