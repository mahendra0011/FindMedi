import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Beaker, Pill, IndianRupee, FileText, Download, CreditCard, Smartphone, Landmark, Wallet, CheckCircle, Clock, AlertCircle, RotateCcw, Calendar, ArrowUpDown, ChevronDown, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, downloadPaymentInvoice, downloadBillPdf } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const typeFilters = ['All', 'appointment', 'test', 'medicine'];
const statusFilters = ['All', 'completed', 'pending', 'failed', 'refunded'];
const dateRanges = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

const statusConfig = {
  completed: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-blue-500/10 text-blue-600', icon: RotateCcw },
};

const methodIcons = { card: CreditCard, upi: Smartphone, netbanking: Landmark, cash: Wallet };

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function PatientHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const filter = {};
      if (typeFilter !== 'All') filter.serviceType = typeFilter;
      const res = await api.getTransactions(filter);
      const list = res?.data || res?.payments || [];
      setTransactions(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [typeFilter]);

  const getDateRangeFilter = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (dateRange === 'This Month') return { $gte: startOfMonth };
    if (dateRange === 'Last Month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { $gte: start, $lte: end };
    }
    if (dateRange === 'Last 3 Months') {
      return { $gte: new Date(now.getFullYear(), now.getMonth() - 3, 1) };
    }
    return null;
  };

  const filtered = transactions.filter(t => {
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    const dr = getDateRangeFilter();
    if (dr) {
      const d = new Date(t.createdAt);
      if (dr.$gte && d < dr.$gte) return false;
      if (dr.$lte && d > dr.$lte) return false;
    }
    return true;
  });

  const totalPaid = filtered.filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
  const pendingCount = filtered.filter(t => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payment History</h1>
        <p className="text-muted-foreground text-sm">Complete record of all your payments across services</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">₹{totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{pendingCount}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowUpDown className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Type + Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {typeFilters.map(f => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {f === 'All' ? 'All' : f === 'appointment' ? 'Appointments' : f === 'test' ? 'Tests' : 'Medicines'}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-border/60 mx-1 hidden sm:block" />
          <div className="flex gap-1.5 flex-wrap">
            {statusFilters.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {f === 'All' ? 'All Status' : f === 'completed' ? 'Paid' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Date range */}
        <div className="relative inline-block self-start">
          <button onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all">
            <Calendar className="w-3.5 h-3.5" />
            {dateRange}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border/60 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
              {dateRanges.map(r => (
                <button key={r} onClick={() => { setDateRange(r); setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-muted ${dateRange === r ? 'text-primary' : 'text-muted-foreground'}`}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
          <IndianRupee className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No payments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complete a booking or order to see your payment history here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((txn, i) => {
            const StatusIcon = statusConfig[txn.status]?.icon || CheckCircle;
            const MethodIcon = methodIcons[txn.method] || CreditCard;
            const ref = txn.reference || {};
            const isAppt = txn.serviceType === 'appointment';
            const isTest = txn.serviceType === 'test';
            const isMed = txn.serviceType === 'medicine';

            // Build title
            let title = txn.description || '';
            if (isAppt && !title) title = ref.doctorName ? `Consultation with ${ref.doctorName}` : 'Appointment';
            if (isTest) {
              const names = ref.testDetails?.length ? ref.testDetails : ref.tests || [];
              title = title || (names.length ? `${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2} more` : ''}` : 'Lab Test');
              if (names.length > 1) title = `${names[0]} +${names.length - 1} more (${names.length} tests)`;
              else if (names.length === 1) title = names[0];
            }
            if (isMed) {
              const items = ref.items || [];
              title = title || (items.length ? `${items.length} items — ${items[0]}${items.length > 1 ? ` +${items.length - 1} more` : ''}` : 'Medicine Order');
            }

            // Provider subtitle
            let providerLine = txn.provider || '';
            if (isAppt && ref.doctorSpecialization) providerLine = providerLine + ` — ${ref.doctorSpecialization}`;

            // Detail line
            let detailLine = '';
            if (isAppt) detailLine = ref.appointmentDate ? `Appointment: ${formatShortDate(ref.appointmentDate)}, ${ref.appointmentTime || ''}` : '';
            if (isTest) detailLine = `Collection: ${ref.collectionMode || 'Lab Visit'}${ref.timeSlot ? `, ${ref.timeSlot}` : ''}`;
            if (isMed) detailLine = `Delivery: ${ref.deliveryMode === 'delivery' ? 'Home' : 'Store Pickup'}`;

            // Type icon
            const TypeIcon = isAppt ? Stethoscope : isTest ? Beaker : Pill;
            const typeLabel = isAppt ? 'Appointment' : isTest ? 'Lab Test' : 'Medicine';
            const typeBadgeColor = isAppt ? 'bg-blue-500/10 text-blue-600' : isTest ? 'bg-purple-500/10 text-purple-600' : 'bg-rose-500/10 text-rose-600';

            // Second button config
            const secondBtn = isAppt
              ? { label: 'View Appointment', onClick: () => navigate('/patient/appointments') }
              : isTest
                ? { label: 'Track Booking', onClick: () => navigate('/patient/bookings') }
                : { label: 'Track Order', onClick: () => txn.referenceId && navigate(`/order-tracking/${txn.referenceId}`) };

            return (
              <motion.div key={txn._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-lg transition-all">

                {/* Main card body */}
                <div className="p-5">
                  {/* Top row: icon + type badge */}
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[txn.status]?.color || ''}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[txn.status]?.label || txn.status}
                        </span>
                      </div>
                      <p className="font-heading font-semibold text-foreground text-sm leading-tight mt-1">{title}</p>
                      {providerLine && <p className="text-xs text-muted-foreground mt-0.5">{providerLine}</p>}
                    </div>
                  </div>

                  {/* Date + detail */}
                  <div className="ml-[52px] space-y-0.5 mb-3">
                    <p className="text-xs text-muted-foreground">{formatDate(txn.createdAt)}</p>
                    {detailLine && <p className="text-xs text-muted-foreground">{detailLine}</p>}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/40 my-3" />

                  {/* Bottom: amount + payment info */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-heading text-xl font-bold text-foreground">₹{txn.amount?.toLocaleString('en-IN') || 0}</p>
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

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="gap-1.5 rounded-xl h-9 text-xs"
                        onClick={(e) => { e.stopPropagation(); downloadBillPdf(txn._id, `${txn.invoice_id || 'bill'}.pdf`).catch(err => toast.error(err.message)); }}>
                        <FileText className="w-3.5 h-3.5" /> Download Bill
                      </Button>
                      {txn.status === 'completed' && (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => { e.stopPropagation(); downloadPaymentInvoice(txn._id, `${txn.invoice_id || 'invoice'}.pdf`).catch(err => toast.error(err.message)); }}>
                          <Download className="w-3.5 h-3.5" /> Invoice
                        </Button>
                      )}
                      {secondBtn && (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => { e.stopPropagation(); secondBtn.onClick(); }}>
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
