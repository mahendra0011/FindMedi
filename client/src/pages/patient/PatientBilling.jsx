import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Calendar, Download, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, downloadInvoicePdf } from '@/lib/api';

const statusColors = { Paid: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Overdue: 'bg-destructive/10 text-destructive', Partial: 'bg-info/10 text-info' };
const statusFilters = ['All', 'Paid', 'Pending', 'Overdue'];

export default function PatientBilling() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const data = await api.getBilling();
      if (data.bills) {
        setBills(data.bills);
      }
    } catch (error) {
      console.error('Error fetching billing:', error);
    }
    setLoading(false);
  };

  const downloadInvoice = async (bill) => {
    try {
      await downloadInvoicePdf(bill._id, `${bill.invoiceId || 'invoice'}.pdf`);
    } catch (error) {
      toast.error(error.message || 'Unable to download invoice');
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (statusFilter !== 'All' && bill.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [bill.invoiceId, bill.service, bill.doctor, bill.doctorId?.name, bill.status]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  useEffect(() => { loadBilling(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Billing</h1>
        <p className="text-muted-foreground">View invoices and payment history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-10" />
        </div>
        <div className="flex gap-1.5">
          {statusFilters.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bills */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredBills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No billing records found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBills.map((bill, i) => (
            <motion.div key={bill._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono text-muted-foreground">{bill.invoiceId}</p>
                  <h3 className="font-heading font-semibold text-foreground">{bill.service}</h3>
                  <p className="text-sm text-primary">{bill.doctorId?.name || bill.doctor}</p>
                  <p className="text-xs text-muted-foreground">{bill.doctorId?.specialization}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[bill.status]}`}>{bill.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-heading font-bold text-foreground">₹{bill.amount?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="font-heading font-bold text-warning">₹{((bill.amount || 0) - (bill.paid || 0)).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
                  {bill.status !== 'Paid' && (
                    <Button size="sm" onClick={() => navigate('/patient/payment')}>
                      <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay Now
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => downloadInvoice(bill)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /><span>Due: {bill.dueDate}</span>
                {bill.transactionId && <span className="ml-2">TXN: {bill.transactionId}</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
