import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Calendar, TrendingUp, CreditCard, User, Clock, DollarSign, ArrowUp, ArrowDown, Wallet, PieChart, BarChart3, Search, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api, downloadInvoicePdf } from '@/lib/api';

const statusColors = { 
  Paid: 'bg-success/10 text-success', 
  Pending: 'bg-warning/10 text-warning', 
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info'
};

export default function DoctorEarnings() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getBilling();
        const billsArray = data?.bills || data || [];
        const myBills = billsArray.filter(b => 
          b.doctor?.toLowerCase().includes(user?.name?.toLowerCase()) ||
          b.doctorId?.name?.toLowerCase().includes(user?.name?.toLowerCase())
        );
        setBills(myBills);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.name]);

  const filteredBills = bills.filter(b => {
    const matchesSearch = !search || 
      b.patient?.toLowerCase().includes(search.toLowerCase()) ||
      b.invoiceId?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const downloadInvoice = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `${bill.invoiceId || 'invoice'}.pdf`);
    } catch (error) {
      alert(error.message || 'Unable to download invoice');
    }
  };

  const totalBilled = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const totalEarned = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pending = totalBilled - totalEarned;
  const paidCount = bills.filter(b => b.status === 'Paid').length;
  const pendingCount = bills.filter(b => b.status === 'Pending').length;

  // Monthly breakdown
  const monthlyData = {};
  bills.forEach(b => {
    const month = b.date?.substring(0, 7) || 'Unknown';
    if (!monthlyData[month]) {
      monthlyData[month] = { earned: 0, billed: 0 };
    }
    monthlyData[month].earned += b.paid || 0;
    monthlyData[month].billed += b.amount || 0;
  });
  const months = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).reverse();

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Earnings</h1>
          <p className="text-muted-foreground">{filteredBills.length} invoices</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-success" />
            </div>
          </div>
          <p className="font-heading text-3xl font-bold text-success">Rs {totalEarned.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Earned</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="font-heading text-3xl font-bold text-foreground">Rs {totalBilled.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Billed</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
          </div>
          <p className="font-heading text-3xl font-bold text-warning">Rs {pending.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Pending Payment</p>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{paidCount}</p>
          <p className="text-xs text-muted-foreground">Paid</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{bills.length}</p>
          <p className="text-xs text-muted-foreground">Invoices</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-primary">{bills.length > 0 ? Math.round((paidCount / bills.length) * 100) : 0}%</p>
          <p className="text-xs text-muted-foreground">Collection Rate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search by patient or invoice..." 
            className="pl-10" 
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Paid', 'Pending'].map(s => (
            <button 
              key={s} 
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No invoices found</p>
          <p className="text-sm text-muted-foreground/70">Create bills from appointments</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Service</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Paid</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(bill => (
                  <tr key={bill._id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{bill.invoiceId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{bill.patient}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[150px] truncate">{bill.service}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">Rs {bill.amount}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-success text-right">Rs {bill.paid}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={statusColors[bill.status] || 'bg-muted text-muted-foreground'}>
                        {bill.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadInvoice(bill)} className="gap-2">
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      {months.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Monthly Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map(([month, data], i) => (
              <div key={month} className="p-4 bg-muted/30 rounded-xl">
                <p className="font-medium text-foreground mb-3">{month}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Billed</span>
                    <span className="font-medium text-foreground">Rs {data.billed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Earned</span>
                    <span className="font-medium text-success">Rs {data.earned.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-success transition-all" 
                      style={{ width: `${data.billed > 0 ? (data.earned / data.billed) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
