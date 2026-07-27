import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Calendar, TrendingUp, Wallet, Banknote, Clock, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DeliveryEarnings() {
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState({ active: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me'),
        api.get('/delivery-partners/my-deliveries'),
      ]);
      setProfile(prof);
      setDeliveries(dels);
    } catch {
      toast.error('Failed to load data');
    }
    setLoading(false);
  };

  const history = deliveries.history || [];
  const now = new Date();

  const filteredDeliveries = history.filter((d) => {
    const date = new Date(d.deliveredAt || d.createdAt);
    if (period === 'today') return date.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (period === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalEarnings = filteredDeliveries.reduce((s, d) => s + (d.orderRef?.total || 0), 0);
  const completedCount = filteredDeliveries.filter((d) => d.status === 'Delivered').length;
  const avgPerDelivery = completedCount > 0 ? totalEarnings / completedCount : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground">Track your delivery earnings and payouts</p>
      </div>

      <div className="flex gap-1 bg-muted/20 rounded-xl p-1">
        {['today', 'week', 'month', 'all'].map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize ${
              period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'all' ? 'All Time' : p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border p-5"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">₹{totalEarnings.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Earnings ({period})</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl border p-5"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{completedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Deliveries Completed</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border p-5"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
            <Banknote className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">₹{avgPerDelivery.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg. per Delivery</p>
        </motion.div>
      </div>

      <div className="bg-card rounded-xl border p-5">
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Bank Details</h2>
        {profile?.bankDetails?.accountNo ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">Account Number</span>
              <span className="font-medium text-foreground">••••{profile.bankDetails.accountNo.slice(-4)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">IFSC Code</span>
              <span className="font-medium text-foreground">{profile.bankDetails.ifsc}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">Account Holder</span>
              <span className="font-medium text-foreground">{profile.bankDetails.holderName}</span>
            </div>
            {profile.bankDetails.upiId && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">UPI ID</span>
                <span className="font-medium text-foreground">{profile.bankDetails.upiId}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No bank details configured</p>
        )}
      </div>

      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Recent Deliveries</h2>
        <div className="space-y-2">
          {filteredDeliveries.slice(0, 10).map((d) => (
            <div key={d._id} className="bg-card rounded-lg border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  d.status === 'Delivered' ? 'bg-success/10' : 'bg-destructive/10'
                }`}>
                  <IndianRupee className={`w-4 h-4 ${d.status === 'Delivered' ? 'text-success' : 'text-destructive'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Order #{d.orderId}</p>
                  <p className="text-xs text-muted-foreground">{d.dropAddress}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">₹{d.orderRef?.total || 0}</p>
                <Badge variant={d.status === 'Delivered' ? 'default' : 'secondary'} className="text-[10px]">
                  {d.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
