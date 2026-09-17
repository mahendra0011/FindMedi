/**
 * export feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { ExportItem } from './types';

export const getExportList = (params: Record<string, unknown> = {}): Promise<ExportItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getExportStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
