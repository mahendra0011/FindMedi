/**
 * Verify Transaction — ported from client/src/pages/VerifyTransaction.jsx
 */
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, FileText, CreditCard, Smartphone, Landmark, Wallet, CheckCircle, Clock, AlertCircle, RotateCcw, Download, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { transactions } from '@/lib/api';

const methodIcons: Record<string, typeof CreditCard> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Landmark,
  cash: Wallet,
  wallet: Smartphone,
  online: CreditCard,
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-blue-500/10 text-blue-600', icon: RotateCcw },
};

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VerifyTransactionPage() {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!searchId.trim()) return toast.error('Please enter a Transaction ID, Invoice ID, or any valid ID');
    setLoading(true);
    setResult(null);
    try {
      const res = await transactions.verify(searchId.trim());
      setResult(res as unknown as Record<string, unknown>);
      toast.success('Transaction verified successfully');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction not found';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const payment = (result?.payment ?? result) as Record<string, string | number> | undefined;
  const hasResult = !!payment && !!result;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Verify Transaction</h1>
        <p className="text-muted-foreground text-sm">Enter any valid ID to verify a transaction</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Enter Transaction ID / Invoice ID / Bill ID / Appointment ID / Booking ID / Order ID / Payment ID"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleVerify();
          }}
        />
        <Button onClick={handleVerify} disabled={loading} className="sm:w-auto w-full gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Verify
        </Button>
      </div>

      {!hasResult && !loading && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Enter an ID above and click Verify to see transaction details</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {hasResult && payment && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Transaction Details</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await transactions.downloadInvoice(String(payment.transaction_id ?? payment._id ?? ''), `${String(payment.transaction_id ?? 'invoice')}.pdf`);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : 'Unable to download invoice');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-1" /> Invoice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await transactions.downloadBill(String(payment.transaction_id ?? payment._id ?? ''), `${String(payment.transaction_id ?? 'bill')}-bill.pdf`);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : 'Unable to download bill');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-1" /> Bill
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Transaction ID</label>
                    <p className="font-mono text-sm mt-1 break-all">{String(payment.transaction_id ?? payment._id ?? '-')}</p>
                  </div>
                  {payment.transaction_id && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(String(payment.transaction_id))}>
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Invoice ID</label>
                  <p className="font-mono text-sm mt-1 break-all">{String(payment.invoice_id ?? '-')}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</label>
                  <p className="text-2xl font-bold text-foreground mt-1">₹{Number(payment.amount ?? 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Payment Method</label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const Icon = methodIcons[String(payment.method ?? '')] || CreditCard;
                      return <Icon className="w-5 h-5 text-primary" />;
                    })()}
                    <span className="capitalize">{String(payment.method ?? 'Unknown')}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="mt-1">
                    {(() => {
                      const cfg = statusConfig[String(payment.status ?? 'pending')] ?? statusConfig['pending']!;
                      const Icon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" /> {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Created</label>
                  <p className="text-sm mt-1">{formatDate(String(payment.createdAt ?? payment.date ?? ''))}</p>
                </div>
                {payment.patientName && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Patient</label>
                    <p className="text-sm mt-1">{String(payment.patientName)}</p>
                  </div>
                )}
                {payment.serviceType && (
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Service</label>
                    <p className="text-sm mt-1 capitalize">{String(payment.serviceType)}</p>
                  </div>
                )}
                {result && (
                  <div className="p-3 bg-muted/30 rounded-xl text-xs break-all">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2).slice(0, 2000)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
