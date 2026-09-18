/**
 * delivery-partners feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery } from '@tanstack/react-query';
import { getDeliveryPartnersList, getDeliveryPartnersStats } from './api';

export function useDeliveryPartnersList(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ['delivery-partners', params],
    queryFn: () => getDeliveryPartnersList(params),
    staleTime: 30_000,
  });
}

export function useDeliveryPartnersStats() {
  return useQuery({
    queryKey: ['delivery-partners-stats'],
    queryFn: () => getDeliveryPartnersStats(),
    staleTime: 60_000,
  });
}
