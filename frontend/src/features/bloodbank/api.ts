/**
 * Blood Bank feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
export const getUnits = (search = '') => {
  void search;
  return [];
};
export const getRequests = (search = '') => {
  void search;
  return [];
};
export const getStats = (): { available: number; pending: number; crossMatching: number; total: number; issued: number; expired: number } => ({
  available: 0,
  pending: 0,
  crossMatching: 0,
  total: 0,
  issued: 0,
  expired: 0,
});
export const addUnit = (unit: Record<string, unknown>) => {
  void unit;
  return Promise.resolve({ success: true });
};
export const createRequest = (req: Record<string, unknown>) => {
  void req;
  return Promise.resolve({ success: true });
};
export const crossMatch = (id: string, data: Record<string, unknown>) => {
  void id;
  void data;
  return Promise.resolve({ success: true, crossMatchResult: 'Compatible' });
};
export const issueUnits = (id: string, unitIds: string[]) => {
  void id;
  void unitIds;
  return Promise.resolve({ success: true });
};
export const startTransfusion = (id: string, data: Record<string, unknown>) => {
  void id;
  void data;
  return Promise.resolve({ success: true });
};
export const completeTransfusion = (id: string) => {
  void id;
  return Promise.resolve({ success: true });
};
export const reportReaction = (id: string, data: Record<string, unknown>) => {
  void id;
  void data;
  return Promise.resolve({ success: true });
};
