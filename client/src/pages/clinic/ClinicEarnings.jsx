import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, IndianRupee, RefreshCcw } from 'lucide-react';
import EarningsAnalytics from '@/components/EarningsAnalytics';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/* ─── Premium Skeleton Loader ─────────────────────── */
function EarningsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/60" />
          <div>
            <div className="h-6 w-48 bg-muted/60 rounded-lg" />
            <div className="h-3 w-32 bg-muted/40 rounded-md mt-2" />
          </div>
        </div>
        <div className="h-10 w-52 bg-muted/50 rounded-xl" />
      </div>

      {/* Hero cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-3xl border border-border/30 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-muted/60" />
              <div className="w-14 h-6 rounded-full bg-muted/40" />
            </div>
            <div className="h-7 w-32 bg-muted/60 rounded-lg" />
            <div className="h-3 w-20 bg-muted/40 rounded-md" />
          </div>
        ))}
      </div>

      {/* Insight strips skeleton */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-3xl border border-border/30 bg-muted/20" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-3xl border border-border/30 p-6 space-y-4">
        <div className="flex justify-between">
          <div>
            <div className="h-5 w-40 bg-muted/60 rounded-lg" />
            <div className="h-3 w-28 bg-muted/40 rounded-md mt-2" />
          </div>
          <div className="h-8 w-24 bg-muted/40 rounded-full" />
        </div>
        <div className="h-64 bg-muted/30 rounded-2xl" />
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-border/30 p-6">
          <div className="h-5 w-32 bg-muted/60 rounded-lg mb-4" />
          <div className="h-52 bg-muted/30 rounded-2xl" />
        </div>
        <div className="lg:col-span-3 rounded-3xl border border-border/30 p-6">
          <div className="h-5 w-28 bg-muted/60 rounded-lg mb-4" />
          <div className="h-52 bg-muted/30 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────── */
export default function ClinicEarnings() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const results = await Promise.allSettled([
        api.getBilling(),
        api.getPayments({}),
      ]);
      const [b, p] = results.map(res => res.status === 'fulfilled' ? res.value : []);
      const ba = b?.data || b?.bills || b || [];
      setBills(ba.filter(bill =>
        bill.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) ||
        bill.doctorId?.name?.toLowerCase().includes(user?.name?.toLowerCase())
      ));
      setPayments(p?.payments || p?.data || p || []);
      if (results.some(r => r.status === 'rejected')) {
        toast.error('Failed to load some earnings data');
      }
      if (isRefresh) toast.success('Earnings data refreshed');
    } catch (e) {
      toast.error(e.message || 'Failed to load earnings');
    }

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user?.name]);

  if (loading) return (
    <div className="p-1">
      <EarningsSkeleton />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <EarningsAnalytics
        bills={bills}
        payments={payments}
        title="My Earnings"
      />
    </motion.div>
  );
}
