/**
 * Diagnostic — admin view of diagnostic services, ported from DiagnosticDashboard.jsx overview.
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Beaker, CalendarDays, FileText, FlaskConical, Package, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { lab, tests } from '@/lib/api';

export default function DiagnosticPage() {
  const [search] = useState('');

  const { data: ordersData } = useQuery({
    queryKey: ['admin-diagnostic-orders', search],
    queryFn: async () => {
      const res = await lab.getOrders({ ...(search ? { search } : {}) });
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: testsData } = useQuery({
    queryKey: ['admin-diagnostic-tests'],
    queryFn: async () => {
      const res = await tests.get({});
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-diagnostic-stats'],
    queryFn: () => lab.getStats() as Promise<Record<string, number>>,
  });

  const orders = (ordersData as unknown[]) ?? [];
  const testList = (testsData as unknown[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diagnostic Center</h1>
        <p className="text-muted-foreground">Overview of lab orders, tests, and performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold">{stats?.totalOrders ?? orders.length}</p>
            </div>
            <FileText className="w-8 h-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tests</p>
              <p className="text-2xl font-bold">{testList.length}</p>
            </div>
            <FlaskConical className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{stats?.pendingOrders ?? 0}</p>
            </div>
            <Activity className="w-8 h-8 text-amber-500/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{stats?.completedOrders ?? 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-success/30" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="w-5 h-5" /> Recent Orders
            </CardTitle>
            <CardDescription>Latest lab orders</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No orders found</p>
            ) : (
              <div className="space-y-2">
                {(orders as { _id: string; patientName?: string; status?: string }[]).slice(0, 5).map((o) => (
                  <div key={o._id} className="flex items-center justify-between p-3 rounded-xl border border-border/40">
                    <span className="text-sm font-medium">{o.patientName ?? o._id.slice(0, 8)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{o.status ?? 'Pending'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Test Catalog Snapshot
            </CardTitle>
            <CardDescription>Available tests</CardDescription>
          </CardHeader>
          <CardContent>
            {testList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No tests found</p>
            ) : (
              <div className="space-y-2">
                {(testList as { _id: string; name: string; category?: string }[]).slice(0, 5).map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-3 rounded-xl border border-border/40">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.category ?? ''}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> Quick Links
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <a href="/admin/test-catalog" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">
            Test Catalog
          </a>
          <a href="/admin/lab-settings" className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-sm">
            Lab Settings
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
