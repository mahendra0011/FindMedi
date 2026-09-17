'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  TrendingUp, Users, Stethoscope, Activity, DollarSign, Building2,
  Clock, AlertTriangle, BarChart3, Hospital, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface SuperAdminStats {
  stats?: {
    todayAppointments?: number;
    totalDoctors?: number;
    revenue?: number;
  };
  weeklyAppointments: Array<{ day: string; count: number }>;
  revenueData: Array<{ month: string; revenue: number }>;
  commission: {
    totalEarnings?: number;
    pendingPayoutAmount?: number;
    monthlyTrend?: Array<{ month?: string; _id?: string; earnings?: number; revenue?: number }>;
  } | null;
  hospitalCount: number;
  userCount: number;
  facilityCount: number;
  pendingCount: number;
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      try {
        const [dash, commission, hospitals, users, pendingHosp, facilities] = await Promise.allSettled([
          api.dashboardStats(),
          api.getCommissionStats().catch(() => null),
          api.hospitals.get({ limit: 1 }).catch(() => null),
          api.users.get({ limit: 1 }).catch(() => null),
          api.getPendingHospitals().catch(() => null),
          api.facilities.get({ limit: 1 }).catch(() => null),
        ]);

        if (!mounted.current) return;

        const dashVal = dash.status === 'fulfilled' ? dash.value : {};
        const commVal = commission.status === 'fulfilled' ? commission.value : null;
        const hospVal = hospitals.status === 'fulfilled' ? hospitals.value : null;
        const userVal = users.status === 'fulfilled' ? users.value : null;
        const pendingVal = pendingHosp.status === 'fulfilled' ? pendingHosp.value : [];
        const facVal = facilities.status === 'fulfilled' ? facilities.value : null;

        setData({
          stats: dashVal?.stats || dashVal,
          weeklyAppointments: dashVal?.weeklyAppointments || [
            { day: 'Mon', count: 12 }, { day: 'Tue', count: 19 }, { day: 'Wed', count: 15 },
            { day: 'Thu', count: 22 }, { day: 'Fri', count: 28 }, { day: 'Sat', count: 14 }, { day: 'Sun', count: 8 }
          ],
          revenueData: dashVal?.revenueData || [],
          commission: commVal,
          hospitalCount: (hospVal as any)?.total || (Array.isArray(hospVal) ? hospVal.length : 0),
          userCount: (userVal as any)?.total || (Array.isArray(userVal) ? userVal.length : 0),
          facilityCount: (facVal as any)?.total || (Array.isArray(facVal) ? facVal.length : 0),
          pendingCount: Array.isArray(pendingVal) ? pendingVal.length : 0,
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load platform KPIs');
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    load();
    return () => { mounted.current = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, weeklyAppointments, commission, hospitalCount, userCount, facilityCount, pendingCount } = data || {
    stats: {},
    weeklyAppointments: [],
    commission: null,
    hospitalCount: 0,
    userCount: 0,
    facilityCount: 0,
    pendingCount: 0,
  };

  const maxWeekly = Math.max(...weeklyAppointments.map(w => w.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform KPIs, governance & ecosystem metrics at a glance</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Updated just now
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Hospital className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(hospitalCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Hospitals</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(facilityCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Clinics, Labs & Pharmacies</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(userCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Registered Users</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.todayAppointments || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Today&apos;s Bookings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.totalEarnings || stats?.revenue || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Platform Commission</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.pendingPayoutAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Payouts</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.totalDoctors || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Doctors</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(pendingCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Weekly Appointments Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-44 pt-4">
              {weeklyAppointments.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-medium text-foreground">{w.count}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(w.count / maxWeekly) * 100}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="w-full bg-primary/25 hover:bg-primary/40 rounded-t-lg transition-colors cursor-pointer"
                    style={{ minHeight: w.count > 0 ? '8px' : '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{w.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Monthly Revenue Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commission?.monthlyTrend && commission.monthlyTrend.length > 0 ? (
              <div className="space-y-3 pt-2">
                {commission.monthlyTrend.slice(0, 5).map((m, i) => {
                  const val = m.earnings || m.revenue || 0;
                  const maxVal = Math.max(...(commission?.monthlyTrend?.map(x => x.earnings || x.revenue || 0) || [1]), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-12">{m.month || m._id}</span>
                      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${(val / maxVal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-20 text-right">₹{val.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-44 text-sm text-muted-foreground">
                <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                <p>No recent monthly revenue data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Superadmin Governance & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/superadmin/pending"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors"
            >
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Review Pending{pendingCount > 0 && ` (${pendingCount})`}
              </span>
            </Link>
            <Link
              href="/superadmin/users"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Manage Users</span>
            </Link>
            <Link
              href="/superadmin/revenue"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
            >
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Revenue Details</span>
            </Link>
            <Link
              href="/superadmin/tickets"
              className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors"
            >
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Support Tickets</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
