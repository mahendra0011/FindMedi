import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Search, Calendar, CheckCircle, AlertCircle, XCircle, IndianRupee, Loader2, Download, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { api, getStoredAuthToken } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const statusColors = { Paid: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Overdue: 'bg-destructive/10 text-destructive', Partial: 'bg-info/10 text-info' };

export default function PatientBilling() {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadBilling = async () => {
    setLoading(true);
    try {
      const token = getStoredAuthToken();
      const res = await fetch(`${API_URL}/billing`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (data.bills) {
        setBills(data.bills);
        setSummary(data.summary || { total: 0, paid: 0 });
      }
    } catch (error) {
      console.error('Error fetching billing:', error);
    }
    setLoading(false);
  };

  const handlePayBill = async (billId) => {
    try {
      await fetch(`${API_URL}/billing/${billId}/pay`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredAuthToken()}`
        },
        body: JSON.stringify({ paymentMethod: 'card' })
      });
      loadBilling();
    } catch (error) {
      console.error('Error paying bill:', error);
    }
  };

  const downloadInvoice = (bill) => {
    const content = `
========================================
          MEDICORE HOSPITAL
========================================
INVOICE: ${bill.invoiceId}
Date: ${bill.date || new Date().toISOString().split('T')[0]}
Due Date: ${bill.dueDate || 'N/A'}
----------------------------------------
PATIENT DETAILS
----------------------------------------
Name: ${user?.name || bill.patient}
Email: ${bill.patientId?.email || 'N/A'}
Phone: ${bill.patientId?.phone || 'N/A'}
----------------------------------------
APPOINTMENT DETAILS
----------------------------------------
Service: ${bill.service}
Doctor: ${bill.doctorId?.name || bill.doctor || 'N/A'}
Specialization: ${bill.doctorId?.specialization || 'General'}
----------------------------------------
PAYMENT DETAILS
----------------------------------------
Amount: Rs ${bill.amount}
Paid: Rs ${bill.paid}
Outstanding: Rs ${bill.amount - bill.paid}
Status: ${bill.status}
Payment Method: ${bill.paymentMethod || 'Pending'}
Transaction ID: ${bill.transactionId || 'N/A'}
========================================
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${bill.invoiceId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadBilling(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Billing</h1>
        <p className="text-muted-foreground">View invoices and payment history</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="pl-10" />
      </div>

      {/* Bills */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : bills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No billing records found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bills.map((bill, i) => (
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
                  <p className="font-heading font-bold text-foreground">Rs {bill.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="font-heading font-bold text-warning">Rs {bill.amount - bill.paid}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-2">
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