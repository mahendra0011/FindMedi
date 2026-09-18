'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Pill,
  Search,
  Download,
  RefreshCw,
  Receipt,
  FileText,
  IndianRupee,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { api, downloadPrescriptionPdf, downloadInvoicePdf } from '@/lib/api';
import { toast } from 'sonner';

interface ClinicRecord {
  _id?: string;
  prescriptionId?: string;
  patient?: string;
  patientName?: string;
  doctor?: string;
  doctorName?: string;
  type?: string;
  diagnosis?: string;
  date?: string;
  createdAt?: string;
  status?: string;
  medicines?: unknown[];
}

interface ClinicBillData {
  type?: string;
  isInvoice?: boolean;
  isBill?: boolean;
  items?: unknown[];
}

interface ClinicBill {
  _id?: string;
  invoiceId?: string;
  patient?: string;
  doctor?: string;
  service?: string;
  amount?: number;
  paid?: number;
  status?: string;
  billType?: string;
  date?: string;
  createdAt?: string;
  dueDate?: string;
  data?: ClinicBillData;
  services?: unknown[];
}

type TabKey = 'prescriptions' | 'bills' | 'invoices';

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as { data?: unknown; records?: unknown; bills?: unknown };
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.records)) return obj.records;
    if (Array.isArray(obj.bills)) return obj.bills;
  }
  return [];
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function formatMoney(value?: number): string {
  return `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
}

function PrescriptionsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-52 bg-muted/60 rounded-lg" />
          <div className="h-3 w-64 bg-muted/40 rounded-md mt-2" />
        </div>
        <div className="h-10 w-28 bg-muted/50 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-5 space-y-2">
            <div className="h-7 w-16 bg-muted/60 rounded-lg" />
            <div className="h-3 w-24 bg-muted/40 rounded-md" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border/40 bg-muted/20" />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-success/10 text-success',
  Pending: 'bg-warning/10 text-warning',
  Overdue: 'bg-destructive/10 text-destructive',
  Partial: 'bg-info/10 text-info',
  Active: 'bg-success/10 text-success',
  Completed: 'bg-success/10 text-success',
};

export default function ClinicPrescriptions() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [bills, setBills] = useState<ClinicBill[]>([]);
  const [invoices, setInvoices] = useState<ClinicBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabKey>('prescriptions');
  const [actionId, setActionId] = useState<string | null>(null);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const docName = user?.name?.toLowerCase() ?? '';
        const results = await Promise.allSettled([api.getRecords(), api.getBilling()]);

        if (results[0].status === 'fulfilled') {
          const recArr = toArray<ClinicRecord>(extractList(results[0].value as unknown));
          setRecords(
            recArr.filter((r) => {
              const isRx = (r.type ?? '').toLowerCase() === 'prescription' || r.prescriptionId !== undefined || r.diagnosis !== undefined;
              if (!isRx && r.type !== undefined) return false;
              if (!docName) return true;
              const doc = (r.doctor ?? r.doctorName ?? '').toLowerCase();
              return doc.includes(docName);
            }),
          );
        }

        if (results[1].status === 'fulfilled') {
          const billArr = toArray<ClinicBill>(extractList(results[1].value as unknown));
          const mine = billArr.filter((b) => {
            if (!docName) return true;
            return (b.doctor ?? '').toLowerCase().includes(docName);
          });
          const billList: ClinicBill[] = [];
          const invoiceList: ClinicBill[] = [];
          for (const b of mine) {
            const bt = (b.billType ?? b.data?.type ?? '').toLowerCase();
            if (bt === 'invoice' || b.data?.isInvoice) invoiceList.push(b);
            else if (bt === 'bill' || b.data?.isBill) billList.push(b);
            else {
              const hasItems = (b.data?.items?.length ?? 0) + (b.services?.length ?? 0) > 0;
              if (hasItems && (b.service ?? '').toLowerCase().includes('invoice')) invoiceList.push(b);
              else if (b.status === 'Paid' && hasItems) invoiceList.push(b);
              else billList.push(b);
            }
          }
          setBills(billList);
          setInvoices(invoiceList);
        }

        if (results.some((r) => r.status === 'rejected')) {
          toast.error('Failed to load some records');
        }
        if (isRefresh) toast.success('Records refreshed');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load records');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const q = search.trim().toLowerCase();
  const matchesSearch = useCallback(
    (hay: (string | undefined)[]) =>
      !q || hay.some((h) => (h ?? '').toLowerCase().includes(q)),
    [q],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((r) =>
        matchesSearch([r.patient, r.patientName, r.diagnosis, r.prescriptionId]),
      ),
    [records, matchesSearch],
  );
  const filteredBills = useMemo(
    () => bills.filter((b) => matchesSearch([b.patient, b.invoiceId, b.service])),
    [bills, matchesSearch],
  );
  const filteredInvoices = useMemo(
    () => invoices.filter((b) => matchesSearch([b.patient, b.invoiceId, b.service])),
    [invoices, matchesSearch],
  );

  const outstanding = useMemo(
    () =>
      [...bills, ...invoices].reduce(
        (sum, b) => sum + Math.max(0, (Number(b.amount) || 0) - (Number(b.paid) || 0)),
        0,
      ),
    [bills, invoices],
  );

  const handleDownloadRx = async (id?: string) => {
    if (!id) {
      toast.error('Prescription file unavailable');
      return;
    }
    setActionId(id);
    try {
      await downloadPrescriptionPdf(id, `prescription-${id}.pdf`);
      toast.success('Prescription downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setActionId(null);
    }
  };

  const handleDownloadInvoice = async (id?: string) => {
    if (!id) {
      toast.error('Invoice unavailable');
      return;
    }
    setActionId(id);
    try {
      await downloadInvoicePdf(id, `invoice-${id}.pdf`);
      toast.success('Invoice downloaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteRx = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Delete this prescription?')) return;
    setActionId(id);
    try {
      await api.del(`/records/${id}`);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      toast.success('Prescription deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <PrescriptionsSkeleton />;

  const statCards = [
    { label: 'Prescriptions', value: records.length, icon: Pill, iconClass: 'bg-primary/10 text-primary' },
    { label: 'Bills', value: bills.length, icon: Receipt, iconClass: 'bg-info/10 text-info' },
    { label: 'Invoices', value: invoices.length, icon: FileText, iconClass: 'bg-success/10 text-success' },
    { label: 'Outstanding', value: formatMoney(outstanding), icon: IndianRupee, iconClass: 'bg-warning/10 text-warning' },
  ];

  const billRow = (b: ClinicBill, isInvoice: boolean) => {
    const key = b._id ?? b.invoiceId ?? `${b.patient}-${b.date}`;
    const busy = actionId === b._id;
    return (
      <div
        key={key}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isInvoice ? 'bg-success/10' : 'bg-info/10'}`}>
            {isInvoice ? <FileText className="w-4 h-4 text-success" /> : <Receipt className="w-4 h-4 text-info" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">
              {b.patient || 'Patient'} · {formatMoney(b.amount)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {b.invoiceId ?? 'No invoice no.'} · {b.service || 'General'} · {formatDate(b.date ?? b.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={STATUS_STYLES[b.status ?? ''] ?? 'bg-muted text-muted-foreground'}>
            {b.status || 'Unknown'}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={() => void handleDownloadInvoice(b._id)}
            title="Download invoice"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Pill className="w-6 h-6 text-primary" /> Prescriptions & Billing
          </h1>
          <p className="text-muted-foreground text-sm">
            {records.length} prescriptions · {bills.length} bills · {invoices.length} invoices
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadAll(true)} disabled={refreshing} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2 ${s.iconClass}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="shrink-0">
          <TabsList>
            <TabsTrigger value="prescriptions">Prescriptions ({filteredRecords.length})</TabsTrigger>
            <TabsTrigger value="bills">Bills ({filteredBills.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({filteredInvoices.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 sm:max-w-sm sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, diagnosis, invoice…"
            className="pl-10"
          />
        </div>
      </div>

      {tab === 'prescriptions' && (
        <Card className="overflow-hidden">
          {filteredRecords.length === 0 ? (
            <CardContent className="text-center py-16">
              <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No prescriptions found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Issued prescriptions will appear here</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border/40">
              {filteredRecords.map((r) => {
                const key = r._id ?? `${r.patient}-${r.date}`;
                const busy = actionId === r._id;
                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Pill className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {r.patient ?? r.patientName ?? 'Patient'}
                          {r.diagnosis ? ` — ${r.diagnosis}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.prescriptionId ?? 'No Rx ID'} · {formatDate(r.date ?? r.createdAt)}
                          {r.medicines ? ` · ${r.medicines.length} medicine(s)` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.status && (
                        <Badge className={STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}>
                          {r.status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => void handleDownloadRx(r._id)}
                        title="Download prescription"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => void handleDeleteRx(r._id)}
                        title="Delete prescription"
                        className="text-muted-foreground/60 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'bills' && (
        <Card className="overflow-hidden">
          {filteredBills.length === 0 ? (
            <CardContent className="text-center py-16">
              <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No bills found</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border/40">{filteredBills.map((b) => billRow(b, false))}</div>
          )}
        </Card>
      )}

      {tab === 'invoices' && (
        <Card className="overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <CardContent className="text-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border/40">{filteredInvoices.map((b) => billRow(b, true))}</div>
          )}
        </Card>
      )}
    </motion.div>
  );
}
