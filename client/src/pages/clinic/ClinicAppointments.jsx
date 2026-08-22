import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  CheckCircle, XCircle, Send, Plus, X,
  ChevronLeft, ChevronRight, CalendarClock, FileCheck, FileText, Clock,
  RefreshCw, IndianRupee, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api, downloadInvoicePdf, resolveFileUrl, isValidFileUrl } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import TodayAppointmentsSection from '@/components/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/AppointmentHistorySection';
import { CompletedCard } from '@/components/TodayAppointmentsSection';
import { subSlotFor } from '@/lib/timeSlots';
import WalkInPatientForm from '@/components/WalkInPatientForm';
import ApproveAppointmentSection from '@/components/ApproveAppointmentSection';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';

const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

const prescriptionInitialState = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

export default function ClinicAppointments() {
  const { user } = useAuth();
  const location = useLocation();
  const mode = location.pathname.endsWith('/approve') ? 'approve' : location.pathname.endsWith('/history') ? 'history' : 'today';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState([]);
  const [completeId, setCompleteId] = useState(null);
  const [billAmount, setBillAmount] = useState(500);
  const [billModal, setBillModal] = useState(false);
  const [detailsApt, setDetailsApt] = useState(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);

  // Prescription modal state
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState(prescriptionInitialState);

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

  const openPrescriptionModal = useCallback((apt) => {
    setCompleteId(apt._id);
    setPrescriptionData({
      ...prescriptionInitialState,
      patientName: apt.patient,
      doctorName: user?.name,
      specialization: user?.specialization || '',    });
    setShowPrescriptionModal(true);
  }, [user?.name, user?.specialization]);

  // Listen for "Write Prescription" from TodayAppointmentsSection
  useEffect(() => {
    const handler = (e) => openPrescriptionModal(e.detail);
    window.addEventListener('open-prescription', handler);
    return () => window.removeEventListener('open-prescription', handler);
  }, [openPrescriptionModal]);

  const addMedication = () => {
    setPrescriptionData({ ...prescriptionData, medications: [...prescriptionData.medications, { name: '', dosage: '', frequency: '', instructions: '' }] });
  };
  const removeMedication = (index) => {
    setPrescriptionData({ ...prescriptionData, medications: prescriptionData.medications.filter((_, i) => i !== index) });
  };
  const updateMedication = (index, field, value) => {
    const meds = [...prescriptionData.medications]; meds[index][field] = value;
    setPrescriptionData({ ...prescriptionData, medications: meds });
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
      setShowPrescriptionModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate prescription'); }
  };

  const handleGenerateBill = async () => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    try {
      await api.createBill({
        patient: apt.patient,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: user?.name,
        service: `${apt.type} - ${apt.department || 'Clinic'}`,
        amount: billAmount,
        date: getISTDateString(),
        status: 'Confirmed',
      });
      await api.createNotification({
        title: 'New Invoice',
        message: `Invoice of ₹${billAmount} generated for ${apt.patient}`,
        type: 'payment',
        userId: apt.patientId || apt.patient,
      });
      await api.updateAppointment(completeId, { status: 'Completed' });
      setBillModal(false);
      setCompleteId(null);
      loadAppointments();
    } catch (e) { console.error(e); }
  };

  const handleDownloadPrescription = async (apt) => {
    try {
      const pid = apt.patientId?._id || apt.patientId;
      const res = await api.getPatientRecords(pid);
      const recs = res?.records || res?.data || res || [];
      const rx = recs.find(r => r.type === 'prescription');
      if (!rx) { toast.info('No prescription record found'); return; }
      toast.success('Opening prescription…');
      const att = rx.attachments?.[0];
      if (att?.url) {
        window.open(resolveFileUrl(att.url), '_blank');
      } else {
        toast.message(`Prescription: ${rx.diagnosis || 'N/A'}`, {
          description: (rx.prescription || '').slice(0, 120),
        });
      }
    } catch (e) { console.error(e); toast.error('Failed to load prescription'); }
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
            {mode === 'approve' ? 'Pending Requests' : 'Appointments Overview'}
          </h3>
          {mode === 'approve' && pendingAppointments.length > 0 && (
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
          const hasAppts = mode === 'approve'
            ? pendingAppointments.some(a => a.date === dateStr)
            : appointments.some(a => a.date === dateStr);
          const count = mode === 'approve'
            ? pendingAppointments.filter(a => a.date === dateStr).length
            : 0;
          return (
            <button key={day} onClick={() => setSelectedDate(dateStr)}
              className={`relative w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all
                ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30' : 'text-foreground hover:bg-muted/70'}`}
            >
              {day}
              {mode === 'approve'
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
          {mode === 'approve'
            ? <><FileCheck className="w-6 h-6 text-primary" /> Approve Appointments</>
            : <><CalendarClock className="w-6 h-6 text-primary" /> Today Appointments</>
          }
          {mode === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">{pendingAppointments.length} pending</span>
          )}
          {mode === 'today' && todayAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">{todayAppointments.length} today</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'approve'
            ? 'Review and confirm pending appointment requests'
            : 'All appointments scheduled for today'}
        </p>
        <div className="bg-muted p-1 rounded-2xl flex items-center shrink-0">
            <Link to="/clinic/appointments">
              <button className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${mode === 'today' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Today
              </button>
            </Link>
            <Link to="/clinic/appointments/approve">
              <button className={`px-4 py-2 text-sm font-bold rounded-xl transition-all relative ${mode === 'approve' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Approve
                {pendingAppointments.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-background" />
                )}
              </button>
            </Link>
            <Link to="/clinic/appointments/history">
              <button className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${mode === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                History
              </button>
            </Link>
          </div>
          {mode === 'today' && (
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
            <h3 className="font-heading text-xl font-bold text-foreground">
              Search Results
            </h3>
            <span className="text-sm text-muted-foreground">{appointments.length} found</span>
          </div>
          {appointments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground shadow-sm">
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p>No results found for "{searchTerm}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {appointments.map((apt) => (
                <div key={apt._id}>
                  <CompletedCard
                    apt={apt}
                    onRevert={(a) => handleStatus(a._id, 'Confirmed')}
                    onDownloadPrescription={handleDownloadPrescription}
                    onDownloadInvoice={(a) => a.invoiceId && downloadInvoicePdf(a.invoiceId, `invoice-${a.patient}.pdf`)}
                    onViewDetails={(a) => setDetailsApt(a)}
                    onViewFile={(url) => {
                      if (!isValidFileUrl(url)) { toast.error('File unavailable — upload was not completed. Ask the patient to re-upload it.'); return; }
                      window.open(resolveFileUrl(url), '_blank');
                    }}
                    subSlotFor={subSlotFor}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : mode === 'today' ? (
        <TodayAppointmentsSection
          appointments={appointments}
          selectedDate={selectedDate}
          calendar={CalendarWidget}
          onRefresh={loadAppointments}
          user={user}
          onViewDetails={(a) => setDetailsApt(a)}
        />
      ) : mode === 'history' ? (
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
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPrescriptionModal(false)}>
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
                <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-foreground">Medications</label><Button type="button" size="sm" variant="outline" className="gap-1" onClick={addMedication}><Plus className="w-3 h-3" /> Add Medication</Button></div>
                {prescriptionData.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication(idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={e => updateMedication(idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={e => updateMedication(idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-28" />
                    <Input value={med.instructions} onChange={e => updateMedication(idx, 'instructions', e.target.value)} placeholder="Instructions" className="flex-1" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMedication(idx)}><X className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label><Input value={prescriptionData.advice} onChange={e => setPrescriptionData({ ...prescriptionData, advice: e.target.value })} placeholder="Advice for patient" /></div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label><Input value={prescriptionData.followUp} onChange={e => setPrescriptionData({ ...prescriptionData, followUp: e.target.value })} placeholder="Follow-up date" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowPrescriptionModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGeneratePrescription} disabled={!prescriptionData.diagnosis}><Send className="w-4 h-4" /> Generate & Send</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ════════ Complete & Bill Modal ════════ */}
      {billModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBillModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Complete & Generate Bill</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Service</label>
                <Input value={appointments.find(a => a._id === completeId)?.type || 'Consultation'} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (Rs)</label>
                <Input type="number" value={billAmount} onChange={e => setBillAmount(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setBillModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateBill}><Send className="w-4 h-4" /> Generate Bill</Button>
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
