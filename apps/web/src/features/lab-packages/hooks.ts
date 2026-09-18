/**
 * Lab packages feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackages, createPackage, updatePackage } from './api';
import type { LabPackageForm } from './types';

export function useLabPackages() {
  return useQuery({
    queryKey: ['lab-packages'],
    queryFn: () => getPackages(),
    staleTime: 60_000,
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LabPackageForm) => createPackage(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-packages'] }),
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & LabPackageForm) => updatePackage(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-packages'] }),
  });
}
