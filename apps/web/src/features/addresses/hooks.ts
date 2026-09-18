/**
 * Saved addresses feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAddresses, createAddress, updateAddress, deleteAddress } from './api';
import type { AddressForm } from './types';

export function useAddresses() {
  return useQuery({
    queryKey: ['patient-addresses'],
    queryFn: () => getAddresses(),
    staleTime: 60_000,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddressForm) => createAddress(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-addresses'] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & AddressForm) => updateAddress(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-addresses'] }),
  });
}
