/**
 * Payment History — ported from client/src/pages/patient/PatientHistory.jsx (Phase 4).
 * Transactions across appointments, tests and medicines with bill downloads.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Stethoscope,
  Beaker,
  Pill,
  IndianRupee,
  FileText,
  Download,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { payments, downloadBillPdf, downloadPaymentInvoice } from '@/lib/api';
import { toast } from 'sonner';

const typeFilters = ['All', 'appointment', 'test', 'medicine'];
const statusFilters = ['All', 'completed', 'pending', 'failed', 'refunded'];
const dateRanges = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  completed: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-blue-500/10 text-blue-600', icon: RotateCcw },
};

const methodIcons: Record<string, LucideIcon> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Landmark,
  cash: Wallet,
};

interface TxReference {
  doctorName?: string;
  doctorSpecialization?: string;
  testDetails?: string[];
  tests?: string[];
  items?: string[];
  appointmentDate?: string;
  appointmentTime?: string;
  collectionMode?: string;
  timeSlot?: string;
  deliveryMode?: string;
}

interface TxItem {
  _id: string;
  description?: string;
  serviceType?: string;
  amount?: number;
  status?: string;
  method?: string;
  provider?: string;
  transaction_id?: string;
  invoice_id?: string;
  referenceId?: string;
  reference?: TxReference;
  createdAt?: string;
}

function formatDate(d?: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(d?: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MedicalHistoryPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const {
    data: transactions = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient-history', typeFilter],
    queryFn: async (): Promise<TxItem[]> => {
      const params = typeFilter !== 'All' ? { serviceType: typeFilter } : {};
      const res = await payments.get(params);
      const list = (Array.isArray(res) ? res : []) as unknown as TxItem[];
      return list;
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    const handleFocus = () => {
      void refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    if (dateRange !== 'All Time') {
      const now = new Date();
      const d = new Date(t.createdAt ?? '');
      if (dateRange === 'This Month') {
        if (d < new Date(now.getFullYear(), now.getMonth(), 1)) return false;
      } else if (dateRange === 'Last Month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        if (d < start || d > end) return false;
      } else if (dateRange === 'Last 3 Months') {
        if (d < new Date(now.getFullYear(), now.getMonth() - 3, 1)) return false;
      }
    }
    return true;
  });

  const totalPaid = filtered.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
  const pendingCount = filtered.filter((t) => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError && transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-1">Failed to load payment history</h3>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-muted-foreground text-sm">Complete record of all your payments across services</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </div>
          <p className="text-2xl font-bold text-foreground">₹{totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowUpDown className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {typeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {f === 'All' ? 'All' : f === 'appointment' ? 'Appointments' : f === 'test' ? 'Tests' : 'Medicines'}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />
          <div className="flex gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {f === 'All' ? 'All Status' : f === 'completed' ? 'Paid' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative inline-block self-start">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            {dateRange}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border/60 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
              {dateRanges.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setDateRange(r);
                    setShowDateDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-muted ${dateRange === r ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
          <IndianRupee className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No payments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete a booking or order to see your payment history here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((txn, i) => {
            const StatusIcon = statusConfig[txn.status ?? '']?.icon || CheckCircle;
            const MethodIcon = methodIcons[txn.method ?? ''] || CreditCard;
            const ref: TxReference = (txn.reference ?? {}) as TxReference;
            const isAppt = txn.serviceType === 'appointment';
            const isTest = txn.serviceType === 'test';
            const isMed = txn.serviceType === 'medicine';

            let title = txn.description || '';
            if (isAppt && !title) title = ref.doctorName ? `Consultation with ${ref.doctorName}` : 'Appointment';
            if (isTest) {
              const names = ref.testDetails?.length ? ref.testDetails : ref.tests || [];
              title = title || (names.length ? `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2} more` : ''}` : 'Lab Test');
              if (names.length > 1) title = `${names[0]} +${names.length - 1} more (${names.length} tests)`;
              else if (names.length === 1) title = names[0] ?? 'Lab Test';
            }
            if (isMed) {
              const items = ref.items || [];
              title = title || (items.length ? `${items.length} items — ${items[0]}${items.length > 1 ? ` +${items.length - 1} more` : ''}` : 'Medicine Order');
            }

            let providerLine = txn.provider || '';
            if (isAppt && ref.doctorSpecialization) providerLine = providerLine + ` — ${ref.doctorSpecialization}`;

            let detailLine = '';
            if (isAppt) detailLine = ref.appointmentDate ? `Appointment: ${formatShortDate(ref.appointmentDate)}, ${ref.appointmentTime || ''}` : '';
            if (isTest) detailLine = `Collection: ${ref.collectionMode || 'Lab Visit'}${ref.timeSlot ? `, ${ref.timeSlot}` : ''}`;
            if (isMed) detailLine = `Delivery: ${ref.deliveryMode === 'delivery' ? 'Home' : 'Store Pickup'}`;

            const TypeIcon = isAppt ? Stethoscope : isTest ? Beaker : Pill;
            const typeLabel = isAppt ? 'Appointment' : isTest ? 'Lab Test' : 'Medicine';
            const typeBadgeColor = isAppt
              ? 'bg-blue-500/10 text-blue-600'
              : isTest
                ? 'bg-purple-500/10 text-purple-600'
                : 'bg-rose-500/10 text-rose-600';

            const secondBtn = isAppt
              ? { label: 'View Appointment', onClick: () => router.push('/patient/appointments') }
              : isTest
                ? { label: 'Track Booking', onClick: () => router.push('/patient/bookings') }
                : {
                    label: 'Track Order',
                    onClick: () => {
                      if (txn.referenceId) router.push(`/order-tracking/${txn.referenceId}`);
                    },
                  };

            return (
              <motion.div
                key={txn._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBadgeColor}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadgeColor}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[txn.status ?? '']?.color || ''}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[txn.status ?? '']?.label || txn.status}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground text-sm leading-tight mt-1">{title}</p>
                      {providerLine && <p className="text-xs text-muted-foreground mt-0.5">{providerLine}</p>}
                    </div>
                  </div>

                  <div className="ml-[52px] space-y-0.5 mb-3">
                    <p className="text-xs text-muted-foreground">{formatDate(txn.createdAt)}</p>
                    {detailLine && <p className="text-xs text-muted-foreground">{detailLine}</p>}
                  </div>

                  <div className="border-t border-border/40 my-3" />

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-foreground">₹{txn.amount?.toLocaleString('en-IN') || 0}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MethodIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground capitalize">{txn.method || '-'}</span>
                        {txn.transaction_id && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-mono text-muted-foreground">{txn.transaction_id}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 rounded-xl h-9 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          const billName = txn.invoice_id ? txn.invoice_id.replace('INV', 'BILL') : 'bill';
                          downloadBillPdf(txn._id, `${billName}.pdf`).catch((err: Error) => toast.error(err.message));
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" /> Download Bill
                      </Button>
                      {txn.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPaymentInvoice(txn._id, `${txn.invoice_id || 'invoice'}.pdf`).catch((err: Error) =>
                              toast.error(err.message),
                            );
                          }}
                        >
                          <Download className="w-3.5 h-3.5" /> Invoice
                        </Button>
                      )}
                      {secondBtn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            secondBtn.onClick();
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> {secondBtn.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
