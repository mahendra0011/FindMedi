/**
 * Pharmacy-orders feature — React hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from './api';

export function usePharmacyOrders() {
  return useQuery({
    queryKey: ['pharmacy-orders'],
    queryFn: () => pharmacyApi.getOrders(),
  });
}

export function usePharmacyMedicines() {
  return useQuery({
    queryKey: ['pharmacy-medicines'],
    queryFn: () => pharmacyApi.getMedicines(),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => pharmacyApi.createOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-orders'] }),
  });
}
