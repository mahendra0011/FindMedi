/**
 * Diet kitchen feature — React hooks.
 * Uses TanStack Query to wrap API calls with caching and background refresh.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrders,
  getStats,
  createOrder,
  deliverMeal,
  confirmMeal,
  reviewDiet,
  addFeedback,
  notifyKitchen,
  addToBilling,
} from './api';

export function useDietOrders(search = '', statusFilter = 'All') {
  return useQuery({
    queryKey: ['diet-orders', search, statusFilter],
    queryFn: () => getOrders({ search, status: statusFilter }),
    staleTime: 30_000,
  });
}

export function useDietStats() {
  return useQuery({
    queryKey: ['diet-stats'],
    queryFn: () => getStats(),
    staleTime: 60_000,
  });
}

function useDietMutation(
  mutationFn: (args: { id: string; [key: string]: unknown }) => Promise<Record<string, unknown>>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet-orders'] }),
  });
}

export function useCreateDietOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createOrder(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet-orders', 'diet-stats'] }),
  });
}

export function useDeliverMeal() {
  return useDietMutation(({ id, ...body }) => deliverMeal(id, body));
}

export function useConfirmMeal() {
  return useDietMutation(({ id, ...body }) => confirmMeal(id, body));
}

export function useReviewDiet() {
  return useDietMutation(({ id, ...body }) => reviewDiet(id, body));
}

export function useAddDietFeedback() {
  return useDietMutation(({ id, ...body }) => addFeedback(id, body));
}

export function useNotifyKitchen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifyKitchen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diet-orders'] }),
  });
}

export function useAddDietToBilling() {
  return useDietMutation(({ id, ...body }) => addToBilling(id, body));
}
