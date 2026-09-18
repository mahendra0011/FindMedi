/**
 * audit feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { AuditItem } from './types';

export const getAuditList = (params: Record<string, unknown> = {}): Promise<AuditItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getAuditStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
