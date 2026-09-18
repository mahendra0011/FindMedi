/**
 * Diet kitchen feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { DietOrder, DietStats } from './types';

export const getOrders = (params: { search?: string; status?: string } = {}): Promise<{ orders: DietOrder[] }> => {
  void params;
  return Promise.resolve({ orders: [] });
};

export const createOrder = (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void body;
  return Promise.resolve({});
};

export const deliverMeal = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const confirmMeal = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const reviewDiet = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const addFeedback = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const notifyKitchen = (id: string): Promise<Record<string, unknown>> => {
  void id;
  return Promise.resolve({});
};

export const addToBilling = (id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  void id;
  void body;
  return Promise.resolve({});
};

export const getStats = (): Promise<DietStats> =>
  Promise.resolve({ active: 0, todayMeals: 0, pendingReview: 0, total: 0 });
