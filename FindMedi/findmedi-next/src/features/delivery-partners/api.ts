/**
 * delivery-partners feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { DeliveryPartnersItem } from './types';

export const getDeliveryPartnersList = (params: Record<string, unknown> = {}): Promise<DeliveryPartnersItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getDeliveryPartnersStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
