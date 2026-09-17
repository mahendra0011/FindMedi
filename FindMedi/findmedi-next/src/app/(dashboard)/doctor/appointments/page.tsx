'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  CalendarDays, CheckCircle, XCircle, FileText, IndianRupee, Send, Plus, X,
  CalendarClock, FileCheck, ChevronLeft, ChevronRight, RefreshCw, AlertCircle, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api, downloadInvoicePdf } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import AppointmentDetailsModal from '@/components/shared/modals/AppointmentDetailsModal';
import TodayAppointmentsSection from '@/components/shared/sections/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/shared/sections/AppointmentHistorySection';
import UpcomingAppointmentsSection from '@/components/shared/sections/UpcomingAppointmentsSection';
import WalkInPatientForm from '@/components/shared/forms/WalkInPatientForm';
import ApproveAppointmentSection from '@/components/shared/sections/ApproveAppointmentSection';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAppointmentRealtime } from '@/hooks/useAppointmentRealtime';
import type { Appointment } from '@/types/models/appointment';
import type { AppointmentStatus } from '@/types/enums';

import {
  RescheduleModal,
  PrescriptionModal,
  LabReportModal,
  DischargeSummaryModal,
  BillModal,
  type PrescriptionFormData,
  type LabReportFormData,
  type DischargeFormData,
} from '@/components/doctor';

const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

const initialPrescriptionData: PrescriptionFormData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

const initialLabReportData: LabReportFormData = {
  patientName: '', age: '', gender: '', phone: '', email: '',
  doctorName: '', specialization: '',
  reportId: '', testDate: '', reportDate: '',
  tests: [{ name: '', result: '', unit: '', referenceRange: '' }],
  notes: '',
};

const initialDischargeData: DischargeFormData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  admissionId: '', admissionDate: '', dischargeDate: '',
  chiefComplaints: '', diagnosis: '',
  treatmentGiven: '', surgery: '',
  medications: [{ name: '', dosage: '', frequency: '' }],
  dischargeAdvice: '', followUpInstructions: '',
};

interface DoctorAppointmentsProps {
  initialView?: 'today' | 'approve' | 'upcoming' | 'history';
}

export default function DoctorAppointments({ initialView }: DoctorAppointmentsProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryView = searchParams?.get('view') as 'today' | 'approve' | 'upcoming' | 'history' | null;
  const pathView = pathname?.endsWith('/approve')
    ? 'approve'
    : pathname?.endsWith('/upcoming')
    ? 'upcoming'
    : pathname?.endsWith('/history')
    ? 'history'
    : 'today';

  const view = initialView || queryView || pathView;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calDate, setCalDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getISTDateString());
  const [loading, setLoading] = useState(true);

  // Modals
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState<string[]>([]);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'Prescription' | 'Lab Report' | 'Discharge Summary'>('Prescription');
  const [billModal, setBillModal] = useState<boolean | null>(null);
  const [billAmount, setBillAmount] = useState(500);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState<Appointment | null>(null);

  const [prescriptionData, setPrescriptionData] = useState<PrescriptionFormData>(initialPrescriptionData);
  const [labReportData, setLabReportData] = useState<LabReportFormData>(initialLabReportData);
  const [dischargeData, setDischargeData] = useState<DischargeFormData>(initialDischargeData);
  const [showReportModal, setShowReportModal] = useState(false);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const loadAppointments = useCallback(async (extraParams: Record<string, string | number> = {}) => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ status: 'All', limit: 100, ...extraParams }) as unknown as { appointments?: Appointment[]; data?: Appointment[] } | Appointment[];
      const apptList: Appointment[] = Array.isArray(data) ? data : (data?.appointments || data?.data || []);
      setAppointments(apptList);
    } catch (e: unknown) {
      console.error(e);
      const status = (e as { status?: number })?.status;
      if (status && status >= 400 && status < 600) {
        toast.error('Failed to load appointments');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAppointments]);

  // Realtime hook
  useAppointmentRealtime(loadAppointments);

  // Auto-refresh interval (30s)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadAppointments();
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  // Real slot availability on reschedule date change
  useEffect(() => {
    if (!rescheduleId || !newDate) {
      return;
    }
    let active = true;
    const apt = appointments.find(a => a._id === rescheduleId);
    const docId = (apt?.doctorId as unknown as { _id?: string })?._id || (apt?.doctorId as unknown as string);
    if (!docId) return;
    api.getBookedSlots({ doctorId: docId, date: newDate })
      .then(res => {
        if (!active) return;
        const data = res as unknown as { fullSlots?: string[]; counts?: Record<string, number>; dateDisabled?: string[] };
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setBookedSlots(data.fullSlots || Object.keys(data.counts || {}));
          setDateDisabledSlots(data.dateDisabled || []);
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
  const dayAppointments = appointments.filter(a => a.date === selectedDate);
  const approveAppointments = dayAppointments.filter(a => (a.status || '').toLowerCase() === 'pending');

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

  const openReportModal = useCallback((apt: Appointment, type: 'Prescription' | 'Lab Report' | 'Discharge Summary') => {
    setCompleteId(apt._id);
    setReportType(type);
    const doctorSpecialization = (user as unknown as { specialization?: string })?.specialization || '';
    if (type === 'Prescription') {
      setPrescriptionData({
        ...initialPrescriptionData,
        patientName: apt.patient || '',
        doctorName: user?.name || '',
        specialization: doctorSpecialization,
      });
    } else if (type === 'Lab Report') {
      setLabReportData({
        ...initialLabReportData,
        patientName: apt.patient || '',
        doctorName: user?.name || '',
        specialization: doctorSpecialization,
        testDate: getISTDateString(),
        reportDate: getISTDateString(),
        reportId: `LAB-${crypto.randomUUID()}`,
      });
    } else {
      setDischargeData({
        ...initialDischargeData,
        patientName: apt.patient || '',
        doctorName: user?.name || '',
        specialization: doctorSpecialization,
        admissionDate: apt.date || getISTDateString(),
        dischargeDate: getISTDateString(),
      });
    }
    setShowReportModal(true);
  }, [user?.name, user]);

  // Custom event listener for "Write Prescription" from TodayAppointmentsSection
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvt = e as CustomEvent<Appointment>;
      if (customEvt.detail) {
        openReportModal(customEvt.detail, 'Prescription');
      }
    };
    window.addEventListener('open-prescription', handler);
    return () => window.removeEventListener('open-prescription', handler);
  }, [openReportModal]);

  const handleGeneratePrescription = async (data: PrescriptionFormData) => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = data.medications.filter(m => m.name.trim());
      const patientId = (apt.patientId as unknown as { _id?: string })?._id || (apt.patientId as unknown as string);
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
      await api.createNotification({
        title: 'New Prescription',
        message: `Dr. ${user?.name} has generated your prescription`,
        type: 'records',
        userId: (patientId || apt.patient) as string,
      });
      toast.success('Prescription generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate prescription');
    }
  };

  const handleGenerateLabReport = async (data: LabReportFormData) => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.reportId) return toast.error('Please enter a Report ID');
    try {
      const tests = data.tests.filter(t => t.name.trim());
      const patientId = (apt.patientId as unknown as { _id?: string })?._id || (apt.patientId as unknown as string);
      await api.createRecord({
        patient: data.patientName,
        patientId,
        doctor: data.doctorName,
        diagnosis: 'Lab Report',
        prescription: '',
        type: 'lab_report',
        notes: data.notes,
        data: {
          patient: { name: data.patientName, age: data.age, gender: data.gender, phone: data.phone, email: data.email },
          doctor: { name: data.doctorName, specialization: data.specialization },
          reportId: data.reportId,
          testDate: data.testDate,
          reportDate: data.reportDate,
          tests,
          notes: data.notes,
          date: data.reportDate,
        },
      });
      await api.createNotification({
        title: 'Lab Report Ready',
        message: `Dr. ${user?.name} has generated your lab report`,
        type: 'records',
        userId: (patientId || apt.patient) as string,
      });
      toast.success('Lab report generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate lab report');
    }
  };

  const handleGenerateDischargeSummary = async (data: DischargeFormData) => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = data.medications.filter(m => m.name.trim());
      const patientId = (apt.patientId as unknown as { _id?: string })?._id || (apt.patientId as unknown as string);
      await api.createRecord({
        patient: data.patientName,
        patientId,
        doctor: data.doctorName,
        diagnosis: data.diagnosis,
        prescription: meds.map(m => `${m.name} - ${m.dosage} - ${m.frequency}`).join('\n'),
        type: 'discharge_summary',
        notes: `Chief Complaints: ${data.chiefComplaints}\nTreatment: ${data.treatmentGiven}\nSurgery: ${data.surgery}\nDischarge Advice: ${data.dischargeAdvice}\nFollow-up: ${data.followUpInstructions}`,
        data: {
          patient: { name: data.patientName, age: data.age, gender: data.gender, phone: data.phone, email: data.email, address: data.address },
          doctor: { name: data.doctorName, specialization: data.specialization },
          admissionId: data.admissionId,
          admissionDate: data.admissionDate,
          dischargeDate: data.dischargeDate,
          chiefComplaints: data.chiefComplaints,
          diagnosis: data.diagnosis,
          treatment: data.treatmentGiven,
          surgery: data.surgery,
          medications: meds,
          dischargeAdvice: data.dischargeAdvice,
          followUpInstructions: data.followUpInstructions,
          date: data.dischargeDate,
        },
      });
      await api.createNotification({
        title: 'Discharge Summary',
        message: `Dr. ${user?.name} has generated your discharge summary`,
        type: 'records',
        userId: (patientId || apt.patient) as string,
      });
      toast.success('Discharge summary generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate discharge summary');
    }
  };

  const handleGenerateBill = async (amount: number) => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!amount) return toast.error('Please enter a bill amount');
    try {
      const patientId = (apt.patientId as unknown as { _id?: string })?._id || (apt.patientId as unknown as string);
      await api.createBill({
        patient: apt.patient,
        patientId,
        doctor: user?.name,
        service: `${apt.type} - ${apt.department || ''}`,
        amount,
        date: getISTDateString(),
        status: 'Pending',
      });
      await api.createNotification({
        title: 'New Invoice',
        message: `New invoice of ₹${amount} generated for ${apt.type} - ${apt.department || ''}`,
        type: 'payment',
        userId: (patientId || apt.patient) as string,
      });
      await api.updateAppointment(completeId, { status: 'Completed' as AppointmentStatus });
      toast.success('Bill generated');
      setBillModal(null);
      setCompleteId(null);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate bill');
    }
  };

  // Shared Calendar Widget
  const CalendarWidget = (
    <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm">
      {/* Today summary banner */}
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
      {view === 'approve' && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending requests</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Today</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 md:h-full md:flex md:flex-col">
      {/* Header + Tab switcher */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2 shrink-0">
          {view === 'approve'
            ? <><FileCheck className="w-5 h-5 text-amber-500" /> Pending Approvals</>
            : view === 'upcoming'
            ? <><CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Upcoming Appointments</>
            : view === 'history'
            ? <><CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Appointment History</>
            : <><CalendarClock className="w-5 h-5 text-primary" /> Today Appointments</>
          }
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>
          )}
          {view === 'upcoming' && upcomingAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">{upcomingAppointments.length} upcoming</span>
          )}
          {view === 'today' && todayAppointments.filter(a => a.status !== 'Pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">{todayAppointments.filter(a => a.status !== 'Pending').length} today</span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground hidden xl:inline shrink-0">
          {view === 'approve' ? 'Review pending requests' : view === 'upcoming' ? 'Confirmed future bookings' : view === 'history' ? 'Completed history' : 'Scheduled for today'}
        </p>
        {/* 4 Tabs: Pending, Upcoming, Today, Complete + Home Visit */}
        <div className="flex items-center bg-muted/60 border border-border/50 rounded-full p-0.5 gap-0.5">
          <Link href="/doctor/appointments/approve">
            <button aria-label="Pending appointments" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'approve' ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <FileCheck className="w-4 h-4" /> Pending
              {pendingAppointments.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'approve' ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'}`}>{pendingAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments/upcoming">
            <button aria-label="Upcoming appointments" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'upcoming' ? 'bg-purple-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarClock className="w-4 h-4" /> Upcoming
              {upcomingAppointments.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'upcoming' ? 'bg-white/25 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}>{upcomingAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments">
            <button aria-label="Today appointments" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'today' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarClock className="w-4 h-4" /> Today
              {todayAppointments.filter(a => a.status !== 'Pending').length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'today' ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}>
                  {todayAppointments.filter(a => a.status !== 'Pending').length}
                </span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments/history">
            <button aria-label="Appointment history" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarDays className="w-4 h-4" /> Complete
            </button>
          </Link>
          <Link href="/doctor/home-visit">
            <button aria-label="Home visits" className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-300">
              <MapPin className="w-4 h-4 text-violet-500" /> Home Visit
            </button>
          </Link>
        </div>
        {view === 'today' && (
          <Button onClick={() => setShowWalkInModal(true)} size="sm" className="h-7 rounded-full gap-1 shrink-0 px-3 text-xs">
            <Plus className="w-3.5 h-3.5" /> Walk-in
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border/60 p-5 animate-pulse">
              <div className="flex items-start justify-between mb-3"><div className="h-5 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-16" /></div>
              <div className="space-y-1.5 mb-4"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-4 bg-muted rounded w-1/3" /></div>
              <div className="space-y-1.5 mb-3"><div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-3/4" /></div>
              <div className="flex gap-2 pt-2"><div className="h-8 bg-muted rounded flex-1" /><div className="h-8 bg-muted rounded flex-1" /></div>
            </div>
          ))}
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
        /* APPROVE VIEW */
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
        isOpen={showReportModal && reportType === 'Prescription'}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleGeneratePrescription}
        initialData={prescriptionData}
      />

      {/* Lab Report Modal */}
      <LabReportModal
        isOpen={showReportModal && reportType === 'Lab Report'}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleGenerateLabReport}
        initialData={labReportData}
      />

      {/* Discharge Summary Modal */}
      <DischargeSummaryModal
        isOpen={showReportModal && reportType === 'Discharge Summary'}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleGenerateDischargeSummary}
        initialData={dischargeData}
      />

      {/* Bill Modal */}
      <BillModal
        isOpen={Boolean(billModal)}
        onClose={() => setBillModal(null)}
        onConfirm={handleGenerateBill}
        serviceName={`${appointments.find(a => a._id === completeId)?.type || 'Consultation'} - ${appointments.find(a => a._id === completeId)?.department || ''}`}
        initialAmount={billAmount}
      />

      {/* Walk-in Patient Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="max-w-md p-6">
          <WalkInPatientForm
            timeSlots={timeSlots}
            onPatientCreated={() => { loadAppointments(); setShowWalkInModal(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Details Modal */}
      {detailsApt && (
        <AppointmentDetailsModal apt={detailsApt} onClose={() => setDetailsApt(null)} />
      )}
    </div>
  );
}
