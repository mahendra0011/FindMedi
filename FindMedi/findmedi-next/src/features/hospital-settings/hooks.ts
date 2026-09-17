import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHospitalSettings, updateHospitalSettings } from './api';
import type { HospitalSettings } from './types';
export function useHospitalSettings() {
  return useQuery({ queryKey: ['hospital-settings'], queryFn: getHospitalSettings });
}
export function useUpdateHospitalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<HospitalSettings> }) => updateHospitalSettings(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hospital-settings'] }),
  });
}
