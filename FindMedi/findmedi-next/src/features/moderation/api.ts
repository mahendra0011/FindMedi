/**
 * moderation feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
import type { ModerationItem } from './types';

export const getModerationList = (params: Record<string, unknown> = {}): Promise<ModerationItem[]> => {
  void params;
  return Promise.resolve([]);
};

export const getModerationStats = (): Promise<Record<string, unknown>> =>
  Promise.resolve({ total: 0 });
