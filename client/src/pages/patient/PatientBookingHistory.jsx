import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Beaker, Pill, Calendar, ChevronDown, ExternalLink, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const typeFilters = ['All', 'appointment', 'test', 'medicine'];
const dateRanges = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

const statusConfig = {
  Confirmed: { label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  Pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  Completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-600', icon: CheckCircle },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600', icon: XCircle },
  'In Queue': { label: 'In Queue', color: 'bg-purple-500/10 text-purple-600', icon: Clock },
  Serving: { label: 'Serving', color: 'bg-indigo-500/10 text-indigo-600', icon: AlertCircle },
};

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

export default function PatientBookingHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appointmentsRes, labBookingsRes, pharmacyOrdersRes] = await Promise.all([
        (typeFilter === 'All' || typeFilter === 'appointment') 
          ? api.getMyAppointments({}).catch(() => []) 
          : Promise.resolve([]),
        (typeFilter === 'All' || typeFilter === 'test') 
          ? api.getLabBookings({ patientId: user?.id }).catch(() => ({ data: [] })) 
          : Promise.resolve({ data: [] }),
        (typeFilter === 'All' || typeFilter === 'medicine') 
          ? api.getPharmacyOrders({ patientId: user?.id }).catch(() => ({ data: [] })) 
          : Promise.resolve({ data: [] }),
      ]);

      const appointments = (Array.isArray(appointmentsRes) ? appointmentsRes : appointmentsRes?.data || []).map(a => ({
        ...a,
        type: 'appointment',
        displayDate: a.createdAt || a.date,
      }));

      const labBookings = (labBookingsRes?.data || []).map(l => ({
        ...l,
        type: 'test',
        displayDate: l.createdAt || l.bookingDate,
      }));

      const pharmacyOrders = (pharmacyOrdersRes?.data || []).map(p => ({
        ...p,
        type: 'medicine',
        displayDate: p.createdAt || p.orderDate,
      }));

      // Sort by createdAt descending (newest first)
      const merged = [...appointments, ...labBookings, ...pharmacyOrders].sort(
        (a, b) => new Date(b.displayDate) - new Date(a.displayDate)
      );

      setBookings(merged);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load booking history');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, user?.id]);

  // Reload when user navigates back to this page (after booking)
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [typeFilter]);

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

  const filtered = bookings.filter(b => {
    const dr = getDateRangeFilter();
    if (dr) {
      const d = new Date(b.displayDate);
      if (dr.$gte && d < dr.$gte) return false;
      if (dr.$lte && d > dr.$lte) return false;
    }
    return true;
  });

  const totalBookings = filtered.length;
  const confirmedCount = filtered.filter(b => b.status === 'Confirmed').length;
  const pendingCount = filtered.filter(b => b.status === 'Pending' || b.status === 'In Queue').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Booking History</h1>
        <p className="text-muted-foreground text-sm">Your appointments, lab tests, and medicine orders</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Total Bookings</p>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{totalBookings}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/60 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm text-muted-foreground">Confirmed</p>
          </div>
          <p className="font-heading text-2xl font-bold text-foreground">{confirmedCount}</p>
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
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Type */}
        <div className="flex gap-1.5 flex-wrap">
          {typeFilters.map(f => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {f === 'All' ? 'All' : f === 'appointment' ? 'Appointments' : f === 'test' ? 'Lab Tests' : 'Medicines'}
            </button>
          ))}
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
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No bookings yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Your appointments, lab tests, and medicine orders will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((booking, i) => {
            const isAppt = booking.type === 'appointment';
            const isTest = booking.type === 'test';
            const isMed = booking.type === 'medicine';

            const StatusIcon = statusConfig[booking.status]?.icon || Clock;
            const TypeIcon = isAppt ? Stethoscope : isTest ? Beaker : Pill;
            const typeLabel = isAppt ? 'Appointment' : isTest ? 'Lab Test' : 'Medicine';
            const typeBadgeColor = isAppt ? 'bg-blue-500/10 text-blue-600' : isTest ? 'bg-purple-500/10 text-purple-600' : 'bg-rose-500/10 text-rose-600';

            // Build title
            let title = '';
            if (isAppt) {
              const docName = booking.doctor || booking.doctorId?.name || 'Doctor';
              title = docName.match(/^dr\.?\s/i) ? docName : `Dr. ${docName}`;
            }
            if (isTest) {
              const tests = booking.tests || [];
              title = tests.length > 1 ? `${tests[0]} +${tests.length - 1} more (${tests.length} tests)` : tests[0] || 'Lab Test';
            }
            if (isMed) {
              const items = booking.items || [];
              title = items.length > 0 ? `${items.length} items` : 'Medicine Order';
            }

            // Subtitle
            let subtitle = '';
            if (isAppt) subtitle = booking.department || booking.doctorId?.specialization || 'Consultation';
            if (isTest) subtitle = booking.visitType || 'Lab Visit';
            if (isMed) subtitle = booking.deliveryMode === 'delivery' ? 'Home Delivery' : 'Store Pickup';

            // Detail
            let detail = '';
            if (isAppt) detail = `${formatShortDate(booking.date)}${booking.time ? ` • ${booking.time}` : ''}`;
            if (isTest) detail = `${formatShortDate(booking.bookingDate)}${booking.timeSlot ? ` • ${booking.timeSlot}` : ''}`;
            if (isMed) detail = `${formatShortDate(booking.orderDate || booking.createdAt)}`;

            const secondBtn = isAppt
              ? { label: 'View Details', onClick: () => navigate('/patient/appointments') }
              : isTest
                ? { label: 'Track Booking', onClick: () => navigate('/patient/bookings') }
                : { label: 'Track Order', onClick: () => booking._id && navigate(`/order-tracking/${booking._id}`) };

            return (
              <motion.div key={booking._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-lg transition-all">
                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBadgeColor}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadgeColor}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeLabel}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[booking.status]?.color || 'bg-gray-500/10 text-gray-600'}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[booking.status]?.label || booking.status}
                        </span>
                      </div>
                      <p className="font-heading font-semibold text-foreground text-sm leading-tight mt-1">{title}</p>
                      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                  </div>

                  {/* Date + detail */}
                  <div className="ml-[52px] space-y-0.5 mb-3">
                    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                    {booking.tokenNumber && <p className="text-xs text-muted-foreground">Token: {booking.tokenNumber}</p>}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border/40 my-3" />

                  {/* Bottom: action button */}
                  <div className="flex items-end justify-end">
                    {secondBtn && (
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9 text-xs"
                        onClick={(e) => { e.stopPropagation(); secondBtn.onClick(); }}>
                        <ExternalLink className="w-3.5 h-3.5" /> {secondBtn.label}
                      </Button>
                    )}
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
