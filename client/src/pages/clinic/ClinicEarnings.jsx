import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, Wallet, CreditCard, BarChart3, Calendar, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = { Paid: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Overdue: 'bg-destructive/10 text-destructive' };

export default function ClinicEarnings() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [b, a] = await Promise.all([api.getBilling(), api.getAppointments()]);
        const ba = b?.bills || b || [];
        setBills(ba.filter(bill => bill.doctor?.toLowerCase().includes(user?.name?.toLowerCase())));
        setAppointments(a?.filter(apt => apt.doctor?.toLowerCase().includes(user?.name?.toLowerCase())) || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.name]);

  const now = new Date();
  const filteredBills = bills.filter(b => {
    const ms = !search || b.patient?.toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter === 'All' || b.status === statusFilter;
    let dateOk = true;
    if (period === 'month') {
      dateOk = b.date?.startsWith(now.toISOString().slice(0, 7));
    } else if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      dateOk = b.date >= weekAgo.toISOString().split('T')[0];
    }
    return ms && ms2 && dateOk;
  });

  const totalBilled = filteredBills.reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = filteredBills.reduce((s, b) => s + (b.paid || 0), 0);
  const pendingAmount = totalBilled - totalPaid;
  const consultCount = appointments.filter(a => a.status === 'Completed').length;

  // Monthly breakdown
  const monthlyData = {};
  bills.forEach(b => {
    const month = b.date?.substring(0, 7) || 'Unknown';
    if (!monthlyData[month]) monthlyData[month] = { earned: 0, billed: 0, count: 0 };
    monthlyData[month].earned += b.paid || 0;
    monthlyData[month].billed += b.amount || 0;
    monthlyData[month].count += 1;
  });
  const months = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).reverse();

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Earnings & Reports</h1>
        <p className="text-muted-foreground">Revenue trends and consultation metrics</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'month', 'week'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {p === 'all' ? 'All Time' : p === 'month' ? 'This Month' : 'This Week'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-6">
          <Wallet className="w-6 h-6 text-success mb-2" />
          <p className="font-heading text-3xl font-bold text-success">₹{totalPaid.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-6">
          <CreditCard className="w-6 h-6 text-primary mb-2" />
          <p className="font-heading text-3xl font-bold text-foreground">₹{totalBilled.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Billed</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-6">
          <TrendingUp className="w-6 h-6 text-warning mb-2" />
          <p className="font-heading text-3xl font-bold text-warning">₹{pendingAmount.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-info/20 to-info/5 rounded-2xl border border-info/20 p-6">
          <BarChart3 className="w-6 h-6 text-info mb-2" />
          <p className="font-heading text-3xl font-bold text-info">{consultCount}</p>
          <p className="text-sm text-muted-foreground mt-1">Consultations</p>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'Paid', 'Pending'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{s}</button>
          ))}
        </div>
      </div>

      {months.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Monthly Revenue Trends
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map(([month, data]) => (
              <div key={month} className="p-4 bg-muted/30 rounded-xl">
                <p className="font-medium text-foreground mb-3">{month}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billed</span>
                    <span className="font-medium text-foreground">₹{data.billed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Earned</span>
                    <span className="font-medium text-success">₹{data.earned.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Invoices</span>
                    <span className="font-medium">{data.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success transition-all" style={{ width: `${data.billed > 0 ? (data.earned / data.billed) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice List */}
      {filteredBills.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.slice(0, 10).map(bill => (
                  <tr key={bill._id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{bill.patient}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.service}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">₹{bill.amount}</td>
                    <td className="px-4 py-3 text-center"><Badge className={statusColors[bill.status] || 'bg-muted'}>{bill.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
