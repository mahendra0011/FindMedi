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

export function useMedicineInventory(search = '') {
  return useQuery({
    queryKey: ['pharmacy-medicines', 'inventory', search],
    queryFn: () => pharmacyApi.getMedicines(search ? { search } : {}),
    staleTime: 30_000,
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => pharmacyApi.createMedicine(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-medicines'] }),
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => pharmacyApi.updateMedicine(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-medicines'] }),
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pharmacyApi.deleteMedicine(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-medicines'] }),
  });
}

export function useShopOrders(status = 'All', search = '') {
  return useQuery({
    queryKey: ['shop-orders', status, search],
    queryFn: () =>
      pharmacyApi.getOrders({ ...(status === 'All' ? {} : { status }), ...(search ? { search } : {}) }),
    staleTime: 30_000,
  });
}

export function usePrescriptionQueue() {
  return useQuery({
    queryKey: ['pharmacy-prescription-queue'],
    queryFn: () => pharmacyApi.getPrescriptions({}),
    staleTime: 15_000,
  });
}

export function useDispenseMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) =>
      pharmacyApi.dispenseMedicine(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-prescription-queue'] }),
  });
}

export function useOffers() {
  return useQuery({
    queryKey: ['pharmacy-offers'],
    queryFn: () => pharmacyApi.getOffers({}),
    staleTime: 60_000,
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => pharmacyApi.createOffer(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-offers'] }),
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => pharmacyApi.updateOffer(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-offers'] }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pharmacyApi.deleteOffer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-offers'] }),
  });
}

export function usePharmacyStaff() {
  return useQuery({
    queryKey: ['pharmacy-staff'],
    queryFn: () => pharmacyApi.getStaff({}),
    staleTime: 60_000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => pharmacyApi.createStaff(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-staff'] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => pharmacyApi.updateStaff(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-staff'] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pharmacyApi.deleteStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-staff'] }),
  });
}

export function useReturns(search = '') {
  return useQuery({
    queryKey: ['pharmacy-returns', search],
    queryFn: () => pharmacyApi.getReturns(search ? { search } : {}),
    staleTime: 30_000,
  });
}

export function useUpdateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => pharmacyApi.updateReturn(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-returns'] }),
  });
}

export function usePharmacyStats() {
  return useQuery({
    queryKey: ['pharmacy-stats'],
    queryFn: () => pharmacyApi.getStats(),
    staleTime: 60_000,
  });
}

export function useDeliveries() {
  return useQuery({
    queryKey: ['pharmacy-deliveries'],
    queryFn: () => pharmacyApi.getDeliveries({}),
    staleTime: 15_000,
  });
}

export function useCreateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => pharmacyApi.createDelivery(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-deliveries'] }),
  });
}

export function useUpdateDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => pharmacyApi.updateDelivery(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pharmacy-deliveries'] }),
  });
}
