import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Pill, ShoppingCart, DollarSign, AlertTriangle,
  Package, Clock, User, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/StatCard';

const MOCK_DATA = {
  stats: {
    totalMedicines: 1247,
    activeOrders: 48,
    todayRevenue: 28450,
    lowStockItems: 12,
  },
  recentOrders: [
    { _id: 'o1', orderId: '#ORD-001', customer: 'Sarah Johnson', items: 3, total: 1250, status: 'Completed', time: '10:00 AM' },
    { _id: 'o2', orderId: '#ORD-002', customer: 'Mike Chen', items: 1, total: 450, status: 'Processing', time: '11:30 AM' },
    { _id: 'o3', orderId: '#ORD-003', customer: 'Emma Wilson', items: 5, total: 2320, status: 'Completed', time: '2:00 PM' },
    { _id: 'o4', orderId: '#ORD-004', customer: 'James Brown', items: 2, total: 890, status: 'Pending', time: '3:30 PM' },
    { _id: 'o5', orderId: '#ORD-005', customer: 'Lisa Davis', items: 4, total: 1670, status: 'Cancelled', time: '4:00 PM' },
  ],
  lowStock: [
    { _id: 'ls1', name: 'Amoxicillin 500mg', batch: 'B202401', stock: 15, minLevel: 50 },
    { _id: 'ls2', name: 'Paracetamol 500mg', batch: 'B202402', stock: 22, minLevel: 100 },
    { _id: 'ls3', name: 'Omeprazole 20mg', batch: 'B202403', stock: 8, minLevel: 40 },
    { _id: 'ls4', name: 'Atorvastatin 10mg', batch: 'B202404', stock: 12, minLevel: 60 },
  ],
};

const statusColors = {
  Completed: 'bg-success/10 text-success',
  Processing: 'bg-info/10 text-info',
  Pending: 'bg-warning/10 text-warning',
  Cancelled: 'bg-destructive/10 text-destructive',
};

export default function PharmacyBusinessDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(MOCK_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(MOCK_DATA);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, recentOrders, lowStock } = data;

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Pharmacy Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>! Here's your pharmacy overview.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
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
          value={stats?.activeOrders ?? '—'}
          change="8 pending fulfillment"
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="text-warning"
          iconBg="bg-warning/10"
        />
        <StatCard
          title="Today's Revenue"
          value={`Rs ${(stats?.todayRevenue ?? 0).toLocaleString()}`}
          change="+15% vs yesterday"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.lowStockItems ?? '—'}
          change="Needs immediate attention"
          changeType="negative"
          icon={AlertTriangle}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
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
                  <th className="text-center py-3 px-2 text-muted-foreground font-medium">Items</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Total</th>
                  <th className="text-right py-3 px-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders?.map((order, i) => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <span className="font-medium text-card-foreground">{order.orderId}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                          {order.customer?.charAt(0)}
                        </div>
                        <span className="text-muted-foreground">{order.customer}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-muted-foreground">{order.items}</td>
                    <td className="py-3 px-2 text-right font-medium text-card-foreground">Rs {order.total?.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {order.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-semibold text-lg text-card-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Low Stock Alerts
            </h3>
            <Link to="/pharmacy-business/inventory" className="text-xs text-primary hover:underline">Manage</Link>
          </div>
          <div className="space-y-3">
            {lowStock?.map((item, i) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between p-3 bg-destructive/5 rounded-xl border border-destructive/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Batch: {item.batch}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-destructive">{item.stock}</p>
                  <p className="text-xs text-muted-foreground">Min: {item.minLevel}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
