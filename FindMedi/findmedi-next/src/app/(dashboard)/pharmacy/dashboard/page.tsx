'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Pill, ShoppingCart, DollarSign, AlertTriangle,
  Package, RotateCcw, Globe, Save, Building2, Users, CheckCircle, AlertCircle,
  CalendarClock, CalendarDays, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import StatCard from '@/components/shared/cards/StatCard';
import LicenseExpiryReminder from '@/components/shared/sections/LicenseExpiryReminder';

interface PharmacyStats {
  totalMedicines?: number;
  totalOrders?: number;
  revenue?: number;
  lowStock?: number;
}

interface PharmacyOrderItem {
  _id: string;
  orderId?: string;
  patientName?: string;
  customer?: string;
  total?: number;
  amount?: number;
  status: string;
  createdAt?: string;
  date?: string;
}

interface MedicineItem {
  _id: string;
  name: string;
  batchNumber?: string;
  batch?: string;
  currentStock?: number;
  stock?: number;
  reorderLevel?: number;
  minLevel?: number;
}

interface ReturnItem {
  _id: string;
  returnId?: string;
  patientName?: string;
  customer?: string;
  total?: number;
  refundAmount?: number;
  status: string;
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
  const [orderTab, setOrderTab] = useState<'pending' | 'processing' | 'today' | 'completed'>('pending');
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
        const [s, o, m, rf] = results.map(res => res.status === 'fulfilled' ? res.value : null);
        setStats(s as PharmacyStats);
        const orderList = (o as { orders?: PharmacyOrderItem[] })?.orders || [];
        setOrders(orderList);
        setLowStock(((m as { medicines?: MedicineItem[] })?.medicines || []).slice(0, 5));
        setRefunds(((rf as { returns?: ReturnItem[]; data?: ReturnItem[] })?.returns || (rf as { returns?: ReturnItem[]; data?: ReturnItem[] })?.data || []).slice(0, 5));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load dashboard data');
      }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => { mounted.current = false; };
  }, []);

  const totalRefunded = refunds.reduce((s, r) => s + (r.total || r.refundAmount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const pendingOrders = orders.filter(o => (o.status || '').toLowerCase() === 'pending');
  const processingOrders = orders.filter(o => (o.status || '').toLowerCase() === 'processing' || (o.status || '').toLowerCase() === 'ready');
  const todayOrders = orders.filter(o => (o.createdAt || o.date || '').startsWith(todayStr));
  const completedOrders = orders.filter(o => (o.status || '').toLowerCase() === 'completed' || (o.status || '').toLowerCase() === 'delivered');

  const displayedOrders = orderTab === 'pending' ? pendingOrders
    : orderTab === 'processing' ? processingOrders
    : orderTab === 'today' ? todayOrders
    : completedOrders;

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
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here&apos;s your pharmacy overview.
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
        <div className="lg:col-span-2 bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-lg text-card-foreground">Pharmacy Orders Hub</h3>
                <p className="text-xs text-muted-foreground">Fulfill and track customer orders across 4 stages</p>
              </div>
            </div>

            {/* 4 Tabs: Pending, Processing, Today, Completed */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-2xl border border-border/50 overflow-x-auto">
              <button
                type="button"
                onClick={() => setOrderTab('pending')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  orderTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pending</span>
                {pendingOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${orderTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'}`}>
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOrderTab('processing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  orderTab === 'processing'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                <span>Processing</span>
                {processingOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${orderTab === 'processing' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                    {processingOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOrderTab('today')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  orderTab === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Today</span>
                {todayOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${orderTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'}`}>
                    {todayOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOrderTab('completed')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  orderTab === 'completed'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Completed</span>
                {completedOrders.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${orderTab === 'completed' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'}`}>
                    {completedOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Order</th>
                  <th className="text-left py-3 px-2 text-muted-foreground font-medium">Customer</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.slice(0, 5).map((order, i) => (
                  <motion.tr
                    key={order._id || i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <span className="font-medium text-card-foreground">{order.orderId || order._id?.slice(-6)}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                          {(order.patientName || '?').charAt(0)}
                        </div>
                        <span className="text-muted-foreground">{order.patientName || order.customer || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-card-foreground">₹{(order.total || order.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                        {order.status || 'Pending'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {displayedOrders.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No {orderTab} orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <Link href="/pharmacy/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All In Orders <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Low Stock Alerts
            </h3>
            <Link href="/pharmacy/medicines" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {lowStock.map((item, i) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Batch: {item.batchNumber || item.batch || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-destructive">{item.currentStock ?? item.stock ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Min: {item.reorderLevel ?? item.minLevel ?? 0}</p>
                </div>
              </motion.div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">All items well-stocked</p>
            )}
          </div>
        </div>
      </div>

      {/* Refund Section */}
      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds & Returns
          </h3>
          <Link href="/pharmacy/returns" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4">
            <p className="text-2xl font-bold text-destructive">₹{totalRefunded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Refunded</p>
          </div>
          <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
            <p className="text-2xl font-bold text-amber-600">{pendingRefunds}</p>
            <p className="text-xs text-muted-foreground">Pending Returns</p>
          </div>
          <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
            <p className="text-2xl font-bold text-blue-600">{refunds.length}</p>
            <p className="text-xs text-muted-foreground">Total Returns</p>
          </div>
        </div>
        {refunds.length > 0 ? (
          <div className="space-y-3">
            {refunds.map((r, i) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{r.returnId || r._id}</p>
                  <p className="text-xs text-muted-foreground">Patient: {r.patientName || r.customer || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-destructive">₹{(r.total || r.refundAmount || 0).toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Refunded' ? 'bg-destructive/10 text-destructive' : r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {r.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No returns or refunds</p>
          </div>
        )}
      </div>

      {/* Platform Settings Section */}
      <div className="bg-card rounded-2xl border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Platform Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
            <p className="text-2xl font-bold text-emerald-600">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.totalOrders ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-4">
            <p className="text-2xl font-bold text-blue-600">{stats?.totalMedicines ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Total Medicines</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Auto Confirm Orders</p>
                <p className="text-xs text-muted-foreground">Automatically confirm orders after payment</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Customer Self-Registration</p>
                <p className="text-xs text-muted-foreground">Allow customers to register without approval</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Prescription Validation</p>
                <p className="text-xs text-muted-foreground">Require prescription verification for controlled medicines</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-card-foreground">Delivery Integration</p>
                <p className="text-xs text-muted-foreground">Enable third-party delivery for medicine orders</p>
              </div>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
          <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
        </div>
      </div>
    </div>
  );
}
