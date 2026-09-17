/**
 * Inventory feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from './api';

export function useInventoryItems(search = '') {
  return useQuery({
    queryKey: ['inventory', search],
    queryFn: () => inventoryApi.getItems({ search }),
    staleTime: 30_000,
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inv-stats'],
    queryFn: () => inventoryApi.getStats(),
    staleTime: 60_000,
  });
}

export function useCreateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => inventoryApi.createItem(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useAddStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => inventoryApi.addStock(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useIssueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => inventoryApi.issueItem(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useCreatePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => inventoryApi.createPurchaseRequest(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => inventoryApi.createPurchaseOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}

export function useReceiveGRN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => inventoryApi.receiveGRN(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
}
