/**
 * Billing feature — React hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Billing } from '@/types/models/billing';
import { billing, payments, transactions } from '@/lib/api';

export function useBillingList() {
  return useQuery({
    queryKey: ['billing'],
    queryFn: () => billing.get(),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => payments.get(),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactions.get(),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Billing>) => billing.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}
