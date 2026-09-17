'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Plus, X, ChevronLeft, ChevronRight, CalendarClock, FileCheck, Clock,
  IndianRupee, Search, MapPin, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveFileUrl } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';
import AppointmentDetailsModal from '@/components/shared/modals/AppointmentDetailsModal';
import TodayAppointmentsSection from '@/components/shared/sections/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/shared/sections/AppointmentHistorySection';
import UpcomingAppointmentsSection from '@/components/shared/sections/UpcomingAppointmentsSection';
import { CompletedCard } from '@/components/shared/sections/TodayAppointmentsSection';
import { subSlotFor } from '@/lib/timeSlots';
import WalkInPatientForm from '@/components/shared/forms/WalkInPatientForm';
import ApproveAppointmentSection from '@/components/shared/sections/ApproveAppointmentSection';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';
import type { Appointment } from '@/types/models/appointment';
import type { AppointmentStatus } from '@/types/enums';

import {
  RescheduleModal,
  PrescriptionModal,
  BillModal,
  type PrescriptionFormData,
} from '@/components/doctor';

const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

const prescriptionInitialState: PrescriptionFormData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

interface ClinicAppointmentsProps {
  initialView?: 'today' | 'upcoming' | 'history' | 'approve';
}

export default function ClinicAppointments({ initialView }: ClinicAppointmentsProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get('tab') as 'today' | 'upcoming' | 'history' | 'approve' | null;
  const inferredView = pathname.endsWith('/approve')
    ? 'approve'
    : pathname.endsWith('/upcoming')
    ? 'upcoming'
    : pathname.endsWith('/history')
    ? 'history'
    : queryTab || initialView || 'today';

  const view = inferredView;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState<string[]>([]);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [billAmount, setBillAmount] = useState(500);
  const [billModal, setBillModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState<Appointment | null>(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  // Prescription modal state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionFormData>(prescriptionInitialState);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const loadAppointments = useCallback(async (params: Record<string, unknown> = {}) => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ status: 'All', limit: 100, ...params }) as { appointments?: Appointment[]; data?: Appointment[] } | Appointment[];
      const list = (data as { appointments?: Appointment[] })?.appointments || (data as { data?: Appointment[] })?.data || data || [];
      setAppointments(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      console.error(e);
      const err = e as { status?: number };
      if (err?.status && err.status >= 400 && err.status < 600) toast.error('Failed to load appointments');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  // Realtime updates
  useAppointmentRealtime(loadAppointments);

  // Auto-refresh interval
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadAppointments();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments(searchTerm ? { search: searchTerm } : {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, loadAppointments]);

  // Fetch booked slots for reschedule
  useEffect(() => {
    if (!rescheduleId || !newDate) {
      return;
    }
    let active = true;
    const apt = appointments.find(a => a._id === rescheduleId);
    const doctorId = typeof apt?.doctorId === 'object' ? (apt?.doctorId as { _id?: string })?._id : (apt?.doctorId as string | undefined);
    if (!doctorId) return;
    api.getBookedSlots({ doctorId, date: newDate })
      .then((res: unknown) => {
        if (!active) return;
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          const slotRes = res as { fullSlots?: string[]; counts?: Record<string, number>; dateDisabled?: string[] };
          setBookedSlots(slotRes.fullSlots || Object.keys(slotRes.counts || {}));
          setDateDisabledSlots(slotRes.dateDisabled || []);
        } else {
          setBookedSlots(Array.isArray(res) ? (res as string[]) : []);
          setDateDisabledSlots([]);
        }
      })
      .catch(err => console.error('Failed to fetch booked slots:', err));
    return () => { active = false; };
  }, [rescheduleId, newDate, appointments]);

  const today = getISTDateString();
  const pendingAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
  const upcomingAppointments = appointments.filter(a => a.date > today && ((a.status || '').toLowerCase() === 'confirmed' || (a.status || '').toLowerCase() === 'approved'));
  const todayAppointments = appointments.filter(a => a.date === today);

  const handleStatus = async (id: string, status: string, extra: Record<string, unknown> = {}) => {
    try {
      await api.updateAppointment(id, { status: status as AppointmentStatus, ...extra });
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update appointment');
    }
  };

  const handleReschedule = async (date: string, time: string) => {
    if (!date || !time || !rescheduleId) return;
    try {
      await api.updateAppointment(rescheduleId, { date, time, status: 'Confirmed' as AppointmentStatus });
      toast.success('Appointment rescheduled');
      setRescheduleId(null);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to reschedule appointment');
    }
  };

  const openPrescriptionModal = useCallback((apt: Appointment) => {
    setCompleteId(apt._id);
    const docSpecialization = (user as { specialization?: string } | null)?.specialization || '';
    setPrescriptionData({
      ...prescriptionInitialState,
      patientName: apt.patient || '',
      doctorName: user?.name || '',
      specialization: docSpecialization,
    });
    setShowPrescriptionModal(true);
  }, [user]);

  // Listen for "Write Prescription" from TodayAppointmentsSection
  useEffect(() => {
    const handler = (e: Event) => openPrescriptionModal((e as CustomEvent).detail);
    window.addEventListener('open-prescription', handler);
    return () => window.removeEventListener('open-prescription', handler);
  }, [openPrescriptionModal]);

  const handleGeneratePrescription = async (data: PrescriptionFormData) => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = data.medications.filter(m => m.name.trim());
      const patientId = typeof apt.patientId === 'object' ? apt.patientId._id : apt.patientId;
      await api.createRecord({
        patient: data.patientName,
        patientId,
        doctor: data.doctorName,
        diagnosis: data.diagnosis,
        prescription: meds.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`).join('\n'),
        type: 'prescription',
        notes: `Chief Complaints: ${data.chiefComplaints}\nAdvice: ${data.advice}\nFollow-up: ${data.followUp}`,
        data: {
          patient: { name: data.patientName, age: data.age, gender: data.gender, phone: data.phone, email: data.email, address: data.address },
          doctor: { name: data.doctorName, specialization: data.specialization },
          chiefComplaints: data.chiefComplaints,
          diagnosis: data.diagnosis,
          medications: meds,
          advice: data.advice,
          followUp: data.followUp,
          date: getISTDateString(),
        },
      });
      await api.createNotification({ title: 'New Prescription', message: `Dr. ${user?.name} has generated your prescription`, type: 'records', userId: patientId || apt.patient });
      toast.success('Prescription generated');
      setShowPrescriptionModal(false);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate prescription');
    }
  };

  const handleGenerateBill = async (amount: number) => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    try {
      const patientId = typeof apt.patientId === 'object' ? apt.patientId._id : apt.patientId;
      await api.createBill({
        patient: apt.patient || '',
        patientId,
        doctor: user?.name,
        service: `${apt.type} - ${apt.department || 'Clinic'}`,
        amount,
        date: getISTDateString(),
        status: 'Pending',
      });
      await api.createNotification({
        title: 'New Invoice',
        message: `Invoice of ₹${amount} generated for ${apt.patient || ''}`,
        type: 'payment',
        userId: patientId || apt.patient,
      });
      await api.updateAppointment(completeId, { status: 'Completed' as AppointmentStatus });
      setBillModal(false);
      setCompleteId(null);
      loadAppointments();
    } catch (e) {
      console.error(e);
    }
  };

  const CalendarWidget = (
    <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm">
      {(() => {
        const todayAppts = appointments.filter(a => a.date === today);
        const confirmed = todayAppts.filter(a => (a.status || '').toLowerCase() === 'confirmed').length;
        const completed = todayAppts.filter(a => (a.status || '').toLowerCase() === 'completed').length;
        const pending = todayAppts.filter(a => (a.status || '').toLowerCase() === 'pending').length;
        const todayDateObj = new Date(`${today}T00:00:00`);
        const dayName = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const dateLabel = todayDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Today</p>
                <p className="font-heading text-base font-bold text-foreground leading-tight">{dayName}</p>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-bold text-primary leading-none">{todayAppts.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Appointments</p>
              </div>
            </div>
            {(confirmed > 0 || completed > 0 || pending > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {confirmed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> Confirmed {confirmed}
                  </span>
                )}
                {completed > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info">
                    <span className="w-1.5 h-1.5 rounded-full bg-info" /> Done {completed}
                  </span>
                )}
                {pending > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending {pending}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {view === 'approve' ? 'Pending Requests' : 'Appointments Overview'}
          </h3>
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-3">
        {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground/50 pb-1">{d}</div>)}
        {Array.from({ length: getFirstDay(calDate) }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasAppts = view === 'approve'
            ? pendingAppointments.some(a => a.date === dateStr)
            : appointments.some(a => a.date === dateStr);
          const count = view === 'approve'
            ? pendingAppointments.filter(a => a.date === dateStr).length
            : 0;
          return (
            <button key={day} onClick={() => setSelectedDate(dateStr)}
              className={`relative w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all
                ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30' : 'text-foreground hover:bg-muted/70'}`}
            >
              {day}
              {view === 'approve'
                ? (count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                      {count > 9 ? '9+' : count}
                    </span>
                  ))
                : (hasAppts && !isSelected && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 md:h-full md:flex md:flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2 shrink-0">
          {view === 'approve'
            ? <><FileCheck className="w-6 h-6 text-amber-500" /> Pending Approvals</>
            : view === 'upcoming'
            ? <><CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Upcoming Appointments</>
            : view === 'history'
            ? <><CalendarClock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Appointment History</>
            : <><CalendarClock className="w-6 h-6 text-primary" /> Today Appointments</>
          }
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>
          )}
          {view === 'upcoming' && upcomingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">{upcomingAppointments.length} upcoming</span>
          )}
          {view === 'today' && todayAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{todayAppointments.length} today</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {view === 'approve'
            ? 'Review and confirm pending appointment requests'
            : view === 'upcoming'
            ? 'Confirmed future consultations'
            : view === 'history'
            ? 'Completed appointment history'
            : 'All appointments scheduled for today'}
        </p>
        <div className="bg-muted/80 p-1 rounded-2xl border border-border/50 flex items-center shrink-0 gap-0.5">
          <Link href="/clinic/appointments/approve">
            <button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all relative ${view === 'approve' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Pending
              {pendingAppointments.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'approve' ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'}`}>{pendingAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link href="/clinic/appointments/upcoming">
            <button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all relative ${view === 'upcoming' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Upcoming
              {upcomingAppointments.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'upcoming' ? 'bg-white/25 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>{upcomingAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link href="/clinic/appointments">
            <button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Today
              {todayAppointments.length > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'today' ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>{todayAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link href="/clinic/appointments/history">
            <button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Complete
            </button>
          </Link>
          <Link href="/clinic/home-visit">
            <button className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all text-muted-foreground hover:text-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-violet-500" />
              Home Visit
            </button>
          </Link>
        </div>
        {view === 'today' && (
          <Button onClick={() => setShowWalkInModal(true)} size="sm" className="ml-2 h-8 rounded-full gap-1">
            <Plus className="w-3.5 h-3.5" /> Walk-in
          </Button>
        )}
        <div className="ml-3 relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="text" placeholder="Search by patient, phone, or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-9 pl-9" aria-label="Global search" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3"><div className="h-5 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-16" /></div>
              <div className="space-y-1.5 mb-4"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-4 bg-muted rounded w-1/3" /></div>
              <div className="space-y-1.5 mb-3"><div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
              <div className="flex gap-2 pt-2"><div className="h-8 bg-muted rounded flex-1" /><div className="h-8 bg-muted rounded flex-1" /></div>
            </div>
          ))}
        </div>
      ) : searchTerm.trim() !== '' ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-xl font-bold text-foreground">Search Results</h3>
          </div>
          {appointments.filter(a => {
            const pat = (typeof a.patientId === 'object' ? a.patientId?.name : a.patient) || '';
            const phone = (typeof a.patientId === 'object' ? a.patientId?.phone : (a as { phone?: string }).phone) || '';
            return pat.toLowerCase().includes(searchTerm.toLowerCase()) ||
              phone.includes(searchTerm) ||
              a._id?.includes(searchTerm);
          }).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No matching appointments</p>
              <p className="text-xs mt-1">Try a different name, phone, or ID</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {appointments.filter(a => {
                const pat = (typeof a.patientId === 'object' ? a.patientId?.name : a.patient) || '';
                const phone = (typeof a.patientId === 'object' ? a.patientId?.phone : (a as { phone?: string }).phone) || '';
                return pat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  phone.includes(searchTerm) ||
                  a._id?.includes(searchTerm);
              }).map(a => (
                <div key={a._id} className="bg-card rounded-2xl border border-border/60 p-4">
                  <CompletedCard
                    apt={a}
                    subSlotFor={subSlotFor}
                    onViewDetails={(apt) => setDetailsApt(apt)}
                    onViewFile={(url: string) => {
                      window.open(resolveFileUrl(url), '_blank');
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : view === 'today' ? (
        <TodayAppointmentsSection
          appointments={appointments}
          selectedDate={selectedDate}
          calendar={CalendarWidget}
          onRefresh={loadAppointments}
          user={user}
          onViewDetails={(a) => setDetailsApt(a)}
        />
      ) : view === 'upcoming' ? (
        <UpcomingAppointmentsSection
          appointments={appointments}
          onViewDetails={(a) => setDetailsApt(a)}
          user={user}
        />
      ) : view === 'history' ? (
        <AppointmentHistorySection appointments={appointments} />
      ) : (
        <ApproveAppointmentSection
          appointments={appointments}
          onConfirm={(a) => handleStatus(a._id, 'Confirmed')}
          onReject={(a, reason) => handleStatus(a._id, 'Cancelled', { notes: reason })}
        />
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={Boolean(rescheduleId)}
        onClose={() => setRescheduleId(null)}
        onConfirm={handleReschedule}
        timeSlots={timeSlots}
        bookedSlots={bookedSlots}
        dateDisabledSlots={dateDisabledSlots}
      />

      {/* Prescription Modal */}
      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={() => setShowPrescriptionModal(false)}
        onSubmit={handleGeneratePrescription}
        initialData={prescriptionData}
      />

      {/* Complete & Bill Modal */}
      <BillModal
        isOpen={billModal}
        onClose={() => setBillModal(false)}
        onConfirm={handleGenerateBill}
        serviceName={`${appointments.find(a => a._id === completeId)?.type || 'Consultation'} - ${appointments.find(a => a._id === completeId)?.department || 'Clinic'}`}
        initialAmount={billAmount}
      />

      {/* Walk-in Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="max-w-md p-6">
          <WalkInPatientForm
            timeSlots={timeSlots}
            onPatientCreated={() => { loadAppointments(); setShowWalkInModal(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      {detailsApt && (
        <AppointmentDetailsModal apt={detailsApt} onClose={() => setDetailsApt(null)} />
      )}
    </div>
  );
}
