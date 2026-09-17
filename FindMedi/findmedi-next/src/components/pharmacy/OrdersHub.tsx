'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Package, AlertCircle, CalendarClock, CalendarDays, CheckCircle, ChevronRight } from 'lucide-react';

export interface PharmacyOrderItem {
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

export type OrderTabType = 'pending' | 'processing' | 'today' | 'completed';

interface OrdersHubProps {
  orders: PharmacyOrderItem[];
  orderTab: OrderTabType;
  setOrderTab: (tab: OrderTabType) => void;
  pendingOrders: PharmacyOrderItem[];
  processingOrders: PharmacyOrderItem[];
  todayOrders: PharmacyOrderItem[];
  completedOrders: PharmacyOrderItem[];
  statusColors: Record<string, string>;
}

export default function OrdersHub({
  orders,
  orderTab,
  setOrderTab,
  pendingOrders,
  processingOrders,
  todayOrders,
  completedOrders,
  statusColors,
}: OrdersHubProps) {
  const displayedOrders =
    orderTab === 'pending'
      ? pendingOrders
      : orderTab === 'processing'
      ? processingOrders
      : orderTab === 'today'
      ? todayOrders
      : completedOrders;

  return (
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  orderTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-600'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  orderTab === 'processing' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  orderTab === 'today' ? 'bg-white/20 text-white' : 'bg-emerald-600/20 text-emerald-600'
                }`}
              >
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
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  orderTab === 'completed' ? 'bg-white/20 text-white' : 'bg-purple-600/20 text-purple-600'
                }`}
              >
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
                <td className="py-3 px-2 text-right font-medium text-card-foreground">
                  ₹{(order.total || order.amount || 0).toLocaleString()}
                </td>
                <td className="py-3 px-2 text-right">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      statusColors[order.status] || 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {order.status || 'Pending'}
                  </span>
                </td>
              </motion.tr>
            ))}
            {displayedOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                  No {orderTab} orders found
                </td>
              </tr>
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
  );
}
