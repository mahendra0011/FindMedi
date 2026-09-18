/**
 * Analytics Reports — extends Analytics Dashboard with export and detailed reports.
 * Ported from AdminAnalytics + Reports pattern.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, TrendingUp, BarChart3, Calendar, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { dashboard, users as usersApi } from '@/lib/api';
import { toast } from 'sonner';

export default function AnalyticsReportsPage() {
  const [range, setRange] = useState('month');

  const { data: stats } = useQuery({
    queryKey: ['analytics-reports', range],
    queryFn: () => dashboard.getStats() as Promise<Record<string, unknown>>,
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['analytics-reports-users'],
    queryFn: async () => {
      const res = await usersApi.get({});
      const arr = (res as unknown as { data?: unknown[] })?.data ?? res;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} report...`);
    // Placeholder: real export would call reports export endpoint
    void stats;
    void users;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground">Detailed performance reports and export</p>
        </div>
        <div className="flex gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" className="gap-2" onClick={() => handleExport('full')}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" /> Revenue Summary
            </CardTitle>
            <CardDescription>Overview for {range}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">₹{Number((stats as { revenue?: number })?.revenue ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Includes all completed transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4" /> Appointments
            </CardTitle>
            <CardDescription>Total appointments in range</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{String((stats as { totalAppointments?: number })?.totalAppointments ?? (stats as { stats?: { todayAppointments?: number } })?.stats?.todayAppointments ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" /> Users
            </CardTitle>
            <CardDescription>Registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">All roles combined</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'patients', title: 'Patients Report', desc: 'Export all patient records', icon: FileSpreadsheet },
          { type: 'doctors', title: 'Doctors Report', desc: 'Export doctor performance', icon: FileSpreadsheet },
          { type: 'billing', title: 'Billing Report', desc: 'Export billing & revenue', icon: IndianRupee },
          { type: 'appointments', title: 'Appointments Report', desc: 'Export appointment logs', icon: Calendar },
        ].map((c) => (
          <Card key={c.type} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <c.icon className="w-4 h-4" /> {c.title}
              </CardTitle>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleExport(c.type)}>
                <Download className="w-3.5 h-3.5" /> Export {c.type}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
