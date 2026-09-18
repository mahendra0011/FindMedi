/**
 * broadcast feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { BroadcastItem } from './types';

export const getBroadcastList = (params: Record<string, unknown> = {}): Promise<BroadcastItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getBroadcastStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
