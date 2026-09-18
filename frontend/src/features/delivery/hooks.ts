/**
 * Delivery feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeliveryProfile,
  getMyDeliveries,
  updateDeliveryProfile,
  updateDeliveryStatus,
  getDeliveryReviews,
} from './api';
import type { DeliveryZoneForm } from './types';

export function useDeliveryProfile() {
  return useQuery({
    queryKey: ['delivery-profile'],
    queryFn: () => getDeliveryProfile(),
    staleTime: 30_000,
  });
}

export function useMyDeliveries() {
  return useQuery({
    queryKey: ['delivery-my-deliveries'],
    queryFn: () => getMyDeliveries(),
    staleTime: 15_000,
  });
}

export function useUpdateDeliveryProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) => updateDeliveryProfile(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-profile'] });
      qc.invalidateQueries({ queryKey: ['delivery-my-deliveries'] });
    },
  });
}

export function useUpdateDeliveryZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, workZone, availability }: { id: string } & DeliveryZoneForm) =>
      updateDeliveryProfile(id, { workZone, availability }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-profile'] }),
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string; status: string }) =>
      updateDeliveryStatus(deliveryId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-my-deliveries'] }),
  });
}

export function useDeliveryReviews() {
  return useQuery({
    queryKey: ['delivery-reviews'],
    queryFn: () => getDeliveryReviews(),
    staleTime: 60_000,
  });
}

export function useDeliverySettings() {
  return useDeliveryProfile();
}
