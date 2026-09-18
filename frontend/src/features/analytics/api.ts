/** Analytics feature — API wrappers (placeholder). */
import type { AnalyticsStats } from './types';
export const getAnalyticsStats = (): Promise<AnalyticsStats> => Promise.resolve({ totalPatients: 0, totalDoctors: 0, todayAppointments: 0, revenue: 0, weeklyAppointments: [], revenueData: [], departmentData: [] });
export const getAnalyticsUsers = (): Promise<unknown[]> => Promise.resolve([]);
