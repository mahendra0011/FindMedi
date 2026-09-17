/**
 * Doctor feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyDoctor,
  updateDoctor,
  uploadDoctorSignature,
  getAutoConfirm,
  getSlotCapacity,
  updateAutoConfirmSetting,
  updateSlotCapacitySetting,
} from './api';
import type { Doctor } from '@/types/models/doctor';

export function useMyDoctor(email?: string, name?: string) {
  return useQuery({
    queryKey: ['doctor', 'me', email ?? '', name ?? ''],
    queryFn: () => getMyDoctor(email, name),
    staleTime: 300_000,
  });
}

export function useUpdateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Doctor> }) => updateDoctor(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor'] }),
  });
}

export function useUploadDoctorSignature() {
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadDoctorSignature(id, file),
  });
}

export function useAutoConfirmSettings(doctorId?: string) {
  const autoConfirmQuery = useQuery({
    queryKey: ['doctor-auto-confirm'],
    queryFn: () => getAutoConfirm(),
    staleTime: 300_000,
  });
  const slotQuery = useQuery({
    queryKey: ['doctor-slot-capacity'],
    queryFn: () => getSlotCapacity(),
    staleTime: 300_000,
  });
  const qc = useQueryClient();
  const toggleAutoConfirm = useMutation({
    mutationFn: (value: boolean) => {
      if (!doctorId) return Promise.resolve(null);
      return updateAutoConfirmSetting(doctorId, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-auto-confirm'] }),
  });
  const saveSlotCapacity = useMutation({
    mutationFn: (n: number) => updateSlotCapacitySetting(n),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctor-slot-capacity'] }),
  });
  return { autoConfirmQuery, slotQuery, toggleAutoConfirm, saveSlotCapacity };
}
