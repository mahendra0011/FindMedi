import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, User, Search, CheckCircle, XCircle, Calendar, Eye, Clock,
  ChevronRight, ChevronLeft, AlertCircle, RefreshCw, Timer, Pill,
  FlaskConical, X, RotateCcw, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const STATUS_COLORS = {
  Pending:  'bg-amber-500/10 text-amber-600 border-amber-200',
  Verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  Rejected: 'bg-red-500/10 text-red-600 border-red-200',
};

const REJECTION_REASONS = [
  { id: 'blurry',    label: 'Prescription image is blurry/unclear' },
  { id: 'expired',   label: 'Prescription is expired' },
  { id: 'no_stamp',  label: 'Doctor stamp/signature missing' },
  { id: 'mismatch',  label: 'Test name does not match prescription' },
  { id: 'qty',       label: 'Requested tests exceed prescription' },
  { id: 'other',     label: 'Other reason' },
];

// Humanise minutes-since
function minutesSince(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff} min${diff > 1 ? 's' : ''} ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}

// SLA urgency: amber >10 min, red >20 min
function urgencyLevel(iso) {
  if (!iso) return null;
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins > 20) return 'critical';
  if (mins > 10) return 'urgent';
  return null;
}



export default function LabPrescriptionQueue() {
  const [queue,        setQueue]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filter,       setFilter]       = useState('All');
  const [selectedRx,   setSelectedRx]   = useState(null);
  const [showPanel,    setShowPanel]    = useState(false);
  const [showRejectDlg,setShowRejectDlg]= useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing,   setProcessing]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLabBookings({});
      setQueue(res.bookings || []);
    } catch {
      setQueue([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live SLA ticker — re-render every 30s to refresh urgency badges
  useEffect(() => {
    const t = setInterval(() => setQueue(q => [...q]), 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = queue.filter(r => {
    const matchSearch = !search ||
      (r.patientName || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.bookingId   || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || r.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    All:      queue.length,
    Pending:  queue.filter(r => r.status === 'Pending').length,
    Verified: queue.filter(r => r.status === 'Verified').length,
    Rejected: queue.filter(r => r.status === 'Rejected').length,
  };

  // Stats
  const pendingCount       = counts.Pending;
  const verifiedToday      = counts.Verified;
  const rejectedToday      = counts.Rejected;
  const avgProcessingMins  = verifiedToday > 0 ? Math.round(480 / verifiedToday) : 0;

  const handleAccept = async (id) => {
    setProcessing(true);
    try {
      await api.updateLabBooking(id, { status: 'Verified' });
      setQueue(prev => prev.map(r => r._id === id ? { ...r, status: 'Verified' } : r));
      if (selectedRx?._id === id) setSelectedRx(prev => ({ ...prev, status: 'Verified' }));
      toast.success('✅ Prescription verified — booking confirmed.');
    } catch {
      toast.error('Failed to verify prescription — please try again.');
    }
    setProcessing(false);
  };

  const openRejectModal = (rx) => {
    setRejectTarget(rx);
    setRejectReason('');
    setShowRejectDlg(true);
  };

  const confirmReject = async () => {
    if (!rejectReason) { toast.error('Please select a rejection reason'); return; }
    setProcessing(true);
    try {
      await api.updateLabBooking(rejectTarget._id, { status: 'Rejected', notes: rejectReason });
      setQueue(prev => prev.map(r => r._id === rejectTarget._id
        ? { ...r, status: 'Rejected', notes: rejectReason } : r));
      if (selectedRx?._id === rejectTarget._id)
        setSelectedRx(prev => ({ ...prev, status: 'Rejected', notes: rejectReason }));
      toast.error(`❌ Prescription rejected: ${REJECTION_REASONS.find(r => r.id === rejectReason)?.label}`);
    } catch {
      toast.error('Failed to reject prescription — please try again.');
    }
    setShowRejectDlg(false);
    setRejectTarget(null);
    setProcessing(false);
  };

  const openPanel = (rx) => { setSelectedRx(rx); setShowPanel(true); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Prescription Verification Queue</h1>
        <p className="text-muted-foreground mt-0.5">{pendingCount} pending verification{pendingCount !== 1 ? 's' : ''}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending',          value: pendingCount,      color: 'text-amber-600',   icon: Clock },
          { label: 'Verified Today',   value: verifiedToday,     color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Rejected Today',   value: rejectedToday,     color: 'text-red-500',     icon: XCircle },
          { label: 'Avg Process Time', value: `${avgProcessingMins}m`, color: 'text-primary', icon: Timer },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-card rounded-xl border border-border/60 p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color, 'bg-current/10')}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div>
              <p className={cn('text-xl font-bold font-heading', color)}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'Pending', 'Verified', 'Rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}>
              {f} <span className="ml-1 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by patient name or booking ID..." className="pl-10" />
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 rounded-xl shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Queue list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No prescriptions in queue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rx, i) => {
            const urgency = rx.status === 'Pending' ? urgencyLevel(rx.submittedAt) : null;
            return (
              <motion.div key={rx._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  'bg-card rounded-2xl border p-5 hover:shadow-md transition-all',
                  urgency === 'critical' ? 'border-red-300 dark:border-red-700' :
                  urgency === 'urgent'   ? 'border-amber-300 dark:border-amber-700' :
                                          'border-border/60'
                )}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {rx.patientName?.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{rx.patientName}</p>
                        <Badge variant="outline" className="text-[10px] font-mono">{rx.bookingId}</Badge>
                        <Badge className={cn('text-[10px]', STATUS_COLORS[rx.status])}>
                          {rx.status}
                        </Badge>
                        {urgency === 'critical' && (
                          <Badge className="text-[10px] bg-red-500/10 text-red-600 border-red-200 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Overdue
                          </Badge>
                        )}
                        {urgency === 'urgent' && (
                          <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                            <Timer className="w-2.5 h-2.5 mr-0.5" /> Urgent
                          </Badge>
                        )}
                      </div>

                      {/* Tests */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {(rx.testNames || []).map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                            <FlaskConical className="w-2.5 h-2.5" /> {t}
                          </span>
                        ))}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {rx.doctorName && <span>Ref: {rx.doctorName}</span>}
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> {rx.collectionDate} · {rx.slot}
                        </span>
                        {rx.submittedAt && (
                          <span className={cn(
                            'flex items-center gap-0.5',
                            urgency === 'critical' ? 'text-red-500' :
                            urgency === 'urgent'   ? 'text-amber-600' : ''
                          )}>
                            <Clock className="w-3 h-3" /> {minutesSince(rx.submittedAt)}
                          </span>
                        )}
                      </div>

                      {rx.status === 'Rejected' && rx.notes && (
                        <p className="text-xs text-red-500 mt-1">Rejection: {rx.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs"
                      onClick={() => openPanel(rx)}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                    {rx.status === 'Pending' && (
                      <>
                        <Button size="sm"
                          className="gap-1.5 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleAccept(rx._id)} disabled={processing}>
                          <CheckCircle className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button size="sm" variant="outline"
                          className="gap-1.5 rounded-xl text-xs text-red-500 hover:border-red-200"
                          onClick={() => openRejectModal(rx)} disabled={processing}>
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {rx.status === 'Rejected' && (
                      <Button size="sm" variant="outline"
                        className="gap-1.5 rounded-xl text-xs"
                        onClick={() => {
                          setQueue(prev => prev.map(r => r._id === rx._id ? { ...r, status: 'Pending', notes: '' } : r));
                          toast.info('Booking re-opened for review');
                        }}>
                        <RotateCcw className="w-3.5 h-3.5" /> Re-review
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Detail slide-out panel ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPanel && selectedRx && (
          <motion.div
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Backdrop */}
            <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
            {/* Panel */}
            <motion.div
              className="w-full max-w-md bg-background border-l border-border/60 h-full overflow-y-auto p-6 space-y-5"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}>
              <div className="flex items-center justify-between">
                <h2 className="font-heading font-bold text-lg text-foreground">Prescription Details</h2>
                <button onClick={() => setShowPanel(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                  {selectedRx.patientName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedRx.patientName}</p>
                  <p className="text-xs text-muted-foreground">{selectedRx.bookingId}</p>
                  {selectedRx.doctorName && <p className="text-xs text-muted-foreground">Ref by: {selectedRx.doctorName}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Tests Requested</p>
                  {(selectedRx.testNames || []).map(t => (
                    <div key={t} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 mb-1">
                      <FlaskConical className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-medium">{t}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Collection Date</p>
                    <p className="font-medium">{selectedRx.collectionDate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Slot</p>
                    <p className="font-medium">{selectedRx.slot || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={cn('text-xs', STATUS_COLORS[selectedRx.status])}>{selectedRx.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{minutesSince(selectedRx.submittedAt)}</p>
                  </div>
                </div>

                {selectedRx.notes && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <p className="text-xs font-medium text-red-600 mb-1">Rejection Note</p>
                    <p className="text-sm text-red-700 dark:text-red-400">{selectedRx.notes}</p>
                  </div>
                )}

                {/* Rx image placeholder */}
                <div className="rounded-xl bg-muted/30 border border-dashed border-border/60 h-40 flex flex-col items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {selectedRx.prescriptionUrl ? 'View Prescription' : 'No image uploaded'}
                  </p>
                  {selectedRx.prescriptionUrl && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-lg">
                      <Eye className="w-3.5 h-3.5" /> Open
                    </Button>
                  )}
                </div>
              </div>

              {selectedRx.status === 'Pending' && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => { handleAccept(selectedRx._id); setShowPanel(false); }} disabled={processing}>
                    <CheckCircle className="w-4 h-4" /> Accept
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2 rounded-xl text-red-500 hover:border-red-200"
                    onClick={() => { setShowPanel(false); openRejectModal(selectedRx); }} disabled={processing}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject reason modal ─────────────────────────────────────────────── */}
      {showRejectDlg && rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowRejectDlg(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Reject Prescription</h3>
                <p className="text-xs text-muted-foreground">{rejectTarget.patientName} · {rejectTarget.bookingId}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">Select reason for rejection:</p>
            <div className="space-y-2 mb-5">
              {REJECTION_REASONS.map(r => (
                <button key={r.id} onClick={() => setRejectReason(r.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border text-sm transition-all',
                    rejectReason === r.id
                      ? 'border-red-300 bg-red-50 dark:bg-red-500/10 text-foreground'
                      : 'border-border/60 text-muted-foreground hover:border-red-200'
                  )}>
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowRejectDlg(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 rounded-xl gap-2"
                onClick={confirmReject} disabled={!rejectReason || processing}>
                <Send className="w-3.5 h-3.5" /> Confirm Reject
              </Button>
            </div>


          </motion.div>
        </div>
      )}
    </div>
  );
}
