/**
 * My Medicine Orders — ported from client/src/pages/patient/PatientMedicineOrders.jsx (Phase 4).
 * Pharmacy order list with status tracking.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ShoppingCart,
  Package,
  Search,
  Calendar,
  Clock,
  Pill,
  IndianRupee,
  MapPin,
  Phone,
  Truck,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pharmacy } from '@/lib/api';

const statusConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  Pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  Shipped: { label: 'Shipped', icon: Truck, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  Delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  Cancelled: { label: 'Cancelled', icon: Clock, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  Processing: { label: 'Processing', icon: Loader2, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

const fallbackStatus = {
  label: 'Pending',
  icon: Clock,
  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const paymentColors: Record<string, string> = {
  Unpaid: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Refunded: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
};

const statusFilters = ['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];

interface OrderItem {
  medicineName?: string;
  qty?: number;
}

interface MedicineOrder {
  _id: string;
  orderId?: string;
  orderDate?: string;
  status?: string;
  paymentStatus?: string;
  total?: number;
  items?: OrderItem[];
  deliveryAddress?: string;
  phone?: string;
  note?: string;
}

export default function MedicineOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const { data: ordersData, isLoading: loading } = useQuery({
    queryKey: ['patient-medicine-orders'],
    queryFn: async (): Promise<MedicineOrder[]> => {
      const res = await pharmacy.getOrders({});
      const arr = (Array.isArray(res) ? res : []) as unknown as MedicineOrder[];
      return arr;
    },
    staleTime: 30_000,
  });

  const orders = ordersData ?? [];
  const filtered = orders.filter((o) => {
    const ms = !search || (o.orderId || '').toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || o.status === filter;
    return ms && mf;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Medicine Orders</h1>
        <p className="text-muted-foreground text-sm">{orders.length} total orders</p>
      </div>

      {orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-3"
        >
          {statusFilters.map((s) => {
            const count = s === 'All' ? orders.length : orders.filter((o) => o.status === s).length;
            const cfg = statusConfig[s] ?? { icon: Package, color: 'text-foreground', bg: 'bg-muted/30' };
            const StatusIcon = cfg.icon || Package;
            const colorParts = cfg.color.split(' ');
            if (s === 'All') {
              return (
                <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Total</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
              );
            }
            return (
              <div key={s} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${colorParts[0] ?? ''} flex items-center justify-center`}>
                    <StatusIcon className={`w-4 h-4 ${colorParts[1] ?? ''}`} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{s}</p>
                </div>
                <p className={`text-2xl font-bold ${colorParts[1] ?? ''}`}>{count}</p>
              </div>
            );
          })}
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {statusFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'
              }`}
            >
              {f} ({f === 'All' ? orders.length : orders.filter((o) => o.status === f).length})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID..."
            className="pl-10 h-10 rounded-xl bg-background border-border/50 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
            {search ? (
              <Search className="w-8 h-8 text-muted-foreground/30" />
            ) : (
              <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
            )}
          </div>
          <p className="text-lg font-semibold text-foreground">{search ? 'No matching orders' : 'No orders yet'}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {search ? 'Try a different order ID or check your filters.' : 'Order medicines from your preferred pharmacy for doorstep delivery.'}
          </p>
          {!search && (
            <Button size="sm" className="mt-4 rounded-xl" onClick={() => router.push('/medicine-store')}>
              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Browse Medicines
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order, i) => {
            const statusInfo = statusConfig[order.status ?? ''] ?? fallbackStatus;
            const StatusIcon = statusInfo.icon;
            const payStatusInfo = paymentColors[order.paymentStatus ?? ''] ?? paymentColors.Unpaid ?? '';

            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <Package className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground text-sm">Order #{order.orderId}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {order.orderDate
                              ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                              : ''}
                          </span>
                          <Clock className="w-3 h-3 ml-1" />
                          <span>
                            {order.orderDate
                              ? new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-bold text-foreground text-sm flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5" />
                        {order.total?.toFixed(2)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${payStatusInfo}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {(order.items?.length ?? 0) > 0 && (
                    <div className="mb-4 p-3 bg-muted/20 rounded-2xl border border-border/30">
                      <p className="text-xs font-medium text-foreground mb-2">Items ({order.items?.length})</p>
                      <div className="space-y-1.5">
                        {order.items?.slice(0, 4).map((item, j) => (
                          <div key={j} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <Pill className="w-3 h-3 text-primary shrink-0" />
                              <span className="text-muted-foreground truncate">{item.medicineName}</span>
                            </div>
                            <span className="font-medium text-foreground ml-2 shrink-0">x{item.qty}</span>
                          </div>
                        ))}
                        {(order.items?.length ?? 0) > 4 && (
                          <p className="text-xs text-primary">+{(order.items?.length ?? 0) - 4} more items</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground p-2.5 bg-muted/10 rounded-xl">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                        <span>{order.deliveryAddress}</span>
                      </div>
                    )}
                    {order.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-muted/10 rounded-xl">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <a href={`tel:${order.phone}`} className="text-primary hover:underline">
                          {order.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {order.note && <p className="text-xs text-muted-foreground/70 mb-4 p-2.5 bg-muted/10 rounded-xl italic">&quot;{order.note}&quot;</p>}

                  <div className="flex items-center justify-end pt-3 border-t border-border/30">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-xl h-8 text-xs border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                      onClick={() => router.push(`/order-tracking/${order._id}`)}
                    >
                      <RefreshCw className="w-3 h-3" /> Track Order
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
