import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLabSettings, updateLabSettings } from './api';
import type { LabSettings } from './types';
export function useLabSettings() {
  return useQuery({ queryKey: ['lab-settings'], queryFn: getLabSettings });
}
export function useUpdateLabSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<LabSettings> }) => updateLabSettings(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-settings'] }),
  });
}
