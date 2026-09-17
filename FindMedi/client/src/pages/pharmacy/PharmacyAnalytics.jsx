import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, TrendingUp, IndianRupee, Package, ShoppingCart, BarChart3, Activity, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const generateMockAnalytics = () => ({
  totalMedicines: 0,
  totalOrders: 0,
  revenue: 0,
  pendingDispense: 0,
  lowStock: 0,
  popularMedicines: [
    { name: 'Paracetamol 500mg', count: 234, revenue: 11700 },
    { name: 'Amoxicillin 500mg', count: 187, revenue: 18700 },
    { name: 'Vitamin D3 60K', count: 156, revenue: 15600 },
    { name: 'Omeprazole 20mg', count: 134, revenue: 6700 },
    { name: 'Azithromycin 500mg', count: 112, revenue: 16800 },
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 28000 }, { month: 'Feb', revenue: 32000 },
    { month: 'Mar', revenue: 35000 }, { month: 'Apr', revenue: 31000 },
    { month: 'May', revenue: 38000 }, { month: 'Jun', revenue: 42000 },
    { month: 'Jul', revenue: 39000 }, { month: 'Aug', revenue: 43500 },
    { month: 'Sep', revenue: 37000 }, { month: 'Oct', revenue: 41000 },
    { month: 'Nov', revenue: 44000 }, { month: 'Dec', revenue: 48000 },
  ],
});

export default function PharmacyAnalytics() {
  const [analytics, setAnalytics] = useState(generateMockAnalytics());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getPharmacyStats(),
      api.getPharmacyOrders({}),
    ]).then(([stats, ordersRes]) => {
      const orders = ordersRes.orders || [];
      const medRevenue = {};
      orders.forEach(o => o.items?.forEach(item => {
        medRevenue[item.medicineName] = (medRevenue[item.medicineName] || 0) + (item.price * item.qty);
      }));
      const popular = Object.entries(medRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, revenue], _i) => ({
          name,
          count: orders.filter(o => o.items?.some(i => i.medicineName === name)).length,
          revenue,
        }));
      setAnalytics(prev => ({
        ...prev,
        totalMedicines: stats.totalMedicines || 0,
        totalOrders: stats.totalOrders || 0,
        revenue: stats.revenue || 0,
        pendingDispense: stats.pendingDispense || 0,
        lowStock: stats.lowStock || 0,
        popularMedicines: popular.length > 0 ? popular : prev.popularMedicines,
      }));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...analytics.monthlyRevenue.map(m => m.revenue), 1);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Pharmacy performance overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Pill, label: 'Total Medicines', value: analytics.totalMedicines, color: 'bg-info/10 text-info' },
          { icon: ShoppingCart, label: 'Orders', value: analytics.totalOrders, color: 'bg-success/10 text-success' },
          { icon: IndianRupee, label: 'Revenue (30d)', value: `₹${analytics.revenue?.toLocaleString() || 0}`, color: 'bg-warning/10 text-warning' },
          { icon: Package, label: 'Low Stock Items', value: analytics.lowStock, color: analytics.lowStock > 5 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success' },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-heading text-xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Monthly Revenue Trend
          </h3>
          <div className="space-y-2">
            {analytics.monthlyRevenue.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">{m.month}</span>
                <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full transition-all duration-500"
                    style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right">₹{m.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Best-Selling Medicines
          </h3>
          <div className="space-y-3">
            {analytics.popularMedicines.map((med, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.count} orders</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">₹{med.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}