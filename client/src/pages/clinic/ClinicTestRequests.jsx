import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TestTube, Search, Calendar, User, Phone, IndianRupee, Clock,
  FlaskConical, Home, FileText, CheckCircle, XCircle, Loader2, Filter,
  TrendingUp, AlertCircle, CheckCircle2, X, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';

const STATUS_CONFIG = {
  Pending: { color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: Clock, label: 'Pending' },
  Confirmed: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: CheckCircle, label: 'Confirmed' },
  'Sample Collected': { color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200', icon: FlaskConical, label: 'Sample Collected' },
  Processing: { color: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Loader2, label: 'Processing' },
  Completed: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: 'Completed' },
  Cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200', icon: XCircle, label: 'Cancelled' },
  Rescheduled: { color: 'bg-orange-500/10 text-orange-600 border-orange-200', icon: Calendar, label: 'Rescheduled' },
};

const PAYMENT_CONFIG = {
  Pending: { color: 'bg-amber-500/10 text-amber-600', label: 'Pending' },
  Paid: { color: 'bg-emerald-500/10 text-emerald-600', label: 'Paid' },
  'Partially Paid': { color: 'bg-blue-500/10 text-blue-600', label: 'Partial' },
  Refunded: { color: 'bg-red-500/10 text-red-600', label: 'Refunded' },
};

const VISIT_ICONS = {
  'Walk-in': User,
  'Home Collection': Home,
  'Appointment': Calendar,
};

export default function ClinicTestRequests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [visitFilter, setVisitFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      if (search) params.search = search;
      const res = await api.getLabBookings(params);
      const list = res?.bookings || res?.data || [];
      setBookings(list);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load test requests');
      setBookings([]);
    }
    setLoading(false);
  }, [statusFilter, dateFilter, search]);

  useEffect(() => { load(); }, [load]);

  const filtered = bookings.filter(b => {
    if (paymentFilter !== 'All' && b.paymentStatus !== paymentFilter) return false;
    if (visitFilter !== 'All' && b.visitType !== visitFilter) return false;
    return true;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    revenue: bookings.filter(b => b.paymentStatus === 'Paid').reduce((s, b) => s + (b.discountedAmount || b.totalAmount || 0), 0),
  };

  const handleUpdateStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      await api.updateLabBooking(id, { status: newStatus });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));
      toast.success(`Status updated to ${newStatus}`);
    } catch (e) {
      toast.error(e.message || 'Failed to update status');
    }
    setUpdating(null);
  };

  const handleUpdatePayment = async (id, newPayment) => {
    setUpdating(id);
    try {
      await api.updateLabBooking(id, { paymentStatus: newPayment });
      setBookings(prev => prev.map(b => b._id === id ? { ...b, paymentStatus: newPayment } : b));
      toast.success(`Payment status updated to ${newPayment}`);
    } catch (e) {
      toast.error(e.message || 'Failed to update payment status');
    }
    setUpdating(null);
  };

  const statusOptions = ['All', 'Pending', 'Confirmed', 'Sample Collected', 'Processing', 'Completed', 'Cancelled', 'Rescheduled'];
  const paymentOptions = ['All', 'Pending', 'Paid', 'Partially Paid', 'Refunded'];
  const visitOptions = ['All', 'Walk-in', 'Home Collection', 'Appointment'];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <TestTube className="w-5 h-5 text-rose-500" />
            </span>
            Test Requests
          </h1>
          <p className="text-muted-foreground mt-1">Patient-initiated test bookings for your clinic</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, icon: TestTube, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2.5`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/60 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by booking ID or patient name..." className="pl-10" />
          </div>
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="sm:w-44" />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
          </div>
          {statusOptions.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${statusFilter === s ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5" /> Payment:
          </span>
          {paymentOptions.map(p => (
            <button key={p} onClick={() => setPaymentFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${paymentFilter === p ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" /> Visit Type:
          </span>
          {visitOptions.map(v => (
            <button key={v} onClick={() => setVisitFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${visitFilter === v ? 'border-primary bg-primary/5 text-primary' : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} test request{filtered.length !== 1 ? 's' : ''} found</p>
        {(statusFilter !== 'All' || paymentFilter !== 'All' || visitFilter !== 'All' || dateFilter || search) && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setStatusFilter('All'); setPaymentFilter('All'); setVisitFilter('All'); setDateFilter(''); setSearch(''); }}>
            <X className="w-3 h-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Bookings List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <TestTube className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">No test requests found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">When patients book tests, they will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking, idx) => {
            const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG['Pending'];
            const payCfg = PAYMENT_CONFIG[booking.paymentStatus] || PAYMENT_CONFIG['Pending'];
            const VisitIcon = VISIT_ICONS[booking.visitType] || User;
            const StatusIcon = statusCfg.icon;
            const isUpdating = updating === booking._id;
            const testList = booking.tests?.join(', ') || 'Test';
            const amount = booking.discountedAmount || booking.totalAmount || 0;

            return (
              <motion.div key={booking._id || booking.bookingId} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all group">
                {/* Top row: Booking ID + Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center shadow-sm">
                      <TestTube className="w-5.5 h-5.5 text-rose-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground">{booking.bookingId || `BK-${booking._id?.slice(-6)}`}</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                          <StatusIcon className={`w-2.5 h-2.5 ${booking.status === 'Processing' ? 'animate-spin' : ''}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDisplayDate(booking.bookingDate)} {booking.timeSlot && `at ${booking.timeSlot}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">₹{amount.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${payCfg.color}`}>{payCfg.label}</span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-xl border border-border/30">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Patient</p>
                      <p className="text-sm font-medium text-foreground truncate">{booking.patientName || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-xl border border-border/30">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium text-foreground truncate">{booking.patientPhone || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-xl border border-border/30">
                    <VisitIcon className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Visit Type</p>
                      <p className="text-sm font-medium text-foreground truncate">{booking.visitType || 'Walk-in'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-xl border border-border/30">
                    <FlaskConical className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Tests</p>
                      <p className="text-sm font-medium text-foreground truncate">{booking.tests?.length || 0} test(s)</p>
                    </div>
                  </div>
                </div>

                {/* Tests List */}
                <div className="p-3 bg-muted/10 rounded-xl border border-border/20 mb-4">
                  <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1"><FlaskConical className="w-3 h-3" /> Tests Booked</p>
                  <div className="flex flex-wrap gap-1.5">
                    {booking.tests?.map((test, i) => (
                      <span key={i} className="text-xs font-medium text-foreground bg-card px-2.5 py-1 rounded-lg border border-border/40">
                        {test}
                      </span>
                    )) || <span className="text-xs text-muted-foreground">No tests specified</span>}
                  </div>
                </div>

                {/* Home Collection Address */}
                {booking.visitType === 'Home Collection' && booking.homeCollectionAddress && (
                  <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-xl border border-blue-500/20 mb-4">
                    <Home className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Home Collection Address</p>
                      <p className="text-xs text-foreground">{booking.homeCollectionAddress}</p>
                      {booking.homeCollectionFee > 0 && <p className="text-[10px] text-primary mt-0.5">Collection Fee: ₹{booking.homeCollectionFee}</p>}
                    </div>
                  </div>
                )}

                {/* Prescription */}
                {booking.prescriptionUrl && (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/20 mb-4">
                    <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-foreground">Prescription uploaded</span>
                    {booking.prescriptionVerified ? (
                      <Badge className="text-[9px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200">Verified</Badge>
                    ) : (
                      <Badge className="text-[9px] h-5 bg-amber-500/10 text-amber-600 border-amber-200">Pending Verification</Badge>
                    )}
                  </div>
                )}

                {/* Notes */}
                {booking.notes && (
                  <div className="p-2.5 bg-muted/10 rounded-xl border border-border/20 mb-4">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Notes</p>
                    <p className="text-xs text-foreground">{booking.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/20">
                  {booking.status === 'Pending' && (
                    <>
                      <Button size="sm" className="gap-1.5 rounded-lg text-xs h-8" disabled={isUpdating}
                        onClick={() => handleUpdateStatus(booking._id, 'Confirmed')}>
                        <CheckCircle className="w-3.5 h-3.5" /> Confirm
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs h-8 text-red-600 border-red-200 hover:bg-red-500/5" disabled={isUpdating}
                        onClick={() => handleUpdateStatus(booking._id, 'Cancelled')}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    </>
                  )}
                  {booking.status === 'Confirmed' && (
                    <Button size="sm" className="gap-1.5 rounded-lg text-xs h-8" disabled={isUpdating}
                      onClick={() => handleUpdateStatus(booking._id, 'Sample Collected')}>
                      <FlaskConical className="w-3.5 h-3.5" /> Mark Sample Collected
                    </Button>
                  )}
                  {booking.status === 'Sample Collected' && (
                    <Button size="sm" className="gap-1.5 rounded-lg text-xs h-8" disabled={isUpdating}
                      onClick={() => handleUpdateStatus(booking._id, 'Processing')}>
                      <Loader2 className="w-3.5 h-3.5" /> Start Processing
                    </Button>
                  )}
                  {booking.status === 'Processing' && (
                    <Button size="sm" className="gap-1.5 rounded-lg text-xs h-8 bg-emerald-600 hover:bg-emerald-700" disabled={isUpdating}
                      onClick={() => handleUpdateStatus(booking._id, 'Completed')}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                    </Button>
                  )}
                  {booking.paymentStatus === 'Pending' && (
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-lg text-xs h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-500/5" disabled={isUpdating}
                      onClick={() => handleUpdatePayment(booking._id, 'Paid')}>
                      <IndianRupee className="w-3.5 h-3.5" /> Mark Paid
                    </Button>
                  )}
                  {booking.reportUrl && (
                    <a href={booking.reportUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="gap-1.5 rounded-lg text-xs h-8 text-primary">
                        <Download className="w-3.5 h-3.5" /> View Report
                      </Button>
                    </a>
                  )}
                  {isUpdating && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}