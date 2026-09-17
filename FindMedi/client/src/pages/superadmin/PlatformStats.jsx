import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, CheckCircle, Clock, XCircle, Ban, TrendingUp, BarChart3,
  Activity, DollarSign, Users, Stethoscope, CalendarDays, ArrowUp, ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

const statusColors = {
  approved: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  rejected: 'bg-destructive/10 text-destructive',
  suspended: 'bg-muted-foreground/10 text-muted-foreground',
};

export default function PlatformStats() {
  const [allHospitals, setAllHospitals] = useState([]);
  const [trendData, setTrendData] = useState(null);
  const [commissionStats, setCommissionStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [hData, dashData, commData] = await Promise.all([
          api.getHospitals({}),
          api.dashboardStats(),
          api.getCommissionStats().catch(() => null),
        ]);
        setAllHospitals(hData?.hospitals || hData?.data || hData || []);
        setTrendData(dashData);
        setCommissionStats(commData);
      } catch { toast.error('Failed to load stats'); }
      setLoading(false);
    };
    load();
  }, []);

  const stats = {
    total: allHospitals.length,
    approved: allHospitals.filter(h => h.status === 'approved').length,
    pending: allHospitals.filter(h => h.status === 'pending').length,
    rejected: allHospitals.filter(h => h.status === 'rejected').length,
    suspended: allHospitals.filter(h => h.status === 'suspended').length,
  };

  const maxStat = Math.max(stats.approved, stats.pending, stats.rejected, stats.suspended, 1);
  const weeklyData = trendData?.weeklyAppointments || [];
  const maxWeekly = Math.max(...weeklyData.map(w => w.count), 1);
  const revenueTrend = trendData?.revenueData || commissionStats?.monthlyTrend || [];
  const maxRevenue = Math.max(...revenueTrend.map(r => r.revenue || r.earnings || 0), 1);

  const growthRate = weeklyData.length >= 2
    ? ((weeklyData[weeklyData.length - 1].count - weeklyData[0].count) / Math.max(weeklyData[0].count, 1) * 100).toFixed(1)
    : null;

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Platform Statistics</h1>
        <p className="text-sm text-muted-foreground mt-1">Growth trends, activity metrics & facility distribution</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Hospitals', value: stats.total, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Suspended', value: stats.suspended, icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted-foreground/10' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Weekly Appointment Volume
              {growthRate && (
                <Badge variant="outline" className={`ml-auto text-xs gap-1 ${Number(growthRate) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {Number(growthRate) >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(growthRate)}%
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No appointment data yet</div>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {weeklyData.map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-medium text-foreground">{w.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-primary/60 to-primary/30 rounded-t-lg transition-all duration-500 hover:from-primary/80"
                      style={{ height: `${(w.count / maxWeekly) * 100}%`, minHeight: w.count > 0 ? '12px' : '4px' }}
                    />
                    <span className="text-[10px] text-muted-foreground">{w.day}</span>
                  </div>
                ))}
              </div>
            )}
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
            {revenueTrend.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No revenue data yet</div>
            ) : (
              <div className="space-y-2">
                {revenueTrend.map((m, i) => {
                  const val = m.revenue || m.earnings || 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{m.month || m._id || `Month ${i + 1}`}</span>
                        <span className="text-muted-foreground">₹{val.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(val / maxRevenue) * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.total === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">No hospitals registered yet</div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Approved', value: stats.approved, color: 'bg-success' },
                { label: 'Pending', value: stats.pending, color: 'bg-warning' },
                { label: 'Rejected', value: stats.rejected, color: 'bg-destructive' },
                { label: 'Suspended', value: stats.suspended, color: 'bg-muted-foreground' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.value}</span>
                      <span className="text-xs text-muted-foreground/60">({stats.total > 0 ? (item.value / stats.total * 100).toFixed(1) : 0}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / maxStat) * 100}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={`h-full rounded-full ${item.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {commissionStats?.sourceBreakdown && commissionStats.sourceBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Revenue by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {commissionStats.sourceBreakdown.map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/50">
                  <p className="text-lg font-bold text-foreground">₹{(s.earnings || s.amount || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{s._id || s.source || 'Unknown'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
