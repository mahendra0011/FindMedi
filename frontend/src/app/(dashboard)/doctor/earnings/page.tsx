/**
 * My Earnings — ported from client/src/pages/doctor/DoctorEarnings.jsx (Phase 4).
 * Doctor-filtered bills + payments rendered through shared EarningsAnalytics.
 */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import EarningsAnalytics, {
  type EarningsBillItem,
  type EarningsPaymentItem,
} from '@/components/shared/sections/EarningsAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { billing, payments } from '@/lib/api';
import { toast } from 'sonner';

function EarningsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 rounded-3xl border border-border/30 bg-muted/20" />
        ))}
      </div>

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

export default function EarningsPage() {
  const { user } = useAuth();
  const [bills, setBills] = useState<EarningsBillItem[]>([]);
  const [paymentList, setPaymentList] = useState<EarningsPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([billing.get({}), payments.get({})]);
        const [b, p] = results.map((res) => (res.status === 'fulfilled' ? res.value : []));
        const billArray = (Array.isArray(b) ? b : []) as unknown as EarningsBillItem[];
        const uname = user?.name?.toLowerCase() ?? '';
        setBills(billArray.filter((bill) => (bill.doctor as string | undefined)?.toLowerCase()?.includes(uname) ?? false));
        const pArray = (Array.isArray(p) ? p : []) as unknown as EarningsPaymentItem[];
        setPaymentList(pArray);
        if (results.some((r) => r.status === 'rejected')) {
          toast.error('Failed to load some earnings data');
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load earnings');
      }
      setLoading(false);
    };
    void load();
     
  }, [user?.name]);

  if (loading) {
    return (
      <div className="p-1">
        <EarningsSkeleton />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <EarningsAnalytics bills={bills} payments={paymentList} title="My Earnings" />
    </motion.div>
  );
}
