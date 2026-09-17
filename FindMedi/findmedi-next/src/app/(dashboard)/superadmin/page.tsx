'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  PlatformKPICards,
  FinancialMetricsCards,
  WeeklyActivityChart,
  MonthlyRevenueChart,
  GovernanceActions,
} from '@/components/superadmin';

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

        const dashVal = (dash.status === 'fulfilled' ? dash.value : null) as {
          stats?: Record<string, unknown>;
          weeklyAppointments?: { day: string; count: number }[];
          revenueData?: { month: string; revenue: number }[];
          [key: string]: unknown;
        } | null;
        const commVal = commission.status === 'fulfilled' ? commission.value : null;
        const hospVal = hospitals.status === 'fulfilled' ? hospitals.value : null;
        const userVal = users.status === 'fulfilled' ? users.value : null;
        const pendingVal = pendingHosp.status === 'fulfilled' ? pendingHosp.value : [];
        const facVal = facilities.status === 'fulfilled' ? facilities.value : null;

        setData({
          stats: (dashVal?.stats || dashVal || undefined) as SuperAdminStats['stats'],
          weeklyAppointments: dashVal?.weeklyAppointments || [
            { day: 'Mon', count: 12 },
            { day: 'Tue', count: 19 },
            { day: 'Wed', count: 15 },
            { day: 'Thu', count: 22 },
            { day: 'Fri', count: 28 },
            { day: 'Sat', count: 14 },
            { day: 'Sun', count: 8 },
          ],
          revenueData: dashVal?.revenueData || [],
          commission: commVal,
          hospitalCount: (hospVal as { total?: number })?.total || (Array.isArray(hospVal) ? hospVal.length : 0),
          userCount: (userVal as { total?: number })?.total || (Array.isArray(userVal) ? userVal.length : 0),
          facilityCount: (facVal as { total?: number })?.total || (Array.isArray(facVal) ? facVal.length : 0),
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
    return () => {
      mounted.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, weeklyAppointments, commission, hospitalCount, userCount, facilityCount, pendingCount } =
    data || {
      stats: {},
      weeklyAppointments: [],
      commission: null,
      hospitalCount: 0,
      userCount: 0,
      facilityCount: 0,
      pendingCount: 0,
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live platform KPIs, governance & ecosystem metrics at a glance
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          Updated just now
        </Badge>
      </div>

      <PlatformKPICards
        hospitalCount={hospitalCount}
        facilityCount={facilityCount}
        userCount={userCount}
        todayAppointments={stats?.todayAppointments}
      />

      <FinancialMetricsCards
        totalEarnings={commission?.totalEarnings || stats?.revenue}
        pendingPayoutAmount={commission?.pendingPayoutAmount}
        totalDoctors={stats?.totalDoctors}
        pendingCount={pendingCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WeeklyActivityChart weeklyAppointments={weeklyAppointments} />
        <MonthlyRevenueChart monthlyTrend={commission?.monthlyTrend} />
      </div>

      <GovernanceActions pendingCount={pendingCount} />
    </div>
  );
}
