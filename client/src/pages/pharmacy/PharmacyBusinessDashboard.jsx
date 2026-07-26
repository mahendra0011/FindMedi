import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Pill, ShoppingCart, DollarSign, AlertTriangle,
  Package, RotateCcw, Globe, Save, Building2, Users, CheckCircle, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          api.getPharmacyStats(),
          api.getPharmacyOrders({}),
          api.getPharmacyMedicines({ lowStock: 'true' }),
          api.getPharmacyReturns({}),
        ]);
        if (!mounted.current) return;
        const [s, o, m, rf] = results.map(res => res.status === 'fulfilled' ? res.value : null);
        setStats(s);
        setRecentOrders((o?.orders || []).slice(0, 5));
        setLowStock((m?.medicines || []).slice(0, 5));
        setRefunds((rf?.returns || rf?.data || []).slice(0, 5));
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) toast.error(`Failed to load ${failed.length} data source(s)`);
      } catch (e) { console.error(e); toast.error('Failed to load dashboard data'); }
      if (mounted.current) setLoading(false);
    };
    load();
    return () => { mounted.current = false; };
  }, []);

  const totalRefunded = refunds.reduce((s, r) => s + (r.total || r.refundAmount || 0), 0);
  const pendingRefunds = refunds.filter(r => r.status === 'Pending' || r.status === 'pending').length;

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

      {/* Refund Section */}
      <div className="bg-card rounded-xl border p-6 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-destructive" /> Refunds & Returns
          </h3>
          <Link to="/pharmacy-business/returns" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-destructive/5 rounded-lg border border-destructive/20 p-4">
            <p className="text-2xl font-bold text-destructive">₹{totalRefunded.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Refunded</p>
          </div>
          <div className="bg-warning/5 rounded-lg border border-warning/20 p-4">
            <p className="text-2xl font-bold text-warning">{pendingRefunds}</p>
            <p className="text-xs text-muted-foreground">Pending Returns</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{refunds.length}</p>
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
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status === 'Refunded' ? 'bg-destructive/10 text-destructive' : r.status === 'Approved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
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
      <div className="bg-card rounded-xl border p-6 shadow-sm mt-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-lg text-card-foreground">Platform Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-success/5 rounded-lg border border-success/20 p-4">
            <p className="text-2xl font-bold text-success">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
          <div className="bg-primary/5 rounded-lg border border-primary/20 p-4">
            <p className="text-2xl font-bold text-primary">{stats?.totalOrders ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="bg-info/5 rounded-lg border border-info/20 p-4">
            <p className="text-2xl font-bold text-info">{stats?.totalMedicines ?? '—'}</p>
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
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
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
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Save className="w-4 h-4" />
            Save Platform Settings
          </button>
          <span className="text-xs text-muted-foreground">Changes apply platform-wide</span>
        </div>
      </div>
    </div>
  );
}
