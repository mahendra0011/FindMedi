/**
 * My Bookings & Appointments — ported from client/src/pages/patient/PatientBookings.jsx (Phase 4).
 * Merged appointments + lab bookings with cancel, reschedule and intake flows.
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  CalendarDays,
  FlaskConical,
  Beaker,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  Syringe,
  FileText,
  Phone,
  IndianRupee,
  Activity,
  Stethoscope,
  MessageCircle,
  PhoneCall,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { appointments, lab } from '@/lib/api';
import { STATUS_FILTERS, DATE_RANGES } from '@/features/bookings';
import type { IntakeDetails as BookingsIntakeDetails } from '@/features/bookings';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';

const BOOKING_STATUS: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  Scheduled: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Clock },
  Confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: CheckCircle2 },
  'Sample Collected': { label: 'Sample Collected', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Syringe },
  'Report Ready': { label: 'Report Ready', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: FileText },
  Completed: { label: 'Completed', color: 'bg-success/10 text-success border-success/30', icon: CheckCircle2 },
  Cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  Pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Clock },
  Processing: { label: 'Processing', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Loader2 },
  'In Queue': { label: 'In Queue', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: Clock },
  Serving: { label: 'Serving', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30', icon: Activity },
  Missed: { label: 'Missed', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30', icon: AlertCircle },
};

// STATUS_FILTERS / DATE_RANGES wired from @/features/bookings (trivial 1:1 match).
// BOOKING_STATUS stays local (icon/color map, not in feature).
// IntakeDetails extends the feature base (adds page-specific fields); Appointment/LabBooking
// feature types are not imported — their shapes differ from this page's backend payloads.

interface IntakeDetails extends BookingsIntakeDetails {
  pastMedicalHistory?: unknown;
  currentMedications?: unknown;
  allergies?: unknown;
  filledAt?: string;
}

interface NormalizedBooking {
  id: string;
  type: 'appointment' | 'test';
  source: string;
  date: string;
  tests: string[];
  amount: number;
  status: string;
  slot: string;
  address: string;
  phone: string;
  tokenNumber?: string;
  department?: string;
  time?: string;
  bookingDate?: string;
  timeSlot?: string;
  visitType?: string;
  raw: Record<string, unknown>;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
const refName = (v: unknown): string | undefined =>
  typeof v === 'object' && v !== null ? ((v as { name?: unknown }).name as string | undefined) : undefined;
const refStr = (v: unknown, key: string): string => {
  if (typeof v === 'object' && v !== null) {
    const val = (v as Record<string, unknown>)[key];
    return typeof val === 'string' ? val : '';
  }
  return '';
};

function normalizeBooking(item: Record<string, unknown>, type: 'appointment' | 'test'): NormalizedBooking {
  if (type === 'appointment') {
    return {
      id: str(item._id),
      type: 'appointment',
      source: str(item.doctor) || refName(item.doctorId) || 'Doctor',
      date: str(item.date).split('T')[0] ?? '',
      tests: [],
      amount: num(item.fees ?? item.consultation_fees),
      status: str(item.status, 'Confirmed'),
      slot: str(item.timeSlot) || str(item.time),
      address: refName(item.hospitalId) || refStr(item.hospitalId, 'address'),
      phone: refStr(item.hospitalId, 'phone') || refStr(item.doctorId, 'phone'),
      tokenNumber: typeof item.tokenNumber === 'string' ? item.tokenNumber : undefined,
      department: str(item.department) || undefined,
      time: str(item.time) || undefined,
      raw: item,
    };
  }
  return {
    id: str(item._id),
    type: 'test',
    source: refName(item.facilityId) || str(item.labName, 'Lab'),
    date: str(item.bookingDate).split('T')[0] ?? '',
    tests: Array.isArray(item.tests) ? (item.tests as string[]) : [],
    amount: num(item.totalAmount ?? item.discountedAmount),
    status: str(item.status, 'Pending'),
    slot: str(item.timeSlot),
    address: str(item.homeCollectionAddress),
    phone: str(item.patientPhone),
    bookingDate: str(item.bookingDate) || undefined,
    timeSlot: str(item.timeSlot) || undefined,
    visitType: str(item.visitType) || undefined,
    raw: item,
  };
}

function BookingCard({
  booking,
  index,
  onCancel,
  onOpenIntake,
}: {
  booking: NormalizedBooking;
  index: number;
  onCancel: (booking: NormalizedBooking) => void;
  onOpenIntake: (booking: NormalizedBooking) => void;
}) {
  const router = useRouter();
  const isAppt = booking.type === 'appointment';
  const statusInfo = BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.Pending;
  const StatusIcon = statusInfo?.icon ?? Clock;
  const typeBadgeColor = isAppt ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600';
  const TypeIcon = isAppt ? Stethoscope : Beaker;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBadgeColor}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{booking.source}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {booking.date} &bull; {booking.slot}
              </p>
              {booking.tests.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{booking.tests.join(', ')}</p>
              )}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${statusInfo?.color ?? ''}`}
          >
            <StatusIcon className="w-3 h-3" />
            {statusInfo?.label ?? booking.status}
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IndianRupee className="w-3 h-3" />
            <span className="font-semibold text-foreground">₹{booking.amount}</span>
          </div>
          <div className="flex gap-2 items-center">
            {isAppt && (booking.status === 'Scheduled' || booking.status === 'Confirmed' || booking.status === 'Pending') && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => onOpenIntake(booking)}
              >
                <FileText className="w-3 h-3 mr-1" />
                {booking.raw.preConsultationDetails ? 'Edit Intake' : 'Fill Intake'}
              </Button>
            )}
            {(booking.status === 'Scheduled' || booking.status === 'Confirmed' || booking.status === 'Pending') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-destructive hover:text-destructive"
                onClick={() => onCancel(booking)}
              >
                <XCircle className="w-3 h-3 mr-1" /> Cancel
              </Button>
            )}
            {booking.status === 'Report Ready' && (
              <Button size="sm" className="text-xs h-8 gap-1" onClick={() => router.push('/patient/reports')}>
                <FileText className="w-3 h-3" /> View Report
              </Button>
            )}
            {booking.phone ? (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5 hover:bg-success/10 hover:text-success hover:border-success/30 transition-all"
                  onClick={() => {
                    window.location.href = `tel:${booking.phone}`;
                  }}
                  title={`Call ${booking.phone}`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  onClick={() => {
                    window.open(`https://wa.me/${booking.phone.replace(/[^0-9]/g, '')}`, '_blank');
                  }}
                  title={`WhatsApp ${booking.phone}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" disabled>
                <Phone className="w-3 h-3" /> Contact
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PatientBookingsHub() {
  const router = useRouter();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateRange, setDateRange] = useState('All Time');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [intakeModal, setIntakeModal] = useState<NormalizedBooking | null>(null);
  const [intakeData, setIntakeData] = useState({
    chiefComplaint: '',
    symptomsDuration: '',
    pastMedicalHistory: '',
    currentMedications: '',
    allergies: '',
  });
  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const userId = user?._id || (user as unknown as { id?: string })?.id;

  const {
    data: bookings = [],
    isLoading: loading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient-bookings', userId ?? ''],
    queryFn: async (): Promise<NormalizedBooking[]> => {
      const [apptsRes, labRes] = await Promise.all([appointments.getMy({}), lab.getBookings({ patientId: userId ?? '' })]);
      const appts = (Array.isArray(apptsRes) ? apptsRes : []) as unknown as Record<string, unknown>[];
      const labs = (Array.isArray(labRes) ? labRes : []) as unknown as Record<string, unknown>[];
      return [
        ...appts.map((a) => normalizeBooking(a, 'appointment')),
        ...labs.map((b) => normalizeBooking(b, 'test')),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    staleTime: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['patient-bookings'] });

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

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'All' && b.status !== statusFilter) return false;
    if (typeFilter !== 'All' && b.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.source.toLowerCase().includes(q) && !b.tests.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (dateRange !== 'All Time') {
      const now = new Date();
      const d = new Date(b.date);
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

  const activeBookings = filtered.filter((b) => !['Completed', 'Cancelled'].includes(b.status));
  const pastBookings = filtered.filter((b) => ['Completed', 'Cancelled'].includes(b.status));

  const handleCancel = async (booking: NormalizedBooking) => {
    try {
      if (booking.type === 'appointment') {
        await appointments.update(booking.id, { status: 'Cancelled' });
      } else {
        await lab.updateBooking(booking.id, { status: 'Cancelled' });
      }
      toast.success('Booking cancelled');
      void invalidate();
    } catch {
      toast.error('Failed to cancel booking');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelId) return;
    const booking = bookings.find((b) => b.id === cancelId);
    setCancelId(null);
    if (booking) await handleCancel(booking);
  };

  const handleOpenIntake = (booking: NormalizedBooking) => {
    const details = booking.raw.preConsultationDetails as IntakeDetails | undefined;
    const asText = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v ?? ''));
    if (details) {
      setIntakeData({
        chiefComplaint: details.chiefComplaint ?? '',
        symptomsDuration: details.symptomsDuration ?? '',
        pastMedicalHistory: asText(details.pastMedicalHistory),
        currentMedications: asText(details.currentMedications),
        allergies: asText(details.allergies),
      });
    } else {
      setIntakeData({ chiefComplaint: '', symptomsDuration: '', pastMedicalHistory: '', currentMedications: '', allergies: '' });
    }
    setIntakeModal(booking);
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeModal) return;
    setSubmittingIntake(true);
    try {
      await appointments.submitIntakeForm(intakeModal.id, { ...intakeData });
      toast.success('Intake form saved successfully');
      setIntakeModal(null);
      void invalidate();
    } catch {
      toast.error('Failed to save intake form');
    }
    setSubmittingIntake(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <h1 className="text-2xl font-bold text-foreground">My Bookings & Appointments</h1>
        <p className="text-muted-foreground">Track your appointments and lab test bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by clinic, test or doctor..."
            className="pl-10 h-11 text-sm rounded-xl bg-background border-border/50"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-11 px-4 rounded-xl text-sm bg-background border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="All">All</option>
          <option value="appointment">Appointments</option>
          <option value="test">Lab Tests</option>
        </select>
        <div className="relative inline-block self-start">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-3.5 h-11 rounded-xl text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            {dateRange}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border/60 rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
              {DATE_RANGES.map((r) => (
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

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                : 'bg-background text-muted-foreground hover:text-foreground border-border/50'
            }`}
          >
            {s === 'All' ? 'All' : s}
          </button>
        ))}
      </div>

      {activeBookings.length > 0 && (
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Active ({activeBookings.length})
          </h2>
          <div className="space-y-4">
            {activeBookings.map((booking, i) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                index={i}
                onCancel={(b) => setCancelId(b.id)}
                onOpenIntake={handleOpenIntake}
              />
            ))}
          </div>
        </div>
      )}

      {pastBookings.length > 0 && (
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Past ({pastBookings.length})
          </h2>
          <div className="space-y-4">
            {pastBookings.map((booking, i) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                index={i}
                onCancel={(b) => setCancelId(b.id)}
                onOpenIntake={handleOpenIntake}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <CalendarDays className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No bookings found</h3>
          <p className="text-xs text-muted-foreground">Try a different filter or search term</p>
          <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => router.push('/diagnostic-centers')}>
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Book a Test
          </Button>
        </div>
      )}

      {cancelId && (
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
              <Button className="flex-1 bg-destructive hover:bg-destructive/90" onClick={() => void handleConfirmCancel()}>
                Yes, Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {intakeModal && (
        <Dialog open={!!intakeModal} onOpenChange={(val) => !val && setIntakeModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pre-Consultation Form</DialogTitle>
              <DialogDescription>Fill out your details before seeing the doctor to save time during your appointment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => void handleIntakeSubmit(e)} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Chief Complaint / Main Symptom</label>
                <Input
                  required
                  value={intakeData.chiefComplaint}
                  onChange={(e) => setIntakeData({ ...intakeData, chiefComplaint: e.target.value })}
                  placeholder="e.g. Headache, Fever"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration of Symptoms</label>
                <Input
                  value={intakeData.symptomsDuration}
                  onChange={(e) => setIntakeData({ ...intakeData, symptomsDuration: e.target.value })}
                  placeholder="e.g. 3 days"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Past Medical History (Optional)</label>
                <textarea
                  value={intakeData.pastMedicalHistory}
                  onChange={(e) => setIntakeData({ ...intakeData, pastMedicalHistory: e.target.value })}
                  placeholder="Any chronic conditions (e.g. Diabetes, Asthma)"
                  className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Medications (Optional)</label>
                <Input
                  value={intakeData.currentMedications}
                  onChange={(e) => setIntakeData({ ...intakeData, currentMedications: e.target.value })}
                  placeholder="e.g. Paracetamol"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Allergies (Optional)</label>
                <Input
                  value={intakeData.allergies}
                  onChange={(e) => setIntakeData({ ...intakeData, allergies: e.target.value })}
                  placeholder="Any food or drug allergies"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIntakeModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingIntake}>
                  {submittingIntake && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Details
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
