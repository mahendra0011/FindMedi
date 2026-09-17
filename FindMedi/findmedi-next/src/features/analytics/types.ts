/** Analytics feature — types. */
export interface AnalyticsStats {
  totalPatients: number;
  totalDoctors: number;
  todayAppointments: number;
  revenue: number;
  weeklyAppointments: { day: string; count: number }[];
  revenueData: { month: string; revenue: number }[];
  departmentData: { name: string; value: number }[];
}
export interface UserCount { role: string; count: number }
