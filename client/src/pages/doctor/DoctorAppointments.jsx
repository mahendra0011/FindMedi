import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  CalendarDays, CheckCircle, XCircle, FileText, IndianRupee, Send, Plus, X,
  CalendarClock, FileCheck, ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api, downloadInvoicePdf } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import TodayAppointmentsSection from '@/components/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/AppointmentHistorySection';
import { subSlotFor } from '@/lib/timeSlots';
import WalkInPatientForm from '@/components/WalkInPatientForm';
import ApproveAppointmentSection from '@/components/ApproveAppointmentSection';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';

const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

const initialPrescriptionData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

const initialLabReportData = {
  patientName: '', age: '', gender: '', phone: '', email: '',
  doctorName: '', specialization: '',
  reportId: '', testDate: '', reportDate: '',
  tests: [{ name: '', result: '', unit: '', referenceRange: '' }],
  notes: '',
};

const initialDischargeData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  admissionId: '', admissionDate: '', dischargeDate: '',
  chiefComplaints: '', diagnosis: '',
  treatmentGiven: '', surgery: '',
  medications: [{ name: '', dosage: '', frequency: '' }],
  dischargeAdvice: '', followUpInstructions: '',
};

export default function DoctorAppointments() {
  const { user } = useAuth();
  const location = useLocation();
  const view = location.pathname.endsWith('/approve') ? 'approve' : location.pathname.endsWith('/history') ? 'history' : 'today';
  const [appointments, setAppointments] = useState([]);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [loading, setLoading] = useState(true);

  // Modals
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState([]);
  const [completeId, setCompleteId] = useState(null);
  const [reportType, setReportType] = useState('Prescription');
  const [billModal, setBillModal] = useState(null);
  const [billAmount, setBillAmount] = useState(500);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState(null);

  const [prescriptionData, setPrescriptionData] = useState(initialPrescriptionData);
  const [labReportData, setLabReportData] = useState(initialLabReportData);
  const [dischargeData, setDischargeData] = useState(initialDischargeData);
  const [showReportModal, setShowReportModal] = useState(false);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const loadAppointments = useCallback(async (searchParams = {}) => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ status: 'All', limit: 100, ...searchParams });
      setAppointments(data?.appointments || data?.data || data || []);
    } catch (e) {
      console.error(e);
      // Transient network errors interceptor me already retry ho jaate hain —
      // sirf genuine server errors par hi user ko batana chahiye.
      if (e?.status && e.status >= 400 && e.status < 600) toast.error('Failed to load appointments');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Realtime — naye bookings/status changes turant dikhein (30s polling fallback bhi hai)
  useAppointmentRealtime(loadAppointments);

  // Auto-refresh — naye bookings (walk-in/online) bina manual reload ke dikhein
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadAppointments();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  // Fetch real slot availability when reschedule modal date changes
  useEffect(() => {
    if (!rescheduleId || !newDate) {
      setBookedSlots([]); setDateDisabledSlots([]); return;
    }
    const apt = appointments.find(a => a._id === rescheduleId);
    const doctorId = apt?.doctorId?._id;
    if (!doctorId) return;
    api.getBookedSlots({ doctorId, date: newDate })
      .then(res => {
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          setBookedSlots(res.fullSlots || Object.keys(res.counts || {}));
          setDateDisabledSlots(res.dateDisabled || []);
        } else {
          setBookedSlots(Array.isArray(res) ? res : []);
          setDateDisabledSlots([]);
        }
      })
      .catch(err => console.error('Failed to fetch booked slots:', err));
  }, [rescheduleId, newDate, appointments]);

  const today = getISTDateString();
  const pendingAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
  const todayAppointments = appointments.filter(a => a.date === today);
  const dayAppointments = appointments.filter(a => a.date === selectedDate);
  const approveAppointments = dayAppointments.filter(a => (a.status || '').toLowerCase() === 'pending');

  const handleStatus = async (id, status, extra = {}) => {
    try { await api.updateAppointment(id, { status, ...extra }); loadAppointments(); } catch (e) { console.error(e); toast.error('Failed to update appointment'); }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleId) return;
    try {
      await api.updateAppointment(rescheduleId, { date: newDate, time: newTime, status: 'Confirmed' });
      toast.success('Appointment rescheduled');
      setRescheduleId(null); setNewDate(''); setNewTime('');
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to reschedule appointment'); }
  };

  const openReportModal = useCallback((apt, type) => {
    setCompleteId(apt._id);
    setReportType(type);
    if (type === 'Prescription') {
      setPrescriptionData({ ...initialPrescriptionData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '' });
    } else if (type === 'Lab Report') {
      setLabReportData({ ...initialLabReportData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', testDate: getISTDateString(), reportDate: getISTDateString(), reportId: `LAB-${crypto.randomUUID()}` });
    } else {
      setDischargeData({ ...initialDischargeData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', admissionDate: apt.date || getISTDateString(), dischargeDate: getISTDateString() });
    }
    setShowReportModal(true);
  }, [user?.name, user?.specialization]);

  // Listen for "Write Prescription" from TodayAppointmentsSection
  useEffect(() => {
    const handler = (e) => openReportModal(e.detail, 'Prescription');
    window.addEventListener('open-prescription', handler);
    return () => window.removeEventListener('open-prescription', handler);
  }, [openReportModal]);

  const addMedication = (type) => {
    if (type === 'Prescription') {
      setPrescriptionData({ ...prescriptionData, medications: [...prescriptionData.medications, { name: '', dosage: '', frequency: '', instructions: '' }] });
    } else {
      setDischargeData({ ...dischargeData, medications: [...dischargeData.medications, { name: '', dosage: '', frequency: '' }] });
    }
  };

  const removeMedication = (type, index) => {
    if (type === 'Prescription') {
      setPrescriptionData({ ...prescriptionData, medications: prescriptionData.medications.filter((_, i) => i !== index) });
    } else {
      setDischargeData({ ...dischargeData, medications: dischargeData.medications.filter((_, i) => i !== index) });
    }
  };

  const updateMedication = (type, index, field, value) => {
    if (type === 'Prescription') {
      const meds = [...prescriptionData.medications]; meds[index][field] = value;
      setPrescriptionData({ ...prescriptionData, medications: meds });
    } else {
      const meds = [...dischargeData.medications]; meds[index][field] = value;
      setDischargeData({ ...dischargeData, medications: meds });
    }
  };

  const handleGeneratePrescription = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!prescriptionData.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = prescriptionData.medications.filter(m => m.name.trim());
      await api.createRecord({
        patient: prescriptionData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: prescriptionData.doctorName,
        diagnosis: prescriptionData.diagnosis,
        prescription: prescriptionData.medications.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`).join('\n'),
        type: 'prescription',
        notes: `Chief Complaints: ${prescriptionData.chiefComplaints}\nAdvice: ${prescriptionData.advice}\nFollow-up: ${prescriptionData.followUp}`,
        data: {
          patient: { name: prescriptionData.patientName, age: prescriptionData.age, gender: prescriptionData.gender, phone: prescriptionData.phone, email: prescriptionData.email, address: prescriptionData.address },
          doctor: { name: prescriptionData.doctorName, specialization: prescriptionData.specialization },
          chiefComplaints: prescriptionData.chiefComplaints,
          diagnosis: prescriptionData.diagnosis,
          medications: meds,
          advice: prescriptionData.advice,
          followUp: prescriptionData.followUp,
          date: getISTDateString(),
        },
      });
      await api.createNotification({ title: 'New Prescription', message: `Dr. ${user?.name} has generated your prescription`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Prescription generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate prescription'); }
  };

  const handleGenerateLabReport = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!labReportData.reportId) return toast.error('Please enter a Report ID');
    try {
      const tests = labReportData.tests.filter(t => t.name.trim());
      await api.createRecord({
        patient: labReportData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: labReportData.doctorName,
        diagnosis: 'Lab Report',
        prescription: '',
        type: 'lab_report',
        notes: labReportData.notes,
        data: {
          patient: { name: labReportData.patientName, age: labReportData.age, gender: labReportData.gender, phone: labReportData.phone, email: labReportData.email },
          doctor: { name: labReportData.doctorName, specialization: labReportData.specialization },
          reportId: labReportData.reportId,
          testDate: labReportData.testDate, reportDate: labReportData.reportDate,
          tests, notes: labReportData.notes, date: labReportData.reportDate,
        },
      });
      await api.createNotification({ title: 'Lab Report Ready', message: `Dr. ${user?.name} has generated your lab report`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Lab report generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate lab report'); }
  };

  const handleGenerateDischargeSummary = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!dischargeData.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = dischargeData.medications.filter(m => m.name.trim());
      await api.createRecord({
        patient: dischargeData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: dischargeData.doctorName,
        diagnosis: dischargeData.diagnosis,
        prescription: dischargeData.medications.map(m => `${m.name} - ${m.dosage} - ${m.frequency}`).join('\n'),
        type: 'discharge_summary',
        notes: `Chief Complaints: ${dischargeData.chiefComplaints}\nTreatment: ${dischargeData.treatmentGiven}\nSurgery: ${dischargeData.surgery}\nDischarge Advice: ${dischargeData.dischargeAdvice}\nFollow-up: ${dischargeData.followUpInstructions}`,
        data: {
          patient: { name: dischargeData.patientName, age: dischargeData.age, gender: dischargeData.gender, phone: dischargeData.phone, email: dischargeData.email, address: dischargeData.address },
          doctor: { name: dischargeData.doctorName, specialization: dischargeData.specialization },
          admissionId: dischargeData.admissionId, admissionDate: dischargeData.admissionDate, dischargeDate: dischargeData.dischargeDate,
          chiefComplaints: dischargeData.chiefComplaints, diagnosis: dischargeData.diagnosis,
          treatment: dischargeData.treatmentGiven, surgery: dischargeData.surgery,
          medications: meds, dischargeAdvice: dischargeData.dischargeAdvice, followUpInstructions: dischargeData.followUpInstructions,
          date: dischargeData.dischargeDate,
        },
      });
      await api.createNotification({ title: 'Discharge Summary', message: `Dr. ${user?.name} has generated your discharge summary`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Discharge summary generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate discharge summary'); }
  };

  const handleGenerateBill = async () => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!billAmount) return toast.error('Please enter a bill amount');
    try {
      await api.createBill({
        patient: apt.patient, patientId: apt.patientId?._id || apt.patientId,
        doctor: user?.name, service: `${apt.type} - ${apt.department}`,
        amount: billAmount, date: getISTDateString(), status: 'Confirmed',
      });
      await api.createNotification({ title: 'New Invoice', message: `New invoice of ₹${billAmount} generated for ${apt.type} - ${apt.department}`, type: 'payment', userId: apt.patientId || apt.patient });
      await api.updateAppointment(completeId, { status: 'Completed' });
      toast.success('Bill generated');
      setBillModal(null); setCompleteId(null);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate bill'); }
  };

  // Calendar widget (shared by both views)
  const CalendarWidget = (
    <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm">
      {/* ── Today summary banner ── */}
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
            ? <><FileCheck className="w-5 h-5 text-primary" /> Approve Appointments</>
            : view === 'history'
            ? <><CalendarDays className="w-5 h-5 text-primary" /> Appointment History</>
            : <><CalendarClock className="w-5 h-5 text-primary" /> Today Appointments</>
          }
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>
          )}
          {view === 'today' && todayAppointments.filter(a => a.status !== 'Pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">{todayAppointments.filter(a => a.status !== 'Pending').length} today</span>
          )}
        </h1>
        <p className="text-xs text-muted-foreground hidden xl:inline shrink-0">
          {view === 'approve' ? 'Review pending requests' : view === 'history' ? 'Completed history' : 'Scheduled for today'}
        </p>
        {/* Today + Approve + History tabs */}
        <div className="flex items-center bg-primary/10 rounded-full p-0.5">
          <Link to="/doctor/appointments">
            <button aria-label="Today appointments" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'today' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarClock className="w-4 h-4" /> Today
            </button>
          </Link>
          <Link to="/doctor/appointments/approve">
            <button aria-label="Approve appointments" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'approve' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <FileCheck className="w-4 h-4" /> Approve
              {pendingAppointments.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">{pendingAppointments.length}</span>
              )}
            </button>
          </Link>
          <Link to="/doctor/appointments/history">
            <button aria-label="Appointment history" className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${view === 'history' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarDays className="w-4 h-4" /> History
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
              <div className="space-y-1.5 mb-3"><div className="h-3 bg-muted rounded w-full" /><div className="h-3 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div>
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
      ) : view === 'history' ? (
        <AppointmentHistorySection appointments={appointments} />
      ) : (
        /* ════════ APPROVE VIEW (History layout: calendar + patients left, time filter + cards middle, overview right) ════════ */
        <ApproveAppointmentSection
          appointments={appointments}
          onConfirm={(a) => handleStatus(a._id, 'Confirmed')}
          onReject={(a, reason) => handleStatus(a._id, 'Cancelled', { notes: reason })}
        />
      )}

      {/* ════════ Reschedule Modal ════════ */}
      {rescheduleId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRescheduleId(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Reschedule Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Date</label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={getISTDateString()} />
              </div>
              {newDate && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">New Time</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {timeSlots.map(t => {
                      const isBooked = bookedSlots.includes(t);
                      const isDisabled = dateDisabledSlots.includes(t);
                      const isUnavailable = isBooked || isDisabled;
                      return (
                        <button key={t} onClick={() => !isUnavailable && setNewTime(t)} disabled={isUnavailable}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${newTime === t ? 'bg-primary text-primary-foreground' : isUnavailable ? 'bg-muted/40 text-muted-foreground cursor-not-allowed' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {t}{isBooked && <span className="ml-1 text-[9px]">(full)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleReschedule} disabled={!newDate || !newTime}>Confirm</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Prescription Modal ════════ */}
      {showReportModal && reportType === 'Prescription' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Create New Prescription</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label><Input value={prescriptionData.patientName} onChange={e => setPrescriptionData({ ...prescriptionData, patientName: e.target.value })} placeholder="Enter patient name" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Age</label><Input type="number" value={prescriptionData.age} onChange={e => setPrescriptionData({ ...prescriptionData, age: e.target.value })} placeholder="Age" /></div>
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label><select value={prescriptionData.gender} onChange={e => setPrescriptionData({ ...prescriptionData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label><Input value={prescriptionData.phone} onChange={e => setPrescriptionData({ ...prescriptionData, phone: e.target.value })} placeholder="Phone number" /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Email</label><Input type="email" value={prescriptionData.email} onChange={e => setPrescriptionData({ ...prescriptionData, email: e.target.value })} placeholder="Email" /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label><Input value={prescriptionData.chiefComplaints} onChange={e => setPrescriptionData({ ...prescriptionData, chiefComplaints: e.target.value })} placeholder="Enter chief complaints" /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label><Input value={prescriptionData.diagnosis} onChange={e => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })} placeholder="Enter diagnosis" /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-foreground">Medications</label><Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => addMedication('Prescription')}><Plus className="w-3 h-3" /> Add Medication</Button></div>
                {prescriptionData.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication('Prescription', idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={e => updateMedication('Prescription', idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={e => updateMedication('Prescription', idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-28" />
                    <Input value={med.instructions} onChange={e => updateMedication('Prescription', idx, 'instructions', e.target.value)} placeholder="Instructions" className="flex-1" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMedication('Prescription', idx)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label><Input value={prescriptionData.advice} onChange={e => setPrescriptionData({ ...prescriptionData, advice: e.target.value })} placeholder="Advice for patient" /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label><Input value={prescriptionData.followUp} onChange={e => setPrescriptionData({ ...prescriptionData, followUp: e.target.value })} placeholder="Follow-up date" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGeneratePrescription} disabled={!prescriptionData.diagnosis}><Send className="w-4 h-4" /> Generate & Send</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Lab Report Modal ════════ */}
      {showReportModal && reportType === 'Lab Report' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Generate Lab Report</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label><Input value={labReportData.patientName} onChange={e => setLabReportData({ ...labReportData, patientName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Age</label><Input type="number" value={labReportData.age} onChange={e => setLabReportData({ ...labReportData, age: e.target.value })} /></div>
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label><select value={labReportData.gender} onChange={e => setLabReportData({ ...labReportData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label><Input value={labReportData.phone} onChange={e => setLabReportData({ ...labReportData, phone: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Email</label><Input type="email" value={labReportData.email} onChange={e => setLabReportData({ ...labReportData, email: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Report ID</label><Input value={labReportData.reportId} onChange={e => setLabReportData({ ...labReportData, reportId: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Test Date</label><Input type="date" value={labReportData.testDate} onChange={e => setLabReportData({ ...labReportData, testDate: e.target.value })} /></div>
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Report Date</label><Input type="date" value={labReportData.reportDate} onChange={e => setLabReportData({ ...labReportData, reportDate: e.target.value })} /></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-foreground">Tests</label><Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setLabReportData({ ...labReportData, tests: [...labReportData.tests, { name: '', result: '', unit: '', referenceRange: '' }] })}><Plus className="w-3 h-3" /> Add Test</Button></div>
                {labReportData.tests.map((t, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={t.name} onChange={e => { const tests = [...labReportData.tests]; tests[idx].name = e.target.value; setLabReportData({ ...labReportData, tests }); }} placeholder="Test name" className="flex-1" />
                    <Input value={t.result} onChange={e => { const tests = [...labReportData.tests]; tests[idx].result = e.target.value; setLabReportData({ ...labReportData, tests }); }} placeholder="Result" className="w-20" />
                    <Input value={t.unit} onChange={e => { const tests = [...labReportData.tests]; tests[idx].unit = e.target.value; setLabReportData({ ...labReportData, tests }); }} placeholder="Unit" className="w-20" />
                    <Input value={t.referenceRange} onChange={e => { const tests = [...labReportData.tests]; tests[idx].referenceRange = e.target.value; setLabReportData({ ...labReportData, tests }); }} placeholder="Ref range" className="w-24" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setLabReportData({ ...labReportData, tests: labReportData.tests.filter((_, i) => i !== idx) })}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label><Input value={labReportData.notes} onChange={e => setLabReportData({ ...labReportData, notes: e.target.value })} placeholder="Additional notes" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateLabReport} disabled={!labReportData.reportId}><Send className="w-4 h-4" /> Generate & Send</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Discharge Summary Modal ════════ */}
      {showReportModal && reportType === 'Discharge Summary' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Discharge Summary</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label><Input value={dischargeData.patientName} onChange={e => setDischargeData({ ...dischargeData, patientName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Age</label><Input type="number" value={dischargeData.age} onChange={e => setDischargeData({ ...dischargeData, age: e.target.value })} /></div>
                  <div><label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label><select value={dischargeData.gender} onChange={e => setDischargeData({ ...dischargeData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label><Input value={dischargeData.phone} onChange={e => setDischargeData({ ...dischargeData, phone: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Email</label><Input type="email" value={dischargeData.email} onChange={e => setDischargeData({ ...dischargeData, email: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Address</label><Input value={dischargeData.address} onChange={e => setDischargeData({ ...dischargeData, address: e.target.value })} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Admission ID</label><Input value={dischargeData.admissionId} onChange={e => setDischargeData({ ...dischargeData, admissionId: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Admission Date</label><Input type="date" value={dischargeData.admissionDate} onChange={e => setDischargeData({ ...dischargeData, admissionDate: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Date</label><Input type="date" value={dischargeData.dischargeDate} onChange={e => setDischargeData({ ...dischargeData, dischargeDate: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label><Input value={dischargeData.chiefComplaints} onChange={e => setDischargeData({ ...dischargeData, chiefComplaints: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label><Input value={dischargeData.diagnosis} onChange={e => setDischargeData({ ...dischargeData, diagnosis: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Treatment Given</label><Input value={dischargeData.treatmentGiven} onChange={e => setDischargeData({ ...dischargeData, treatmentGiven: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Surgery</label><Input value={dischargeData.surgery} onChange={e => setDischargeData({ ...dischargeData, surgery: e.target.value })} /></div>
              <div>
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-foreground">Medications</label><Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => addMedication('Discharge')}><Plus className="w-3 h-3" /> Add Medication</Button></div>
                {dischargeData.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication('Discharge', idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={e => updateMedication('Discharge', idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={e => updateMedication('Discharge', idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-24" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMedication('Discharge', idx)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Advice</label><Input value={dischargeData.dischargeAdvice} onChange={e => setDischargeData({ ...dischargeData, dischargeAdvice: e.target.value })} /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up Instructions</label><Input value={dischargeData.followUpInstructions} onChange={e => setDischargeData({ ...dischargeData, followUpInstructions: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateDischargeSummary} disabled={!dischargeData.diagnosis}><Send className="w-4 h-4" /> Generate & Send</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Bill Modal ════════ */}
      {billModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBillModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Generate Invoice</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Service</label><Input value={`${appointments.find(a => a._id === completeId)?.type || 'Consultation'} - ${appointments.find(a => a._id === completeId)?.department || ''}`} disabled /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Amount (₹)</label><Input type="number" value={billAmount} onChange={e => setBillAmount(Number(e.target.value))} min={0} /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setBillModal(null)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateBill} disabled={!billAmount}><Send className="w-4 h-4" /> Generate & Send</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Walk-in Patient Modal ════════ */}
      <Dialog open={showWalkInModal} onOpenChange={setShowWalkInModal}>
        <DialogContent className="max-w-md p-6">
          <WalkInPatientForm
            timeSlots={timeSlots}
            onPatientCreated={() => { loadAppointments(); setShowWalkInModal(false); }}
          />
        </DialogContent>
      </Dialog>

      {/* ════════ Appointment Details Modal ════════ */}
      {detailsApt && (
        <AppointmentDetailsModal apt={detailsApt} onClose={() => setDetailsApt(null)} />
      )}
    </div>
  );
}
