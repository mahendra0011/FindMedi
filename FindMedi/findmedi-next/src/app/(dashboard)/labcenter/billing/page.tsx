/**
 * Billing & Payments — ported from client/src/pages/labcenter/LabBilling.jsx (Phase 4).
 * Lab invoices with test picker, discounting and paid tracking.
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Search, Plus, Send, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { lab, tests } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

const statusColors: Record<string, string> = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
};

interface CatalogTest {
  _id: string;
  name: string;
  price?: number;
}

interface LabBill {
  _id: string;
  invoiceId?: string;
  patient?: string;
  tests: string[];
  amount: number;
  discount?: number;
  total: number;
  date?: string;
  status: string;
}

export default function BillingPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['lab-bills'],
    queryFn: async (): Promise<LabBill[]> => {
      const res = await lab.getBookings({ status: 'Completed' });
      const arr = (Array.isArray(res) ? res : []) as unknown as Record<string, unknown>[];
      return arr.map((b, i) => ({
        _id: String(b._id ?? `bill_${i}`),
        invoiceId: typeof b.invoiceId === 'string' ? b.invoiceId : undefined,
        patient: String(b.patient ?? b.patientName ?? 'Unknown'),
        tests: Array.isArray(b.tests) ? (b.tests as string[]) : [],
        amount: Number(b.amount ?? 0),
        discount: typeof b.discount === 'number' ? b.discount : undefined,
        total: Number(b.total ?? b.amount ?? 0),
        date: String(b.date ?? b.createdAt ?? '').split('T')[0] ?? '',
        status: typeof b.status === 'string' ? b.status : 'Completed',
      }));
    },
    staleTime: 30_000,
  });

  const { data: testsData } = useQuery({
    queryKey: ['lab-test-catalog'],
    queryFn: async (): Promise<CatalogTest[]> => {
      const res = await tests.get({});
      return (Array.isArray(res) ? res : []).map((t, i) => ({
        _id: String(t._id ?? `test-${i}`),
        name: String(t.name ?? 'Test'),
        price: typeof t.price === 'number' ? t.price : undefined,
      }));
    },
    staleTime: 300_000,
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => lab.createBooking(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-bills'] }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [key: string]: unknown }) => lab.updateBooking(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lab-bills'] }),
  });

  const bills = billsData ?? [];
  const catalogTests = testsData ?? [];

  const subTotal = selectedTests.reduce((s, tid) => {
    const t = catalogTests.find((tt) => tt._id === tid);
    return s + (t?.price || 0);
  }, 0);
  const total = subTotal - (subTotal * (discount || 0)) / 100;

  const filtered = bills.filter((b) => {
    const ms =
      !search ||
      (b.patient ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.invoiceId || '').toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter === 'All' || b.status === statusFilter;
    return ms && ms2;
  });

  const makeInvoiceId = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `INV-TST-${now.toISOString().slice(0, 10).replace(/-/g, '')}${pad(now.getHours())}${pad(now.getMinutes())}${crypto.randomUUID()}`;
  };

  const handleCreate = () => {
    if (!patientName || selectedTests.length === 0) return;
    setSaving(true);
    createMut.mutate(
      {
        patient: patientName,
        tests: selectedTests,
        amount: subTotal,
        discount: Number(discount),
        total: Math.round(total),
        status: 'Pending',
        invoiceId: makeInvoiceId(),
        date: getISTDateString(),
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setPatientName('');
          setSelectedTests([]);
          setDiscount(0);
        },
        onSettled: () => setSaving(false),
      },
    );
  };

  const markPaid = (id: string) => {
    statusMut.mutate({ id, status: 'Paid' });
  };

  const totalCollected = bills.filter((b) => b.status === 'Paid').reduce((s, b) => s + (b.total || b.amount), 0);
  const totalPending = bills.filter((b) => b.status === 'Pending').reduce((s, b) => s + (b.total || b.amount), 0);
  const totalOverdue = bills.filter((b) => b.status === 'Overdue').reduce((s, b) => s + (b.total || b.amount), 0);

  if (billsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing & Payments</h1>
          <p className="text-muted-foreground">{bills.length} invoices</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20 p-6">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-3xl font-bold text-success">₹{totalCollected.toLocaleString()}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20 p-6">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-3xl font-bold text-warning">₹{totalPending.toLocaleString()}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-destructive/20 to-destructive/5 rounded-2xl border border-destructive/20 p-6">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-3xl font-bold text-destructive">₹{totalOverdue.toLocaleString()}</p>
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or invoice..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Paid', 'Pending', 'Overdue'].map((s) => (
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

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CreditCard className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No invoices yet</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Patient</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tests</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-center text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => (
                  <tr key={bill._id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{bill.invoiceId}</td>
                    <td className="px-4 py-3 text-sm font-medium">{bill.patient}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.tests.length} test(s)</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{bill.date}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">₹{bill.total || bill.amount}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={statusColors[bill.status] ?? ''}>{bill.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {bill.status !== 'Paid' && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(bill._id)} className="gap-1 text-success border-success/30">
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4">New Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Patient Name *</label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Tests * ({selectedTests.length})</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {catalogTests.map((t) => (
                    <button
                      key={t._id}
                      onClick={() =>
                        setSelectedTests((prev) => (prev.includes(t._id) ? prev.filter((id) => id !== t._id) : [...prev, t._id]))
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${selectedTests.includes(t._id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto text-xs opacity-70">₹{t.price}</span>
                    </button>
                  ))}
                </div>
              </div>
              {selectedTests.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount ({discount}%)</span>
                    <span className="text-destructive">-₹{Math.round((subTotal * discount) / 100)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
                    <span>Total</span>
                    <span>₹{Math.round(total)}</span>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Discount %</label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} min={0} max={100} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCreate} disabled={!patientName || selectedTests.length === 0 || saving}>
                <Send className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
