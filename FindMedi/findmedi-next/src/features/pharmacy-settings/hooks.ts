import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPharmacySettings, updatePharmacySettings } from './api';
import type { PharmacySettings } from './types';
export function usePharmacySettings() {
  return useQuery({ queryKey: ['pharmacy-settings'], queryFn: getPharmacySettings });
}
export function useUpdatePharmacySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<PharmacySettings> }) => updatePharmacySettings(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-settings'] }),
  });
}
