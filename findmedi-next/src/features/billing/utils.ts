/**
 * Billing feature — utility helpers.
 */
import type { BillingItem, InsuranceInfo } from '@/types/models/billing';

export function calculateTotal(items: BillingItem[]): number {
  return items.reduce(
    (sum, item) => sum + ((item.price ?? 0) * (item.quantity ?? 1) - (item.discount ?? 0)),
    0,
  );
}

export function calculateInsuranceCover(info?: InsuranceInfo | null): number {
  if (!info) return 0;
  return 0;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹ 0.00';
  return `₹ ${num.toFixed(2)}`;
}
