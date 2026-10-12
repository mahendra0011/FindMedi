import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, CreditCard, Receipt, Clock, CheckCircle2, AlertCircle,
  RotateCcw, Download, Printer, Search, Plus, Wallet, Smartphone, Landmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function ClinicCashierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState('2000');
  const [closingCounter, setClosingCounter] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card'>('upi');

  const mockPendingBills = [
    { id: 'INV-101', patient: 'Rahul Sharma', doctor: 'Dr. Ramesh Sharma', items: 'OPD Consult + Paracetamol', total: 650, status: 'Pending' },
    { id: 'INV-102', patient: 'Meena Gupta', doctor: 'Dr. Priya Patel', items: 'Pediatric Consult + Nebulization', total: 800, status: 'Pending' },
    { id: 'INV-103', patient: 'Karan Mehra', doctor: 'Dr. Vivek Verma', items: 'Ortho Visit + X-Ray Knee', total: 1100, status: 'Pending' },
  ];

  const handleCollectPayment = () => {
    if (!selectedBill) return;
    toast.success(`₹${selectedBill.total} collected via ${paymentMode.toUpperCase()} for ${selectedBill.patient}! Receipt Printed.`);
    setSelectedBill(null);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Cash Counter Executive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">Billing Counter & Cash Shift Management</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Cashier & Invoicing Station</h1>
          <p className="text-sm text-emerald-100 mt-0.5">Counter #1 · Shift Operator: {user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-emerald-200 font-medium">SHIFT OPENING FLOAT</p>
            <p className="text-xl font-bold">₹{openingBalance}</p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => toast.info('Shift closing variance report generated & sent to accounts.')}
            className="rounded-xl text-xs font-bold"
          >
            Close Shift & Handover
          </Button>
        </div>
      </div>

      {/* ── 2. Counter Shift KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Shift Total Collection</p>
              <p className="text-2xl font-bold text-emerald-700">₹24,850</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">UPI QR Payments</p>
              <p className="text-2xl font-bold text-blue-700">₹16,400</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Cash in Drawer</p>
              <p className="text-2xl font-bold text-amber-700">₹6,250</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Card POS Swipes</p>
              <p className="text-2xl font-bold text-purple-700">₹2,200</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Pending Invoices Queue & Payment Modal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" /> Pending Invoices to Settle
              </CardTitle>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                {mockPendingBills.length} Unpaid Bills
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {mockPendingBills.map(b => (
                <div key={b.id} className="p-4 rounded-2xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-muted-foreground">{b.id}</span>
                      <p className="font-bold text-foreground text-sm">{b.patient}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.items} · {b.doctor}</p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="font-black text-lg text-emerald-600">₹{b.total}</span>
                    <Button
                      size="sm"
                      onClick={() => setSelectedBill(b)}
                      className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Collect Now
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          {selectedBill ? (
            <Card className="rounded-3xl border-2 border-emerald-500/30 shadow-md">
              <CardHeader className="p-5 pb-3 border-b">
                <CardTitle className="text-base font-bold">Collect Payment: {selectedBill.patient}</CardTitle>
                <p className="text-xs text-muted-foreground">{selectedBill.id} · Total: ₹{selectedBill.total}</p>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-2">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upi')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'upi' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" /> UPI QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'cash' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      <Wallet className="w-4 h-4" /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('card')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'card' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Card POS
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-muted/20 rounded-2xl space-y-1">
                  <div className="flex justify-between">
                    <span>Consultation / Services</span>
                    <b>₹{selectedBill.total}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicable GST (0% Health)</span>
                    <b>₹0.00</b>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-bold text-sm">
                    <span>Payable Amount</span>
                    <span className="text-emerald-600">₹{selectedBill.total}</span>
                  </div>
                </div>

                <Button onClick={handleCollectPayment} className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm gap-2">
                  <Printer className="w-4 h-4" /> Confirm & Print GST Receipt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="p-10 text-center rounded-3xl border border-dashed text-muted-foreground text-xs">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
              Select an invoice on the left to collect payment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
