import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, IndianRupee, CheckCircle, Clock, AlertCircle, History, Smartphone, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import StatCard from '@/components/StatCard';

const statusColors = { completed: 'bg-success/10 text-success', pending: 'bg-warning/10 text-warning', failed: 'bg-destructive/10 text-destructive', refunded: 'bg-info/10 text-info' };
const methodIcons = { card: CreditCard, upi: Smartphone, netbanking: Landmark, cash: Wallet };

export default function PatientPayment() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingBill, setPayingBill] = useState(null);
  const [payMethod, setPayMethod] = useState('card');
  const [paySuccess, setPaySuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        api.getPayments({ patient_id: user?._id }),
        api.getBilling({ patientId: user?._id }),
      ]);
      setPayments(p.payments || p);
      setBills(b.bills || b);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + ((b.amount || 0) - (b.paid || 0)), 0);

  const handlePay = async (bill) => {
    try {
      await api.createPayment({
        patient_id: user?.id,
        patient_name: user?.name,
        amount: bill.amount - bill.paid,
        method: payMethod,
        invoice_id: bill.invoiceId,
        status: 'completed',
      });
      await api.updateBill(bill._id, { paid: bill.amount, status: 'Paid' });
      setPaySuccess(true);
      setTimeout(() => { setPaySuccess(false); setPayingBill(null); loadData(); }, 2000);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground">Make payments and view transaction history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Paid" value={`Rs ${totalPaid.toLocaleString()}`} icon={CheckCircle} change="Successful payments" />
        <StatCard title="Pending" value={`Rs ${pendingAmount.toLocaleString()}`} icon={Clock} change="Outstanding bills" />
        <StatCard title="Transactions" value={payments.length} icon={History} change="All time" />
      </div>

      {/* Pending Bills */}
      {bills.filter(b => b.status !== 'Paid').length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-3">Pending Bills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bills.filter(b => b.status !== 'Paid').map((bill, i) => (
              <motion.div key={bill._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border/60 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{bill.invoiceId}</p>
                    <h3 className="font-heading font-semibold text-foreground">{bill.service}</h3>
                    <p className="text-sm text-primary">{bill.doctor}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning">{bill.status}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Due</p>
                    <p className="font-heading text-xl font-bold text-foreground">Rs {bill.amount - bill.paid}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm text-foreground">{bill.dueDate}</p>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={() => setPayingBill(bill)}>
                  <CreditCard className="w-4 h-4" /> Pay Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Payment History
        </h2>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No payment history</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Transaction</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Method</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay._id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono">{pay.transaction_id}</td>
                      <td className="px-4 py-3 text-sm">{pay.invoice_id || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold">Rs {pay.amount}</td>
                      <td className="px-4 py-3 text-sm flex items-center gap-1">{(() => { const Icon = methodIcons[pay.method] || CreditCard; return <Icon className="w-3.5 h-3.5" />; })()} {pay.method}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[pay.status]}`}>{pay.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayingBill(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            {paySuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">Payment Successful!</h3>
                <p className="text-muted-foreground">Your payment of Rs {payingBill.amount - payingBill.paid} has been processed.</p>
              </div>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold text-foreground mb-4">Make Payment</h3>
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">Invoice: {payingBill.invoiceId}</p>
                    <p className="font-heading text-2xl font-bold text-foreground">Rs {payingBill.amount - payingBill.paid}</p>
                    <p className="text-sm text-muted-foreground">{payingBill.service}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[['card', '💳 Card'], ['upi', '📱 UPI'], ['netbanking', '🏦 Net Banking'], ['cash', '💵 Cash']].map(([key, label]) => (
                        <button key={key} onClick={() => setPayMethod(key)}
                          className={`p-3 rounded-xl text-sm font-medium transition-all border-2 ${payMethod === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => setPayingBill(null)}>Cancel</Button>
                  <Button className="flex-1 gap-2" onClick={() => handlePay(payingBill)}>
                    <IndianRupee className="w-4 h-4" /> Pay Rs {payingBill.amount - payingBill.paid}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}