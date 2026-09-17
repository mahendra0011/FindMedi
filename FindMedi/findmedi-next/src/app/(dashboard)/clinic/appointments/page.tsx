'use client';
/* eslint-disable react-hooks/preserve-manual-memoization, prefer-const, react/no-unescaped-entities, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-expressions, @next/next/no-img-element,  react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any,  @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, CalendarClock, FileCheck, MapPin, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveFileUrl } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import AppointmentDetailsModal from '@/components/shared/modals/AppointmentDetailsModal';
import TodayAppointmentsSection from '@/components/shared/sections/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/shared/sections/AppointmentHistorySection';
import UpcomingAppointmentsSection from '@/components/shared/sections/UpcomingAppointmentsSection';
import WalkInPatientForm from '@/components/shared/forms/WalkInPatientForm';
import ApproveAppointmentSection from '@/components/shared/sections/ApproveAppointmentSection';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Appointment } from '@/types/models/appointment';
import type { AppointmentStatus } from '@/types/enums';

import {
  RescheduleModal,
  PrescriptionModal,
  BillModal,
  DoctorCalendarWidget,
  buildPrescriptionRecord,
  buildBillBody,
  getAppointmentPatientId,
  type PrescriptionFormData,
} from '@/components/clinic';
import { useDoctorAppointments } from '@/features/appointments/hooks';
import { subSlotFor } from '@/lib/timeSlots';
import { CompletedCard } from '@/components/shared/sections/TodayAppointmentsSection';

const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

const initialPrescriptionData: PrescriptionFormData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

export default function ClinicAppointments({ initialView }: { initialView?: 'today' | 'approve' | 'upcoming' | 'history' }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryView = searchParams?.get('tab') as 'today' | 'approve' | 'upcoming' | 'history' | null;
  const pathView = pathname?.endsWith('/approve') ? 'approve' : pathname?.endsWith('/upcoming') ? 'upcoming' : pathname?.endsWith('/history') ? 'history' : 'today';
  const view = initialView || queryView || pathView;

  const {
    appointments,
    loading,
    loadAppointments,
    today,
    pendingAppointments,
    upcomingAppointments,
    todayAppointments,
    handleStatus,
  } = useDoctorAppointments();

  const [calDate, setCalDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString());
  const [searchTerm, setSearchTerm] = useState('');

  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState<string[]>([]);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [billModal, setBillModal] = useState(false);
  const [billAmount] = useState(500);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState<Appointment | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionFormData>(initialPrescriptionData);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  // booked slots for reschedule
  const [newDate, setNewDate] = useState('');
  useEffect(() => {
    if (!rescheduleId || !newDate) return;
    let active = true;
    const apt = appointments.find((a) => a._id === rescheduleId);
    const docId = (apt?.doctorId as unknown as { _id?: string })?._id || (apt?.doctorId as unknown as string);
    if (!docId) return;
    api.getBookedSlots({ doctorId: docId, date: newDate }).then((res) => {
      if (!active) return;
      const data = res as unknown as { fullSlots?: string[]; counts?: Record<string, number>; dateDisabled?: string[] };
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setBookedSlots(data.fullSlots || Object.keys(data.counts || {}));
        setDateDisabledSlots(data.dateDisabled || []);
      } else {
        setBookedSlots(Array.isArray(res) ? (res as string[]) : []);
        setDateDisabledSlots([]);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, [rescheduleId, newDate, appointments]);

  // search debounce
  useEffect(() => {
    if (!searchTerm) return;
    const t = setTimeout(() => { loadAppointments({ search: searchTerm }); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, loadAppointments]);

  const openPrescriptionModal = useCallback((apt: Appointment) => {
    setCompleteId(apt._id);
    const spec = (user as unknown as { specialization?: string })?.specialization || '';
    setPrescriptionData({ ...initialPrescriptionData, patientName: apt.patient || '', doctorName: user?.name || '', specialization: spec });
    setShowPrescriptionModal(true);
  }, [user]);

  useEffect(() => {
    const h = (e: Event) => openPrescriptionModal((e as CustomEvent).detail);
    window.addEventListener('open-prescription', h);
    return () => window.removeEventListener('open-prescription', h);
  }, [openPrescriptionModal]);

  const handleGeneratePrescription = async (data: PrescriptionFormData) => {
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      await api.createRecord(buildPrescriptionRecord(data, apt));
      await api.createNotification({ title: 'New Prescription', message: `Dr. ${user?.name} has generated your prescription`, type: 'records', userId: getAppointmentPatientId(apt) || apt.patient });
      toast.success('Prescription generated');
      setShowPrescriptionModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate prescription'); }
  };

  const handleGenerateBill = async (amount: number) => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    try {
      await api.createBill(buildBillBody(apt, user?.name, amount));
      await api.createNotification({ title: 'New Invoice', message: `Invoice of ₹${amount} generated for ${apt.patient || ''}`, type: 'payment', userId: getAppointmentPatientId(apt) || apt.patient });
      await api.updateAppointment(completeId, { status: 'Completed' as AppointmentStatus });
      toast.success('Bill generated');
      setBillModal(false);
      setCompleteId(null);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate bill'); }
  };

  const handleReschedule = async (date: string, time: string) => {
    if (!date || !time || !rescheduleId) return;
    try {
      await api.updateAppointment(rescheduleId, { date, time, status: 'Confirmed' as AppointmentStatus });
      toast.success('Appointment rescheduled');
      setRescheduleId(null);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to reschedule'); }
  };

  return (
    <div className="space-y-6 md:h-full md:flex md:flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2 shrink-0">
          {view === 'approve' ? <><FileCheck className="w-6 h-6 text-amber-500" /> Pending Approvals</> : view === 'upcoming' ? <><CalendarClock className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Upcoming Appointments</> : view === 'history' ? <><CalendarDays className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Appointment History</> : <><CalendarClock className="w-6 h-6 text-primary" /> Today Appointments</>}
          {view === 'approve' && pendingAppointments.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>}
          {view === 'upcoming' && upcomingAppointments.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">{upcomingAppointments.length} upcoming</span>}
          {view === 'today' && todayAppointments.length > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{todayAppointments.length} today</span>}
        </h1>
        <div className="bg-muted/80 p-1 rounded-2xl border border-border/50 flex items-center shrink-0 gap-0.5">
          <Link href="/clinic/appointments/approve"><button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'approve' ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Pending{pendingAppointments.length>0 && <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view==='approve'?'bg-white/25 text-white':'bg-amber-500 text-white'}`}>{pendingAppointments.length}</span>}</button></Link>
          <Link href="/clinic/appointments/upcoming"><button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'upcoming' ? 'bg-purple-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Upcoming{upcomingAppointments.length>0 && <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view==='upcoming'?'bg-white/25 text-white':'bg-purple-500/20 text-purple-600'}`}>{upcomingAppointments.length}</span>}</button></Link>
          <Link href="/clinic/appointments"><button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'today' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Today{todayAppointments.length>0 && <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view==='today'?'bg-white/25 text-white':'bg-primary/20 text-primary'}`}>{todayAppointments.length}</span>}</button></Link>
          <Link href="/clinic/appointments/history"><button className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${view === 'history' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Complete</button></Link>
          <Link href="/clinic/home-visit"><button className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all text-muted-foreground hover:text-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-violet-500" /> Home Visit</button></Link>
        </div>
        {view === 'today' && <Button onClick={() => setShowWalkInModal(true)} size="sm" className="ml-2 h-8 rounded-full gap-1"><Plus className="w-3.5 h-3.5" /> Walk-in</Button>}
        <div className="ml-3 relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="text" placeholder="Search by patient, phone, or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-9 pl-9" aria-label="Global search" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 p-5 animate-pulse"><div className="h-5 bg-muted rounded w-3/4 mb-3" /><div className="h-4 bg-muted rounded w-1/2 mb-2" /><div className="h-3 bg-muted rounded w-full" /></div>
          ))}
        </div>
      ) : searchTerm.trim() !== '' ? (
        <div className="space-y-4">
          <h3 className="font-heading text-xl font-bold text-foreground">Search Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {appointments.filter(a => {
              const pat = (typeof a.patientId === 'object' ? (a.patientId as unknown as { name?: string })?.name : a.patient) || '';
              const phone = (typeof a.patientId === 'object' ? (a.patientId as unknown as { phone?: string })?.phone : (a as unknown as { phone?: string }).phone) || '';
              return pat.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm) || a._id?.includes(searchTerm);
            }).map(a => (
              <div key={a._id} className="bg-card rounded-2xl border border-border/60 p-4"><CompletedCard apt={a} subSlotFor={subSlotFor} onViewDetails={(apt)=>setDetailsApt(apt)} onViewFile={(url:string)=> window.open(resolveFileUrl(url),'_blank')} /></div>
            ))}
          </div>
        </div>
      ) : view === 'today' ? (
        <TodayAppointmentsSection appointments={appointments} selectedDate={selectedDate} calendar={<DoctorCalendarWidget appointments={appointments} today={today} selectedDate={selectedDate} onSelectDate={setSelectedDate} calDate={calDate} onCalDateChange={setCalDate} view={view} pendingAppointments={pendingAppointments} />} onRefresh={loadAppointments} user={user} onViewDetails={(a)=>setDetailsApt(a)} />
      ) : view === 'upcoming' ? (
        <UpcomingAppointmentsSection appointments={appointments} onViewDetails={(a)=>setDetailsApt(a)} user={user} />
      ) : view === 'history' ? (
        <AppointmentHistorySection appointments={appointments} />
      ) : (
        <ApproveAppointmentSection appointments={appointments} onConfirm={(a)=> handleStatus(a._id,'Confirmed')} onReject={(a,reason)=> handleStatus(a._id,'Cancelled',{notes:reason})} />
      )}

      <RescheduleModal isOpen={Boolean(rescheduleId)} onClose={()=>setRescheduleId(null)} onConfirm={handleReschedule} timeSlots={timeSlots} bookedSlots={bookedSlots} dateDisabledSlots={dateDisabledSlots} />
      <PrescriptionModal isOpen={showPrescriptionModal} onClose={()=>setShowPrescriptionModal(false)} onSubmit={handleGeneratePrescription} initialData={prescriptionData} />
      <BillModal isOpen={billModal} onClose={()=>setBillModal(false)} onConfirm={handleGenerateBill} serviceName={`${appointments.find(a=>a._id===completeId)?.type || 'Consultation'} - ${appointments.find(a=>a._id===completeId)?.department || 'Clinic'}`} initialAmount={billAmount} />
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}><DialogContent className="max-w-md p-6"><WalkInPatientForm timeSlots={timeSlots} onPatientCreated={()=>{loadAppointments(); setShowWalkInModal(false);}} /></DialogContent></Dialog>
      {detailsApt && <AppointmentDetailsModal apt={detailsApt} onClose={()=>setDetailsApt(null)} />}
    </div>
  );
}
