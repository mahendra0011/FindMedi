import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClinicSettings, updateClinicSettings } from './api';
import type { ClinicSettings } from './types';
export function useClinicSettings() {
  return useQuery({ queryKey: ['clinic-settings'], queryFn: getClinicSettings });
}
export function useUpdateClinicSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ClinicSettings> }) => updateClinicSettings(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic-settings'] }),
  });
}
