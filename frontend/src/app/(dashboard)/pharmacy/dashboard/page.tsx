'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Pill, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import StatCard from '@/components/shared/cards/StatCard';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';
import {
  OrdersHub,
  LowStockAlerts,
  ReturnsSection,
  PlatformSettingsSection,
  type PharmacyOrderItem,
  type MedicineItem,
  type ReturnItem,
  type OrderTabType,
} from '@/components/pharmacy';

interface PharmacyStats {
  totalMedicines?: number;
  totalOrders?: number;
  revenue?: number;
  lowStock?: number;
}

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Ready: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Cancelled: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default function PharmacyBusinessDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [orders, setOrders] = useState<PharmacyOrderItem[]>([]);
  const [orderTab, setOrderTab] = useState<OrderTabType>('pending');
  const [lowStock, setLowStock] = useState<MedicineItem[]>([]);
  const [refunds, setRefunds] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getPharmacyStats(),
          api.getPharmacyOrders({} as Record<string, unknown>),
          api.getPharmacyMedicines({ lowStock: 'true' } as Record<string, unknown>),
          api.getPharmacyReturns({} as Record<string, unknown>),
        ]);
        if (!mounted.current) return;
        const [s, o, m, rf] = results.map((res) => (res.status === 'fulfilled' ? res.value : null));
        setStats(s as PharmacyStats);
        const orderList = (o as { orders?: PharmacyOrderItem[] })?.orders || [];
        setOrders(orderList);
        setLowStock(((m as { medicines?: MedicineItem[] })?.medicines || []).slice(0, 5));
        setRefunds(
          (
            (rf as { returns?: ReturnItem[]; data?: ReturnItem[] })?.returns ||
            (rf as { returns?: ReturnItem[]; data?: ReturnItem[] })?.data ||
            []
          ).slice(0, 5)
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load dashboard data');
      }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => {
      mounted.current = false;
    };
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingOrders = orders.filter((o) => (o.status || '').toLowerCase() === 'pending');
  const processingOrders = orders.filter(
    (o) => (o.status || '').toLowerCase() === 'processing' || (o.status || '').toLowerCase() === 'ready'
  );
  const todayOrders = orders.filter((o) => (o.createdAt || o.date || '').startsWith(todayStr));
  const completedOrders = orders.filter(
    (o) => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered'
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LicenseExpiryReminder />
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-heading">Pharmacy Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here&apos;s your
            pharmacy overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Medicines"
          value={stats?.totalMedicines?.toLocaleString() ?? '—'}
          change="+24 new this month"
          changeType="positive"
          icon={Pill}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Active Orders"
          value={stats?.totalOrders ?? '—'}
          change={`${pendingOrders.length} pending fulfillment`}
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          title="Today's Revenue"
          value={`₹${(stats?.revenue ?? 0).toLocaleString()}`}
          change="+15% vs yesterday"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStock ?? '—'}
          change="Needs immediate attention"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-rose-500"
          iconBg="bg-rose-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OrdersHub
          orders={orders}
          orderTab={orderTab}
          setOrderTab={setOrderTab}
          pendingOrders={pendingOrders}
          processingOrders={processingOrders}
          todayOrders={todayOrders}
          completedOrders={completedOrders}
          statusColors={statusColors}
        />
        <LowStockAlerts lowStock={lowStock} />
      </div>

      <ReturnsSection refunds={refunds} />

      <PlatformSettingsSection
        totalOrders={stats?.totalOrders}
        totalMedicines={stats?.totalMedicines}
      />
    </div>
  );
}
