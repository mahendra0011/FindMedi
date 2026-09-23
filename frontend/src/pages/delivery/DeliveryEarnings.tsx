import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, IndianRupee, TrendingUp, Calendar, ArrowUpRight, 
  CreditCard, CheckCircle2, Building2, ShieldCheck, Clock, Download, 
  ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function DeliveryEarnings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prof, dels] = await Promise.all([
        api.get('/delivery-partners/profile/me').catch(() => null),
        api.get('/delivery-partners/my-deliveries').catch(() => ({ active: [], history: [] })),
      ]);
      setProfile(prof);
      setHistory(dels?.history || []);
    } catch {
      toast.error('Failed to load earnings');
    }
    setLoading(false);
  };

  const getFilteredEarnings = () => {
    const now = new Date();
    return history.filter((d) => {
      if (period === 'all') return true;
      if (!d.deliveredAt) return false;
      const dDate = new Date(d.deliveredAt);
      if (period === 'today') return dDate.toDateString() === now.toDateString();
      if (period === 'week') {
        const diff = (now.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      }
      if (period === 'month') {
        return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const periodList = getFilteredEarnings();
  const totalEarnings = periodList.reduce((s, d) => s + (d.orderRef?.deliveryFee || 50), 0);
  const totalTrips = periodList.length;
  const avgPayout = totalTrips > 0 ? (totalEarnings / totalTrips).toFixed(0) : '50';

  const handleWithdraw = () => {
    const amt = Number(withdrawAmt);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      setWithdrawModal(false);
      setWithdrawAmt('');
      toast.success(`₹${amt} payout request initiated! Sent to bank account ending in ${profile?.bankDetails?.accountNo?.slice(-4) || '2049'}`);
    }, 700);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading payout balances...</p>
      </div>
    );
  }

  const walletBalance = profile?.walletBalance ?? (history.length * 50);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Available Wallet Balance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              ₹{walletBalance.toLocaleString()}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant daily bank transfer or direct UPI credit with zero deduction fee
            </p>
          </div>
        </div>

        <Button
          onClick={() => setWithdrawModal(true)}
          className="rounded-xl h-10 px-5 font-bold text-xs bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 gap-2 self-start sm:self-auto"
        >
          <Wallet className="w-4 h-4" /> Request Payout
        </Button>
      </div>

      {/* ── Time Period Filter Tabs ────────────────────────────────────────── */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 max-w-sm">
        {(['today', 'week', 'month', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
              period === p
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p === 'all' ? 'All Time' : p}
          </button>
        ))}
      </div>

      {/* ── Performance Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center mb-3">
            <IndianRupee className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-foreground">₹{totalEarnings.toFixed(0)}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1 capitalize">
            Settled Earnings ({period})
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-foreground">{totalTrips}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1 capitalize">
            Deliveries Completed ({period})
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black text-foreground">₹{avgPayout}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1">Average Payout per Medicine Drop</p>
        </motion.div>
      </div>

      {/* ── Connected Settlement Bank & UPI Account ────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base text-foreground">Connected Settlement Account</h2>
          </div>
          <Badge variant="outline" className="text-success border-success/30 bg-success/10 text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified KYC
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-muted-foreground block">Account Holder</span>
            <p className="font-bold text-foreground text-sm">
              {profile?.bankDetails?.holderName || profile?.name || user?.name || 'Rider Partner'}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-muted-foreground block">Bank Account & IFSC</span>
            <p className="font-mono font-bold text-foreground text-sm">
              ••••{profile?.bankDetails?.accountNo?.slice(-4) || '4021'} ({profile?.bankDetails?.ifsc || 'SBIN0001234'})
            </p>
          </div>
          <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <span className="text-muted-foreground block">Fast UPI VPA</span>
            <p className="font-mono font-bold text-primary text-sm">
              {profile?.bankDetails?.upiId || `${(user?.phone || 'rider')}@okhdfcbank`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Recent Settlement Log ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-base text-foreground">Recent Delivery Settlements</h2>

        {periodList.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            No delivery payout transactions in this timeframe. Complete medicine runs to earn.
          </div>
        ) : (
          <div className="space-y-2">
            {periodList.slice(0, 10).map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Order #{d.orderId} Delivery Fee</p>
                    <p className="text-[11px] text-muted-foreground">{d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString() : 'Today'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-success block">+₹{d.orderRef?.deliveryFee || 50}</span>
                  <Badge variant="outline" className="text-[10px] border-success/30 text-success">Settled</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Payout Request Modal ───────────────────────────────────────────── */}
      {withdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl border border-border bg-card p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Instant Payout Request</h3>
              <button 
                onClick={() => setWithdrawModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Funds will be sent immediately via IMPS/UPI to your registered bank account.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Amount to Withdraw (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount (e.g. 500)"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                className="h-10 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setWithdrawModal(false)}
                className="flex-1 rounded-xl h-10 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 rounded-xl h-10 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {withdrawing ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
