/**
 * Analytics Dashboard — ported from client/src/pages/admin/AdminAnalytics.jsx
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users, Stethoscope, CalendarDays, IndianRupee } from 'lucide-react';
import { dashboard, users as usersApi } from '@/lib/api';

interface StatRes { stats?: { todayAppointments?: number; revenue?: number }; weeklyAppointments?: { day: string; count: number }[]; revenueData?: { month: string; revenue: number }[]; departmentData?: { name: string; value: number }[] }

export default function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hospital_admin', 'stats'],
    queryFn: () => dashboard.getStats() as Promise<StatRes>,
    staleTime: 60_000,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['hospital_admin', 'users'],
    queryFn: async () => {
      const res = await usersApi.get({});
      const arr = (res as unknown as { data?: unknown[] })?.data ?? res;
      return Array.isArray(arr) ? arr : [];
    },
    staleTime: 60_000,
  });

  if (statsLoading || usersLoading)
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const filterByRole = (role: string) => (users as { role?: string }[]).filter((u) => u.role === role).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground">System-wide metrics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Patients</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filterByRole('patient')}</p>
          <p className="text-xs text-muted-foreground mt-1">Registered patients</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-info" />
            </div>
            <span className="text-sm text-muted-foreground">Total Doctors</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{filterByRole('doctor')}</p>
          <p className="text-xs text-muted-foreground mt-1">Onboard doctors</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Appointments</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.stats?.todayAppointments ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Today</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-warning" />
            </div>
            <span className="text-sm text-muted-foreground">Revenue</span>
          </div>
          <p className="text-2xl font-bold text-foreground">₹{(stats?.stats?.revenue ?? 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Month to date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Weekly Appointments
          </h3>
          {(stats?.weeklyAppointments?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No data available</p>
          ) : (
            <div className="space-y-2">
              {(stats?.weeklyAppointments ?? []).map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-12">{d.day}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, d.count * 10)}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trend</h3>
          {(stats?.revenueData?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data</p>
          ) : (
            <div className="space-y-2">
              {(stats?.revenueData ?? []).map((r) => (
                <div key={r.month} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">{r.month}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div className="bg-success h-full rounded-full" style={{ width: `${Math.min(100, (r.revenue / 100000) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold">₹{r.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
          {(stats?.departmentData?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No department data</p>
          ) : (
            <div className="space-y-2">
              {(stats?.departmentData ?? []).map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5] }} />
                  <span className="text-sm text-foreground flex-1">{d.name}</span>
                  <span className="text-sm font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">User Distribution</h3>
          <div className="space-y-2">
            {[
              { name: 'Patients', value: filterByRole('patient') },
              { name: 'Doctors', value: filterByRole('doctor') },
              { name: 'Clinic Doctors', value: filterByRole('clinic_doctor') },
              { name: 'Admins', value: filterByRole('hospital_admin') },
              { name: 'Lab Owners', value: filterByRole('lab_owner') },
              { name: 'Pharmacy Owners', value: filterByRole('pharmacy_owner') },
            ].map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{d.name}</span>
                <span className="text-sm font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
