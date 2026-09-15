/**
 * Pharmacy-orders feature — utility helpers.
 */
import type { PharmacyOrder } from './types';

export function calculateOrderTotal(order: PharmacyOrder): number {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
