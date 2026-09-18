'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  CalendarCheck,
  Users,
  IndianRupee,
  FlaskConical,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AnalyticsAppointment {
  _id?: string;
  patient?: string;
  status?: string;
  date?: string;
  createdAt?: string;
}

interface AnalyticsPatient {
  _id?: string;
  name?: string;
  patient?: string;
}

interface AnalyticsBill {
  _id?: string;
  patient?: string;
  amount?: number;
  paid?: number;
  status?: string;
  date?: string;
  createdAt?: string;
}

interface AnalyticsLabBooking {
  _id?: string;
  status?: string;
  date?: string;
  createdAt?: string;
}

interface ClinicAnalyticsData {
  appointments: AnalyticsAppointment[];
  patients: AnalyticsPatient[];
  bills: AnalyticsBill[];
  labBookings: AnalyticsLabBooking[];
}

const EMPTY_DATA: ClinicAnalyticsData = { appointments: [], patients: [], bills: [], labBookings: [] };

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-52 bg-muted/60 rounded-lg" />
          <div className="h-3 w-64 bg-muted/40 rounded-md mt-2" />
        </div>
        <div className="h-10 w-28 bg-muted/50 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-3">
            <div className="h-5 w-24 bg-muted/50 rounded-md" />
            <div className="h-8 w-20 bg-muted/60 rounded-lg" />
            <div className="h-3 w-28 bg-muted/40 rounded-md" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 rounded-2xl border border-border/40 bg-muted/20" />
        ))}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-success/10 text-success',
  Confirmed: 'bg-info/10 text-info',
  Pending: 'bg-warning/10 text-warning',
  Cancelled: 'bg-destructive/10 text-destructive',
  Paid: 'bg-success/10 text-success',
};

export default function ClinicAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<ClinicAnalyticsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await api.getDoctorAnalytics();
        setData({
          appointments: toArray<AnalyticsAppointment>(res?.appointments),
          patients: toArray<AnalyticsPatient>(res?.patients),
          bills: toArray<AnalyticsBill>(res?.bills),
          labBookings: toArray<AnalyticsLabBooking>(res?.labBookings),
        });
        if (isRefresh) toast.success('Analytics refreshed');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (user?.name) {
      void load();
    } else {
      setLoading(false);
    }
  }, [user?.name, load]);

  const stats = useMemo(() => {
    const completed = data.appointments.filter((a) => a.status === 'Completed').length;
    const pending = data.appointments.filter((a) => a.status === 'Pending').length;
    const totalBilled = data.bills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    const totalCollected = data.bills.reduce(
      (sum, b) => sum + (Number(b.paid) || (b.status === 'Paid' ? Number(b.amount) || 0 : 0)),
      0,
    );
    const completionRate =
      data.appointments.length > 0 ? Math.round((completed / data.appointments.length) * 100) : 0;
    return { completed, pending, totalBilled, totalCollected, completionRate };
  }, [data]);

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of data.appointments) {
      const key = a.status || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const total = data.appointments.length || 1;
    return [...counts.entries()]
      .map(([status, count]) => ({ status, count, pct: Math.round((count / total) * 100) }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 6);
  }, [data.appointments]);

  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short' });
      buckets.set(key, 0);
    }
    for (const a of data.appointments) {
      const raw = a.date ?? a.createdAt;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toLocaleString('default', { month: 'short' });
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].map(([month, count]) => ({ month, count }));
  }, [data.appointments]);

  const maxTrend = Math.max(1, ...monthlyTrend.map((t) => t.count));
  const recentAppointments = useMemo(() => data.appointments.slice(0, 8), [data.appointments]);

  if (loading) return <AnalyticsSkeleton />;

  const cards = [
    {
      label: 'Appointments',
      value: data.appointments.length,
      sub: `${stats.completed} completed · ${stats.pending} pending`,
      icon: CalendarCheck,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      label: 'Patients',
      value: data.patients.length,
      sub: 'Unique patients seen',
      icon: Users,
      iconClass: 'bg-info/10 text-info',
    },
    {
      label: 'Revenue Collected',
      value: `₹${stats.totalCollected.toLocaleString('en-IN')}`,
      sub: `of ₹${stats.totalBilled.toLocaleString('en-IN')} billed`,
      icon: IndianRupee,
      iconClass: 'bg-success/10 text-success',
    },
    {
      label: 'Lab Bookings',
      value: data.labBookings.length,
      sub: 'Tests ordered via clinic',
      icon: FlaskConical,
      iconClass: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> Clinic Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Appointments, patients, revenue and lab activity at a glance
          </p>
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.iconClass}`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  {c.label === 'Appointments' && (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="w-3 h-3" /> {stats.completionRate}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">{c.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appointments by Status</CardTitle>
            <CardDescription>Distribution across the selected period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No appointment data yet</p>
            ) : (
              statusBreakdown.map((s) => (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <Badge className={STATUS_STYLES[s.status] ?? 'bg-muted text-muted-foreground'}>
                      {s.status}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {s.count} · {s.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Appointments over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-44">
              {monthlyTrend.map((t) => (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-foreground">{t.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (t.count / maxTrend) * 100)}%` }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-10 rounded-t-lg bg-primary/80 min-h-1"
                  />
                  <span className="text-[11px] text-muted-foreground">{t.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Recent Appointments
          </CardTitle>
          <CardDescription>Latest {recentAppointments.length} appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No appointments recorded yet</p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentAppointments.map((a) => (
                <div key={a._id ?? `${a.patient}-${a.date}`} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{a.patient || 'Patient'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(a.date ?? a.createdAt)}</p>
                  </div>
                  <Badge className={STATUS_STYLES[a.status ?? ''] ?? 'bg-muted text-muted-foreground'}>
                    {a.status || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
