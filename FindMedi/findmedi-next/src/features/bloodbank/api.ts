/**
 * Blood Bank feature — API wrappers.
 * Placeholder implementations — real endpoints should be added to @/lib/api when the backend is ready.
 */
export const getUnits = (search = '') => [];
export const getRequests = (search = '') => [];
export const getStats = (): { available: number; pending: number; crossMatching: number; total: number; issued: number; expired: number } => ({
  available: 0,
  pending: 0,
  crossMatching: 0,
  total: 0,
  issued: 0,
  expired: 0,
});
export const addUnit = (unit: any) => Promise.resolve({ success: true });
export const createRequest = (req: any) => Promise.resolve({ success: true });
export const crossMatch = (id: string, data: any) => Promise.resolve({ success: true, crossMatchResult: 'Compatible' });
export const issueUnits = (id: string, unitIds: string[]) => Promise.resolve({ success: true });
export const startTransfusion = (id: string, data: any) => Promise.resolve({ success: true });
export const completeTransfusion = (id: string) => Promise.resolve({ success: true });
export const reportReaction = (id: string, data: any) => Promise.resolve({ success: true });