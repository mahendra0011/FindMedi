'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, CalendarClock, FileCheck, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
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
  LabReportModal,
  DischargeSummaryModal,
  BillModal,
  DoctorCalendarWidget,
  buildPrescriptionRecord,
  buildLabReportRecord,
  buildDischargeRecord,
  buildBillBody,
  getAppointmentPatientId,
  type PrescriptionFormData,
  type LabReportFormData,
  type DischargeFormData,
} from '@/components/doctor';
import { useDoctorAppointments } from '@/features/appointments/hooks';

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

  // Modals
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState<string[]>([]);
  const [completeId, setCompleteId] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'Prescription' | 'Lab Report' | 'Discharge Summary'>('Prescription');
  const [billModal, setBillModal] = useState<boolean | null>(null);
  const [billAmount] = useState(500);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState<Appointment | null>(null);

  const [prescriptionData, setPrescriptionData] = useState<PrescriptionFormData>(initialPrescriptionData);
  const [labReportData, setLabReportData] = useState<LabReportFormData>(initialLabReportData);
  const [dischargeData, setDischargeData] = useState<DischargeFormData>(initialDischargeData);
  const [showReportModal, setShowReportModal] = useState(false);

  // Real slot availability on reschedule date change
  useEffect(() => {
    if (!rescheduleId || !newDate) {
      return;
    }
    let active = true;
    const apt = appointments.find((a) => a._id === rescheduleId);
    const docId = (apt?.doctorId as unknown as { _id?: string })?._id || (apt?.doctorId as unknown as string);
    if (!docId) return;
    api
      .getBookedSlots({ doctorId: docId, date: newDate })
      .then((res) => {
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
      .catch((err) => console.error('Failed to fetch booked slots:', err));
    return () => {
      active = false;
    };
  }, [rescheduleId, newDate, appointments]);

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

  const openReportModal = useCallback(
    (apt: Appointment, type: 'Prescription' | 'Lab Report' | 'Discharge Summary') => {
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
    },
    [user?.name, user],
  );

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
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      await api.createRecord(buildPrescriptionRecord(data, apt));
      await api.createNotification({
        title: 'New Prescription',
        message: `Dr. ${user?.name} has generated your prescription`,
        type: 'records',
        userId: getAppointmentPatientId(apt) || apt.patient,
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
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.reportId) return toast.error('Please enter a Report ID');
    try {
      await api.createRecord(buildLabReportRecord(data));
      await api.createNotification({
        title: 'Lab Report Ready',
        message: `Dr. ${user?.name} has generated your lab report`,
        type: 'records',
        userId: getAppointmentPatientId(apt) || apt.patient,
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
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!data.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      await api.createRecord(buildDischargeRecord(data, apt));
      await api.createNotification({
        title: 'Discharge Summary',
        message: `Dr. ${user?.name} has generated your discharge summary`,
        type: 'records',
        userId: getAppointmentPatientId(apt) || apt.patient,
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
    const apt = appointments.find((a) => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!amount) return toast.error('Please enter a bill amount');
    try {
      await api.createBill(buildBillBody(apt, user?.name, amount));
      await api.createNotification({
        title: 'New Invoice',
        message: `New invoice of ₹${amount} generated for ${apt.type} - ${apt.department || ''}`,
        type: 'payment',
        userId: getAppointmentPatientId(apt) || apt.patient,
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

  return (
    <div className="space-y-6 md:h-full md:flex md:flex-col">
      {/* Header + Tab switcher */}
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2 shrink-0">
          {view === 'approve' ? (
            <>
              <FileCheck className="w-5 h-5 text-amber-500" /> Pending Approvals
            </>
          ) : view === 'upcoming' ? (
            <>
              <CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Upcoming Appointments
            </>
          ) : view === 'history' ? (
            <>
              <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Appointment History
            </>
          ) : (
            <>
              <CalendarClock className="w-5 h-5 text-primary" /> Today Appointments
            </>
          )}
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600">
              {pendingAppointments.length} pending
            </span>
          )}
          {view === 'upcoming' && upcomingAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400">
              {upcomingAppointments.length} upcoming
            </span>
          )}
          {view === 'today' && todayAppointments.filter((a) => a.status !== 'Pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
              {todayAppointments.filter((a) => a.status !== 'Pending').length} today
            </span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground hidden xl:inline shrink-0">
          {view === 'approve'
            ? 'Review pending requests'
            : view === 'upcoming'
              ? 'Confirmed future bookings'
              : view === 'history'
                ? 'Completed history'
                : 'Scheduled for today'}
        </p>
        {/* 4 Tabs: Pending, Upcoming, Today, Complete + Home Visit */}
        <div className="flex items-center bg-muted/60 border border-border/50 rounded-full p-0.5 gap-0.5">
          <Link href="/doctor/appointments/approve">
            <button
              aria-label="Pending appointments"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'approve' ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <FileCheck className="w-4 h-4" /> Pending
              {pendingAppointments.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'approve' ? 'bg-white/25 text-white' : 'bg-amber-500 text-white'}`}
                >
                  {pendingAppointments.length}
                </span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments/upcoming">
            <button
              aria-label="Upcoming appointments"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'upcoming' ? 'bg-purple-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarClock className="w-4 h-4" /> Upcoming
              {upcomingAppointments.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'upcoming' ? 'bg-white/25 text-white' : 'bg-purple-500/20 text-purple-600 dark:text-purple-400'}`}
                >
                  {upcomingAppointments.length}
                </span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments">
            <button
              aria-label="Today appointments"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'today' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarClock className="w-4 h-4" /> Today
              {todayAppointments.filter((a) => a.status !== 'Pending').length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${view === 'today' ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'}`}
                >
                  {todayAppointments.filter((a) => a.status !== 'Pending').length}
                </span>
              )}
            </button>
          </Link>
          <Link href="/doctor/appointments/history">
            <button
              aria-label="Appointment history"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarDays className="w-4 h-4" /> Complete
            </button>
          </Link>
          <Link href="/doctor/home-visit">
            <button
              aria-label="Home visits"
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-300"
            >
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
              <div className="flex items-start justify-between mb-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-muted rounded flex-1" />
                <div className="h-8 bg-muted rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : view === 'today' ? (
        <TodayAppointmentsSection
          appointments={appointments}
          selectedDate={selectedDate}
          calendar={
            <DoctorCalendarWidget
              appointments={appointments}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              calDate={calDate}
              onCalDateChange={setCalDate}
              view={view}
              pendingAppointments={pendingAppointments}
            />
          }
          onRefresh={loadAppointments}
          user={user}
          onViewDetails={(a) => setDetailsApt(a)}
        />
      ) : view === 'upcoming' ? (
        <UpcomingAppointmentsSection appointments={appointments} onViewDetails={(a) => setDetailsApt(a)} user={user} />
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
        serviceName={`${appointments.find((a) => a._id === completeId)?.type || 'Consultation'} - ${appointments.find((a) => a._id === completeId)?.department || ''}`}
        initialAmount={billAmount}
      />

      {/* Walk-in Patient Modal */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="max-w-md p-6">
          <WalkInPatientForm
            timeSlots={timeSlots}
            onPatientCreated={() => {
              loadAppointments();
              setShowWalkInModal(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Appointment Details Modal */}
      {detailsApt && <AppointmentDetailsModal apt={detailsApt} onClose={() => setDetailsApt(null)} />}
    </div>
  );
}
