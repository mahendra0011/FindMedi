/**
 * Family members feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFamily, createFamily, deleteFamily } from './api';
import type { FamilyMemberForm } from './types';

export function useFamilyMembers() {
  return useQuery({
    queryKey: ['family'],
    queryFn: () => getFamily(),
    staleTime: 60_000,
  });
}

export function useCreateFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: FamilyMemberForm) => createFamily(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFamily(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });
}
