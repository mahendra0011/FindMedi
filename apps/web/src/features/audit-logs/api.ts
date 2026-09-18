/**
 * audit-logs feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { AuditLogsItem } from './types';

export const getAuditLogsList = (params: Record<string, unknown> = {}): Promise<AuditLogsItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getAuditLogsStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
