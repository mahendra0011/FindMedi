/**
 * Delivery feature — API wrappers.
 * Real endpoints are re-exported from @/lib/api where available.
 * Placeholder fallbacks use Promise.resolve for endpoints not yet implemented.
 */
import { api } from '@/lib/api';
import type { DeliveryProfile, MyDeliveries, DeliveryReview, DeliveryZoneForm, DeliveryTask } from './types';

// ── Delivery profile & tasks ──────────────────────────────────────────
export const getDeliveryProfile = (): Promise<DeliveryProfile> =>
  api.getDeliveryProfile() as Promise<DeliveryProfile>;

export const getMyDeliveries = async (): Promise<MyDeliveries> => {
  const raw = (await api.getMyDeliveries()) as unknown as MyDeliveries & Record<string, unknown>;
  if (raw && Array.isArray(raw.active) && Array.isArray(raw.history)) return raw as MyDeliveries;
  // Fallback normalization for alternative response shapes
  const active = Array.isArray((raw as Record<string, unknown>)?.active)
    ? ((raw as Record<string, unknown>).active as DeliveryTask[])
    : [];
  const history = Array.isArray((raw as Record<string, unknown>)?.history)
    ? ((raw as Record<string, unknown>).history as DeliveryTask[])
    : [];
  if (Array.isArray(raw as unknown as unknown[])) {
    return { active: [], history: raw as unknown as DeliveryTask[] };
  }
  return { active, history };
};

export const updateDeliveryProfile = (id: string, body: Record<string, unknown>): Promise<DeliveryProfile> =>
  api.updateDeliveryProfile(id, body) as Promise<DeliveryProfile>;

export const updateDeliveryStatus = (deliveryId: string, status: string): Promise<Record<string, unknown>> =>
  api.updateDeliveryStatus(deliveryId, status) as Promise<Record<string, unknown>>;

export const updateDeliveryZone = (id: string, body: DeliveryZoneForm): Promise<DeliveryProfile> =>
  api.updateDeliveryProfile(id, body as unknown as Record<string, unknown>) as Promise<DeliveryProfile>;

// ── Reviews ───────────────────────────────────────────────────────────
export const getDeliveryReviews = async (): Promise<DeliveryReview[]> => {
  try {
    const raw = await api.getReviews({} as Record<string, string>);
    const data = raw as unknown as DeliveryReview[] | { data?: DeliveryReview[]; reviews?: DeliveryReview[] };
    if (Array.isArray(data)) return data as DeliveryReview[];
    if (data && Array.isArray((data as { data?: unknown }).data)) return (data as { data: DeliveryReview[] }).data;
    if (data && Array.isArray((data as { reviews?: unknown }).reviews)) return (data as { reviews: DeliveryReview[] }).reviews;
    return [];
  } catch {
    return Promise.resolve([]);
  }
};

// ── Earnings helpers (derived from deliveries) ───────────────────────
export const getDeliveryEarnings = async (): Promise<MyDeliveries> => getMyDeliveries();
