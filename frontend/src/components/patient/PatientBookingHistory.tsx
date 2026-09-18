'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Stethoscope,
  Beaker,
  Pill,
  Calendar,
  ChevronDown,
  ExternalLink,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CalendarDays,
  Phone,
  PhoneCall,
  MessageCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { appointments, lab, pharmacy } from '@/lib/api';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';

const typeFilters = ['All', 'appointment', 'test', 'medicine'];
const dateRanges = ['All Time', 'This Month', 'Last Month', 'Last 3 Months'];

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  Confirmed: { label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  Pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  Completed: { label: 'Completed', color: 'bg-blue-500/10 text-blue-600', icon: CheckCircle },
  Cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600', icon: XCircle },
  'In Queue': { label: 'In Queue', color: 'bg-purple-500/10 text-purple-600', icon: Clock },
  Serving: { label: 'Serving', color: 'bg-indigo-500/10 text-indigo-600', icon: AlertCircle },
};

interface BookingItem {
  _id: string;
  type: 'appointment' | 'test' | 'medicine';
  displayDate: string;
  status?: string;
  doctor?: string;
  doctorId?: string | { name?: string; specialization?: string };
  department?: string;
  date?: string;
  time?: string;
  tokenNumber?: string;
  tests?: string[];
  visitType?: string;
  bookingDate?: string;
  timeSlot?: string;
  items?: unknown[];
  deliveryMode?: string;
  orderDate?: string;
  createdAt?: string;
  phone?: string;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

function formatShortDate(d?: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PatientBookingHistory({ initialType }: { initialType?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState(initialType || 'All');
  const [dateRange, setDateRange] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const showActions = initialType === 'appointment';
  const userId = user?._id || (user as unknown as { id?: string })?.id;

  const {
    data: bookings = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient-booking-history', typeFilter, userId ?? ''],
    queryFn: async (): Promise<BookingItem[]> => {
      const [appointmentsRes, labBookingsRes, pharmacyOrdersRes] = await Promise.all([
        typeFilter === 'All' || typeFilter === 'appointment' ? appointments.getMy({}) : Promise.resolve([]),
        typeFilter === 'All' || typeFilter === 'test'
          ? lab.getBookings({ patientId: userId ?? '' })
          : Promise.resolve([]),
        typeFilter === 'All' || typeFilter === 'medicine'
          ? pharmacy.getOrders({ patientId: userId ?? '' })
          : Promise.resolve([]),
      ]);

      const appts: BookingItem[] = (Array.isArray(appointmentsRes) ? appointmentsRes : []).map((a) => ({
        _id: a._id,
        type: 'appointment' as const,
        displayDate: a.createdAt || a.date,
        status: a.status,
        doctor: typeof a.doctor === 'string' ? a.doctor : (a.doctor?.name ?? ''),
        doctorId:
          typeof a.doctor === 'string'
            ? undefined
            : { name: a.doctor?.name, specialization: a.doctor?.specialization },
        department: a.department,
        date: a.date,
        time: a.time,
        tokenNumber: a.tokenNumber,
        phone:
          (a as unknown as { hospitalId?: { phone?: string } }).hospitalId?.phone ||
          (a as unknown as { doctorId?: { phone?: string } }).doctorId?.phone ||
          undefined,
      }));

      const labBookings: BookingItem[] = (Array.isArray(labBookingsRes) ? labBookingsRes : []).map((l, i) => ({
        _id: str(l._id, `lab-${i}`),
        type: 'test' as const,
        displayDate: str(l.createdAt || l.bookingDate),
        status: typeof l.status === 'string' ? l.status : undefined,
        tests: Array.isArray(l.tests) ? (l.tests as string[]) : [],
        visitType: str(l.visitType) || undefined,
        bookingDate: str(l.bookingDate) || undefined,
        timeSlot: str(l.timeSlot) || undefined,
      }));

      const pharmacyOrders: BookingItem[] = (Array.isArray(pharmacyOrdersRes) ? pharmacyOrdersRes : []).map((p, i) => ({
        _id: str(p._id, `med-${i}`),
        type: 'medicine' as const,
        displayDate: str(p.createdAt || p.orderDate),
        status: typeof p.status === 'string' ? p.status : undefined,
        items: Array.isArray(p.items) ? (p.items as unknown[]) : [],
        deliveryMode: str(p.deliveryMode) || undefined,
        orderDate: str(p.orderDate) || undefined,
        createdAt: str(p.createdAt) || undefined,
      }));

      return [...appts, ...labBookings, ...pharmacyOrders].sort(
        (a, b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime(),
      );
    },
    staleTime: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['patient-booking-history'] });

  useAppointmentRealtime(() => {
    void refetch();
  });

  useEffect(() => {
    const handleFocus = () => {
      void refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      await appointments.update(cancelId, { status: 'Cancelled' });
      toast.success('Appointment cancelled');
      setCancelId(null);
      void invalidate();
    } catch {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleId) return;
    try {
      await appointments.update(rescheduleId, { date: newDate, time: newTime, status: 'Confirmed' });
      toast.success('Appointment rescheduled');
      setRescheduleId(null);
      setNewDate('');
      setNewTime('');
      void invalidate();
    } catch {
      toast.error('Failed to reschedule appointment');
    }
  };

  const filtered = bookings.filter((b) => {
    if (dateRange !== 'All Time') {
      const now = new Date();
      const d = new Date(b.displayDate);
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

  const totalBookings = filtered.length;
  const confirmedCount = filtered.filter((b) => b.status === 'Confirmed').length;
  const pendingCount = filtered.filter((b) => b.status === 'Pending' || b.status === 'In Queue').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError && bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-destructive/50 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-1">Failed to load bookings</h3>
        <Button variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {typeFilter === 'appointment' && showActions ? 'My Appointments' : 'Booking History'}
        </h1>
        <p className="text-muted-foreground text-sm">
          {typeFilter === 'appointment' && showActions
            ? 'View and manage your appointments'
            : 'Your appointments, lab tests, and medicine orders'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">{totalBookings}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
          </div>
          <p className="text-3xl font-bold text-emerald-600 tracking-tight">{confirmedCount}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Pending</p>
          </div>
          <p className="text-3xl font-bold text-amber-600 tracking-tight">{pendingCount}</p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-3">
        {!initialType && (
          <div className="flex gap-1.5 flex-wrap">
            {typeFilters.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${typeFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {f === 'All' ? 'All' : f === 'appointment' ? 'Appointments' : f === 'test' ? 'Lab Tests' : 'Medicines'}
              </button>
            ))}
          </div>
        )}

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

            const StatusIcon = statusConfig[booking.status ?? '']?.icon || Clock;
            const TypeIcon = isAppt ? Stethoscope : isTest ? Beaker : Pill;
            const typeLabel = isAppt ? 'Appointment' : isTest ? 'Lab Test' : 'Medicine';
            const typeBadgeColor = isAppt
              ? 'bg-blue-500/10 text-blue-600'
              : isTest
                ? 'bg-purple-500/10 text-purple-600'
                : 'bg-rose-500/10 text-rose-600';

            let title = '';
            if (isAppt) {
              const docName =
                booking.doctor ||
                (typeof booking.doctorId === 'object' ? booking.doctorId?.name : undefined) ||
                'Doctor';
              title = /^dr\.?\s/i.test(docName) ? docName : `Dr. ${docName}`;
            }
            if (isTest) {
              const tests = booking.tests || [];
              title = tests.length > 1 ? `${tests[0]} +${tests.length - 1} more (${tests.length} tests)` : tests[0] || 'Lab Test';
            }
            if (isMed) {
              const items = booking.items || [];
              title = items.length > 0 ? `${items.length} items` : 'Medicine Order';
            }

            let subtitle = '';
            if (isAppt)
              subtitle =
                booking.department ||
                (typeof booking.doctorId === 'object' ? booking.doctorId?.specialization : undefined) ||
                'Consultation';
            if (isTest) subtitle = booking.visitType || 'Lab Visit';
            if (isMed) subtitle = booking.deliveryMode === 'delivery' ? 'Home Delivery' : 'Store Pickup';

            let detail = '';
            if (isAppt) detail = `${formatShortDate(booking.date)}${booking.time ? ` • ${booking.time}` : ''}`;
            if (isTest) detail = `${formatShortDate(booking.bookingDate)}${booking.timeSlot ? ` • ${booking.timeSlot}` : ''}`;
            if (isMed) detail = `${formatShortDate(booking.orderDate || booking.createdAt)}`;

            return (
              <motion.div
                key={booking._id}
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
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadgeColor}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[booking.status ?? '']?.color || 'bg-gray-500/10 text-gray-600'}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[booking.status ?? '']?.label || booking.status}
                        </span>
                      </div>
                      <p className="font-semibold text-foreground text-sm leading-tight mt-1">{title}</p>
                      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
                    </div>
                  </div>

                  <div className="ml-[52px] space-y-0.5 mb-3">
                    {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                    {booking.tokenNumber && <p className="text-xs text-muted-foreground">Token: {booking.tokenNumber}</p>}
                  </div>

                  <div className="border-t border-border/40 my-3" />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatShortDate(booking.displayDate)}</span>
                    </div>
                    <div className="flex gap-2">
                      {showActions && isAppt && (booking.status === 'Confirmed' || booking.status === 'Pending') ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-xl h-9 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelId(booking._id);
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-xl h-9 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRescheduleId(booking._id);
                            }}
                          >
                            Reschedule
                          </Button>
                        </>
                      ) : !showActions && isTest ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push('/patient/bookings');
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Track Booking
                        </Button>
                      ) : !showActions && isMed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl h-9 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/order-tracking/${booking._id}`);
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Track Order
                        </Button>
                      ) : null}
                      {booking.phone ? (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 gap-1.5 hover:bg-success/10 hover:text-success hover:border-success/30 transition-all"
                            onClick={() => {
                              window.location.href = `tel:${booking.phone ?? ''}`;
                            }}
                            title={`Call ${booking.phone ?? ''}`}
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                            onClick={() => {
                              window.open(`https://wa.me/${(booking.phone ?? '').replace(/[^0-9]/g, '')}`, '_blank');
                            }}
                            title={`WhatsApp ${booking.phone ?? ''}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5" disabled>
                          <Phone className="w-3 h-3" /> Contact
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

      {showActions && cancelId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCancelId(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Cancel Appointment?</h3>
              <p className="text-sm text-muted-foreground mb-6">This action cannot be undone. Are you sure you want to cancel this appointment?</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCancelId(null)}>
                Keep Appointment
              </Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90" onClick={() => void handleCancel()}>
                Yes, Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {showActions && rescheduleId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRescheduleId(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-4">Reschedule Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Date</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Time</label>
                <Input value={newTime} onChange={(e) => setNewTime(e.target.value)} placeholder="e.g. 10:00 AM" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleId(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void handleReschedule()} disabled={!newDate || !newTime}>
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
