import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Pill, ShoppingCart, DollarSign, AlertTriangle,
  Package, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';
import LicenseExpiryReminder from '@/components/LicenseExpiryReminder';

const statusColors = {
  Completed: 'bg-success/10 text-success',
  Processing: 'bg-info/10 text-info',
  Pending: 'bg-warning/10 text-warning',
  Cancelled: 'bg-destructive/10 text-destructive',
};

export default function PharmacyBusinessDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, o, m] = await Promise.all([
          api.getPharmacyStats(),
          api.getPharmacyOrders({}),
          api.getPharmacyMedicines({ lowStock: 'true' }),
        ]);
        setStats(s);
        setRecentOrders((o.orders || []).slice(0, 5));
        setLowStock((m.medicines || []).slice(0, 5));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <LicenseExpiryReminder />
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Pharmacy Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here's your pharmacy overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
          change={`${stats?.pendingDispense || 0} pending fulfillment`}
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Today's Revenue"
          value={`₹${(stats?.revenue ?? 0).toLocaleString()}`}
          change="+15% vs yesterday"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStock ?? '—'}
          change="Needs immediate attention"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Recent Orders
            </h3>
            <Link to="/pharmacy-business/orders" className="text-xs text-primary hover:underline">View All</Link>
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
                {recentOrders.map((order, i) => (
                  <motion.tr
                    key={order._id}
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
                        {order.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Low Stock Alerts
            </h3>
            <Link to="/pharmacy-business/inventory" className="text-xs text-primary hover:underline">Manage</Link>
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
    </div>
  );
}
