import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Beaker, TrendingUp, Clock, IndianRupee, BarChart3, Activity, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const generateMockAnalytics = () => ({
  totalTests: 1247,
  popularTests: [
    { name: 'Complete Blood Count', count: 342, revenue: 171000 },
    { name: 'Blood Sugar Fasting', count: 289, revenue: 57800 },
    { name: 'Lipid Profile', count: 198, revenue: 118800 },
    { name: 'Thyroid Profile', count: 167, revenue: 91850 },
    { name: 'Liver Function Test', count: 145, revenue: 58000 },
    { name: 'Kidney Function Test', count: 106, revenue: 37100 },
  ],
  avgTurnaround: '4.2 hrs',
  totalRevenue: 534550,
  monthlyRevenue: [
    { month: 'Jan', revenue: 38000 },
    { month: 'Feb', revenue: 42000 },
    { month: 'Mar', revenue: 45000 },
    { month: 'Apr', revenue: 41000 },
    { month: 'May', revenue: 48000 },
    { month: 'Jun', revenue: 52000 },
    { month: 'Jul', revenue: 49000 },
    { month: 'Aug', revenue: 53550 },
    { month: 'Sep', revenue: 42000 },
    { month: 'Oct', revenue: 46000 },
    { month: 'Nov', revenue: 44000 },
    { month: 'Dec', revenue: 48000 },
  ],
});

export default function LabReportsAnalytics() {
  const [analytics, setAnalytics] = useState(generateMockAnalytics());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLabStats()
      .then(stats => {
        setAnalytics(prev => ({
          ...prev,
          totalTests: stats.total || 0,
          totalRevenue: 0,
          popularTests: prev.popularTests,
          avgTurnaround: '4.2 hrs',
          monthlyRevenue: prev.monthlyRevenue,
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maxRev = Math.max(...analytics.monthlyRevenue.map(m => m.revenue));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Reports & Analytics</h1>
        <p className="text-muted-foreground">Lab performance metrics and insights</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-5">
          <Beaker className="w-8 h-8 text-primary mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics.totalTests.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Tests Conducted</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-info/20 to-info/5 rounded-2xl border border-info/20 p-5">
          <TrendingUp className="w-8 h-8 text-info mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics.popularTests[0]?.name || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">Most Popular Test</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-5">
          <Clock className="w-8 h-8 text-warning mb-2" />
          <p className="text-3xl font-bold text-foreground">{analytics.avgTurnaround}</p>
          <p className="text-xs text-muted-foreground">Avg Turnaround Time</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-5">
          <IndianRupee className="w-8 h-8 text-success mb-2" />
          <p className="text-3xl font-bold text-success">Rs {analytics.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Monthly Revenue</h2>
          </div>
          <div className="flex items-end gap-2 h-48">
            {analytics.monthlyRevenue.map((m, i) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-xs text-muted-foreground font-mono">Rs {(m.revenue / 1000).toFixed(0)}k</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.revenue / maxRev) * 100}%` }}
                  transition={{ delay: i * 0.03, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-md min-h-[4px] hover:opacity-80 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Popular Tests</h2>
          </div>
          <div className="space-y-3">
            {analytics.popularTests.map((test, i) => {
              const pct = (test.count / analytics.popularTests[0].count) * 100;
              return (
                <div key={test.name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{test.name}</span>
                      <span className="text-muted-foreground">{test.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                        className="h-full bg-primary rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                      <span>{test.count} tests</span>
                      <span>Rs {test.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
