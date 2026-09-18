import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Users, Stethoscope, Activity, DollarSign, Building2, FlaskConical, Pill,
  Clock, AlertTriangle, CalendarDays, BarChart3, Hospital, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

export default function PlatformKPIs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, commission, hospitals, users, pendingHosp, facilities] = await Promise.all([
          api.dashboardStats(),
          api.getCommissionStats().catch(() => null),
          api.getHospitals({ limit: 1 }).catch(() => null),
          api.getUsers({ limit: 1 }).catch(() => null),
          api.getPendingHospitals().catch(() => null),
          api.getFacilities({ limit: 1 }).catch(() => null),
        ]);
        setData({
          stats: dash.stats || dash,
          weeklyAppointments: dash.weeklyAppointments || [],
          revenueData: dash.revenueData || [],
          commission: commission,
          hospitalCount: hospitals?.total || 0,
          userCount: users?.total || 0,
          facilityCount: facilities?.total || 0,
          pendingCount: pendingHosp?.length || 0,
        });
      } catch { toast.error('Failed to load platform KPIs'); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const { stats, weeklyAppointments, commission, hospitalCount, userCount, facilityCount, pendingCount } = data;

  const maxWeekly = Math.max(...weeklyAppointments.map(w => w.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Live platform KPIs at a glance</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          Updated just now
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Hospital className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(hospitalCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Hospitals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(facilityCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Clinics, Labs & Pharmacies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(userCount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.todayAppointments || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Today's Bookings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.totalEarnings || stats?.revenue || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Platform Commission Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">₹{(commission?.pendingPayoutAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending Payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-2xl font-bold text-foreground">{(stats?.totalDoctors || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Doctors</p>
          </CardContent>
        </Card>
        <Card>
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
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Weekly Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {weeklyAppointments.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full bg-primary/20 dark:bg-primary/30 rounded-t-lg transition-all duration-500"
                    style={{ height: `${(w.count / maxWeekly) * 100}%`, minHeight: w.count > 0 ? '8px' : '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{w.day}</span>
                  <span className="text-[10px] font-medium text-foreground">{w.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Monthly Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {commission?.monthlyTrend && commission.monthlyTrend.length > 0 ? (
              <div className="space-y-2">
                {commission.monthlyTrend.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">{m.month || m._id}</span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${(m.earnings || m.revenue || 0) / Math.max(...commission.monthlyTrend.map(x => x.earnings || x.revenue || 0), 1) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-20 text-right">₹{((m.earnings || m.revenue || 0)).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <a href="#/superadmin/pending" className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors">
              <Clock className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Review Pending{pendingCount > 0 && ` (${pendingCount})`}</span>
            </a>
            <a href="#/superadmin/users" className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Manage Users</span>
            </a>
            <a href="#/superadmin/revenue" className="flex items-center gap-2.5 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 hover:bg-green-100 dark:hover:bg-green-950/40 transition-colors">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-300">Revenue Details</span>
            </a>
            <a href="#/superadmin/tickets" className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
              <Activity className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Support Tickets</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
