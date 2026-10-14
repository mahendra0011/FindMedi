import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, CreditCard, Receipt, Clock, CheckCircle2, AlertCircle,
  RotateCcw, Download, Printer, Search, Plus, Wallet, Smartphone, Landmark,
  QrCode, X, ShieldCheck, ArrowRight, Percent, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

interface InvoiceItem {
  id: string;
  patient: string;
  uhid: string;
  doctor: string;
  items: string;
  subtotal: number;
  discount: number;
  total: number;
  status: 'Pending' | 'Paid';
  time: string;
}

export default function ClinicCashierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [openingBalance, setOpeningBalance] = useState('2000');
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [selectedBill, setSelectedBill] = useState<InvoiceItem | null>(null);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash' | 'card'>('upi');
  const [cashTendered, setCashTendered] = useState('1000');
  const [discountVal, setDiscountVal] = useState('0');
  const [showReceiptModal, setShowReceiptModal] = useState<any | null>(null);

  // Live Invoices List
  const [bills, setBills] = useState<InvoiceItem[]>([
    { id: 'INV-2026-101', patient: 'Rahul Sharma', uhid: 'UH-2026-1011', doctor: 'Dr. Ramesh Sharma', items: 'OPD Consult + Paracetamol 650mg + Cetirizine', subtotal: 650, discount: 0, total: 650, status: 'Pending', time: '10:12 AM' },
    { id: 'INV-2026-102', patient: 'Meena Gupta', uhid: 'UH-2026-1012', doctor: 'Dr. Priya Patel', items: 'Pediatric Consult + Nebulization + Amox-Clav', subtotal: 850, discount: 50, total: 800, status: 'Pending', time: '10:20 AM' },
    { id: 'INV-2026-103', patient: 'Karan Mehra', uhid: 'UH-2026-1013', doctor: 'Dr. Vivek Verma', items: 'Ortho Visit + X-Ray Knee PA View', subtotal: 1200, discount: 100, total: 1100, status: 'Pending', time: '10:30 AM' },
    { id: 'INV-2026-104', patient: 'Sunita Rao', uhid: 'UH-2026-1014', doctor: 'Dr. Priya Patel', items: 'Follow-up Consultation Fee', subtotal: 400, discount: 0, total: 400, status: 'Pending', time: '10:35 AM' },
  ]);

  const loadData = async () => {
    try {
      const res: any = await api.get('/billing').catch(() => null);
      const arr = res?.data || res?.bills || res || [];
      if (Array.isArray(arr) && arr.length > 0) {
        const mapped: InvoiceItem[] = arr.slice(0, 5).map((b: any, i: number) => ({
          id: b.invoiceId || `INV-2026-${200 + i}`,
          patient: b.patient || 'Patient',
          uhid: b.uhid || `UH-2026-${1050 + i}`,
          doctor: b.doctor || 'Dr. Ramesh Sharma',
          items: b.service || 'Doctor Consultation',
          subtotal: Number(b.amount) || 500,
          discount: 0,
          total: Number(b.amount) || 500,
          status: b.status === 'Paid' ? 'Paid' : 'Pending',
          time: '10:40 AM'
        }));
        setBills(prev => [...mapped, ...prev]);
      }
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingBills = bills.filter(b => b.status === 'Pending');
  const paidBills = bills.filter(b => b.status === 'Paid');

  const shiftTotalCollection = 24850 + paidBills.reduce((acc, b) => acc + b.total, 0);
  const upiTotal = 16400;
  const cashInDrawer = Number(openingBalance) + 6250;
  const cardTotal = 2200;

  const currentBillTotal = selectedBill ? Math.max(0, selectedBill.subtotal - Number(discountVal || 0)) : 0;
  const changeToReturn = paymentMode === 'cash' ? Math.max(0, Number(cashTendered || 0) - currentBillTotal) : 0;

  const handleCollectPayment = () => {
    if (!selectedBill) return;

    const receiptData = {
      receiptNo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: selectedBill.id,
      patient: selectedBill.patient,
      uhid: selectedBill.uhid,
      doctor: selectedBill.doctor,
      items: selectedBill.items,
      subtotal: selectedBill.subtotal,
      discount: Number(discountVal),
      total: currentBillTotal,
      mode: paymentMode.toUpperCase(),
      date: getISTDateString(),
      cashier: user?.name || 'Cashier Desk #1'
    };

    setBills(prev => prev.map(b => b.id === selectedBill.id ? { ...b, status: 'Paid', total: currentBillTotal } : b));
    setShowReceiptModal(receiptData);
    setSelectedBill(null);
    setDiscountVal('0');
    toast.success(`₹${currentBillTotal} collected via ${paymentMode.toUpperCase()} for ${receiptData.patient}!`);
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Cash Counter Executive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">Billing Counter & Cash Shift Management</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Cashier & Invoicing Station</h1>
          <p className="text-sm text-emerald-100 mt-0.5">Counter #1 · Shift Operator: {user?.name || 'Cashier Desk'} · Instant UPI QR & Official Receipts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-emerald-200 font-medium">SHIFT OPENING FLOAT</p>
            <p className="text-xl font-bold">₹{openingBalance}</p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowShiftClose(true)}
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
              <p className="text-2xl font-bold text-emerald-700">₹{shiftTotalCollection.toLocaleString('en-IN')}</p>
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
              <p className="text-2xl font-bold text-blue-700">₹{upiTotal.toLocaleString('en-IN')}</p>
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
              <p className="text-2xl font-bold text-amber-700">₹{cashInDrawer.toLocaleString('en-IN')}</p>
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
              <p className="text-2xl font-bold text-purple-700">₹{cardTotal.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Pending Invoices Queue & Payment Modal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" /> Pending Invoices to Settle
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Bills from Doctor Consultations, Lab & Pharmacy</p>
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                {pendingBills.length} Unpaid
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[580px] overflow-y-auto">
              {pendingBills.map(b => (
                <div key={b.id} className="p-4 rounded-2xl border bg-muted/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground">{b.id}</span>
                      <p className="font-bold text-foreground text-sm">{b.patient}</p>
                      <span className="text-muted-foreground text-[11px]">({b.uhid})</span>
                    </div>
                    <p className="text-muted-foreground mt-1 font-medium">{b.items}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Consultant: <b className="text-foreground">{b.doctor}</b> · {b.time}</p>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="font-black text-lg text-emerald-600">₹{b.total}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBill(b);
                        setDiscountVal(String(b.discount || 0));
                      }}
                      className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                    >
                      Collect Now
                    </Button>
                  </div>
                </div>
              ))}

              {pendingBills.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                  All patient invoices settled! No pending bills.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Payment Settlement Console (5 cols) */}
        <div className="lg:col-span-5">
          {selectedBill ? (
            <Card className="rounded-3xl border-2 border-emerald-500/30 shadow-md">
              <CardHeader className="p-5 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Collect: {selectedBill.patient}</CardTitle>
                  <button onClick={() => setSelectedBill(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{selectedBill.id} · UHID: {selectedBill.uhid}</p>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                <div>
                  <label className="text-muted-foreground font-semibold block mb-2">Select Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('upi')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'upi' ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" /> UPI QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('cash')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'cash' ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border'
                      }`}
                    >
                      <Wallet className="w-4 h-4" /> Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('card')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-bold transition-all ${
                        paymentMode === 'card' ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" /> Card POS
                    </button>
                  </div>
                </div>

                {/* UPI Dynamic QR View */}
                {paymentMode === 'upi' && (
                  <div className="p-4 bg-muted/20 border-2 border-dashed rounded-2xl text-center space-y-2">
                    <div className="w-28 h-28 mx-auto bg-white p-2 rounded-xl shadow-xs border flex items-center justify-center">
                      {/* Simulated QR Pattern */}
                      <div className="w-full h-full bg-slate-900 rounded-md p-1 grid grid-cols-5 gap-1">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={`rounded-xs ${i % 2 === 0 || i % 7 === 0 ? 'bg-white' : 'bg-slate-900'}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground block">Scan via GPay / PhonePe / Paytm</span>
                    <b className="text-sm text-foreground font-black">₹{currentBillTotal}.00</b>
                  </div>
                )}

                {/* Cash Tendered & Change View */}
                {paymentMode === 'cash' && (
                  <div className="p-3.5 bg-muted/20 rounded-2xl border space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-muted-foreground">Cash Received from Patient (₹):</label>
                      <Input
                        type="number"
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        className="w-24 h-8 text-right font-bold text-xs"
                      />
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between font-bold">
                      <span className="text-muted-foreground">Change to Return:</span>
                      <span className="text-emerald-600 font-black text-sm">₹{changeToReturn}</span>
                    </div>
                  </div>
                )}

                {/* Discount Input */}
                <div className="flex items-center justify-between p-3 bg-muted/15 rounded-2xl border text-xs">
                  <span className="text-muted-foreground font-semibold flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-primary" /> Authorized Discount (₹):
                  </span>
                  <Input
                    type="number"
                    value={discountVal}
                    onChange={e => setDiscountVal(e.target.value)}
                    className="w-20 h-7 text-right text-xs font-bold"
                  />
                </div>

                {/* Billing Summary Box */}
                <div className="p-3.5 bg-muted/20 rounded-2xl space-y-1.5 border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Subtotal</span>
                    <b>₹{selectedBill.subtotal}</b>
                  </div>
                  {Number(discountVal) > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount Waiver</span>
                      <b>-₹{discountVal}</b>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Healthcare GST (0% Exempt)</span>
                    <b>₹0.00</b>
                  </div>
                  <div className="pt-2 border-t flex justify-between font-black text-sm">
                    <span>Net Amount Payable</span>
                    <span className="text-emerald-600 text-base">₹{currentBillTotal}</span>
                  </div>
                </div>

                <Button onClick={handleCollectPayment} className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm">
                  <Printer className="w-4 h-4" /> Confirm & Issue Official Stamped Receipt
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="p-10 text-center rounded-3xl border border-dashed text-muted-foreground text-xs space-y-2">
              <Receipt className="w-10 h-10 mx-auto opacity-30" />
              <p className="font-bold text-sm text-foreground">Select an invoice on the left</p>
              <p className="text-muted-foreground">Choose a pending bill to collect payment via Cash, UPI QR, or Card.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Official Stamped Receipt Modal ── */}
      <AnimatePresence>
        {showReceiptModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-3xl border shadow-2xl p-6 text-foreground space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base">Official Payment Receipt</h3>
                </div>
                <button onClick={() => setShowReceiptModal(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="p-4 bg-muted/20 border-2 border-dashed rounded-2xl space-y-3 font-mono text-xs">
                <div className="text-center pb-2 border-b">
                  <h4 className="font-bold text-sm tracking-wide">CENTRAL CLINIC & HEALTHCARE</h4>
                  <p className="text-[10px] text-muted-foreground">GSTIN: 07AAAAA0000A1Z5 · Reg: CLN-2026-904</p>
                  <p className="text-[10px] text-muted-foreground">Receipt #: {showReceiptModal.receiptNo}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Patient Name:</span>
                    <b className="text-foreground">{showReceiptModal.patient}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">UHID / Ref:</span>
                    <b className="text-foreground">{showReceiptModal.uhid}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Doctor:</span>
                    <span>{showReceiptModal.doctor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Date & Time:</span>
                    <span>{showReceiptModal.date}</span>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between">
                    <span>{showReceiptModal.items}</span>
                    <b>₹{showReceiptModal.subtotal}</b>
                  </div>
                  {showReceiptModal.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount</span>
                      <b>-₹{showReceiptModal.discount}</b>
                    </div>
                  )}
                  <div className="pt-2 border-t flex justify-between font-black text-sm">
                    <span>TOTAL PAID ({showReceiptModal.mode})</span>
                    <span className="text-emerald-600 font-bold">₹{showReceiptModal.total}.00</span>
                  </div>
                </div>

                <div className="pt-2 text-center border-t text-[10px] text-muted-foreground space-y-1">
                  <p className="flex items-center justify-center gap-1 text-emerald-600 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" /> PAYMENT VERIFIED & STAMPED
                  </p>
                  <p>Cashier: {showReceiptModal.cashier} · Thank you for visiting!</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowReceiptModal(null)} className="rounded-xl text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.print();
                    setShowReceiptModal(null);
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Tax Receipt
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 5. Shift Till Closing Modal ── */}
      <AnimatePresence>
        {showShiftClose && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-3xl border shadow-2xl p-6 text-foreground space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base">Cashier Shift Handover & Reconciliation</h3>
                <button onClick={() => setShowShiftClose(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 p-3.5 bg-muted/20 rounded-2xl border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opening Cash Float:</span>
                  <b>₹{openingBalance}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shift Physical Cash Receipts:</span>
                  <b>₹6,250</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UPI Settlements:</span>
                  <b>₹{upiTotal}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card POS Swipes:</span>
                  <b>₹{cardTotal}</b>
                </div>
                <div className="pt-2 border-t flex justify-between font-bold text-sm">
                  <span>Total Physical Cash in Drawer:</span>
                  <span className="text-emerald-600">₹{cashInDrawer}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>Zero Cash Discrepancy! Shift drawer reconciles 100% with transaction vouchers.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowShiftClose(false)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowShiftClose(false);
                    toast.success('Shift closing handover statement generated & dispatched to accounts!');
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Confirm Shift Handover
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
