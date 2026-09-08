import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays, CheckCircle, XCircle, FileText, IndianRupee, Plus,
  CalendarClock, FileCheck, ChevronLeft, ChevronRight, RefreshCw,
  Video, MessageSquare, Clock, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import TodayAppointmentsSection from '@/components/TodayAppointmentsSection';
import AppointmentHistorySection from '@/components/AppointmentHistorySection';
import ApproveAppointmentSection from '@/components/ApproveAppointmentSection';
import AppointmentDetailsModal from '@/components/AppointmentDetailsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAppointmentRealtime } from '@/lib/useAppointmentRealtime';

const initialPrescriptionData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

function isOnlineMode(appt) {
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  return mode === 'chat' || mode === 'video' || mode === 'voice' || mode === 'audio' || type.includes('chat') || type.includes('video') || type.includes('voice') || type.includes('audio');
}

export default function DoctorOnlineAppointments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'today' | 'complete'
  const [appointments, setAppointments] = useState([]);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [loading, setLoading] = useState(true);
  const [detailsApt, setDetailsApt] = useState(null);

  // Prescription modal states
  const [completeId, setCompleteId] = useState(null);
  const [prescriptionData, setPrescriptionData] = useState(initialPrescriptionData);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const loadAppointments = useCallback(async (searchParams = {}) => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ status: 'All', limit: 200, ...searchParams });
      const all = data?.appointments || data?.data || data || [];
      setAppointments(all.filter(isOnlineMode));
    } catch (e) {
      const status = e?.status || e?.response?.status;
      if (status && status !== 503) toast.error('Failed to load online appointments');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);
  useAppointmentRealtime(loadAppointments);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') loadAppointments();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAppointments]);

  const today = getISTDateString();
  const pendingAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'pending');
  const todayAppointments = appointments.filter(a => a.date === today);
  const completeAppointments = appointments.filter(a => (a.status || '').toLowerCase() === 'completed');

  const handleStatus = async (id, status, extra = {}) => {
    try {
      await api.updateAppointment(id, { status, ...extra });
      toast.success('Appointment updated');
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update appointment');
    }
  };

  const openPrescription = useCallback((apt) => {
    setCompleteId(apt._id);
    setPrescriptionData({
      ...initialPrescriptionData,
      patientName: apt.patient,
      doctorName: user?.name,
      specialization: user?.specialization || '',
    });
    setShowPrescriptionModal(true);
  }, [user?.name, user?.specialization]);

  useEffect(() => {
    const handler = (e) => openPrescription(e.detail);
    window.addEventListener('open-prescription', handler);
    return () => window.removeEventListener('open-prescription', handler);
  }, [openPrescription]);

  const addMedication = () => {
    setPrescriptionData({
      ...prescriptionData,
      medications: [...prescriptionData.medications, { name: '', dosage: '', frequency: '', instructions: '' }],
    });
  };

  const removeMedication = (index) => {
    setPrescriptionData({
      ...prescriptionData,
      medications: prescriptionData.medications.filter((_, i) => i !== index),
    });
  };

  const updateMedication = (index, field, value) => {
    const meds = [...prescriptionData.medications];
    meds[index][field] = value;
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
        prescription: meds.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? '(' + m.instructions + ')' : ''}`).join('\n'),
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
      await api.createNotification({
        title: 'New Online Prescription',
        message: `Dr. ${user?.name} has generated your prescription`,
        type: 'records',
        userId: apt.patientId || apt.patient,
      });
      toast.success('Prescription generated successfully');
      setShowPrescriptionModal(false);
      loadAppointments();
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate prescription');
    }
  };

  // Calendar widget
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
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Online Consultations</p>
                <p className="font-heading text-base font-bold text-foreground leading-tight">{dayName}</p>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-bold text-primary leading-none">{todayAppts.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Today Online</p>
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
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Done {completed}
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

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-1.5 h-6 rounded-full bg-primary" />
          <h2 className="text-xl font-bold text-foreground">
          {activeTab === 'pending' ? 'Pending Requests' : activeTab === 'complete' ? 'Completed History' : 'Online Appointments'}
          </h2>
        </div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {activeTab === 'pending' ? 'Pending Requests' : activeTab === 'complete' ? 'Completed History' : 'Online Appointments'}
        </h3>
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
        {Array.from({ length: getFirstDay(calDate) }).map((_, i) => <div key={'e-' + i} />)}
        {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasAppts = activeTab === 'pending'
            ? pendingAppointments.some(a => a.date === dateStr)
            : appointments.some(a => a.date === dateStr);
          const count = activeTab === 'pending'
            ? pendingAppointments.filter(a => a.date === dateStr).length
            : 0;
          return (
            <button key={day} onClick={() => setSelectedDate(dateStr)}
              className={`relative w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30' : 'text-foreground hover:bg-muted/70'}`}
            >
              {day}
              {activeTab === 'pending'
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
      {/* Top Bar with Title + 3 Switch Buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center border border-blue-500/30 shadow-sm">
            <Video className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
              Online Appointments
              {activeTab === 'pending' && pendingAppointments.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600">
                  {pendingAppointments.length} pending
                </span>
              )}
              {activeTab === 'today' && todayAppointments.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {todayAppointments.length} today
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'pending' ? 'Review & approve incoming chat and video call requests' : activeTab === 'today' ? "Today's scheduled chat & video consultations" : 'Completed online consultation history'}
            </p>
          </div>
        </div>

        {/* ── 3 Switch Buttons (Pending / Today / Complete) ── */}
        <div className="flex items-center bg-muted/60 p-1 rounded-full border border-border/60 gap-1 shadow-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending
            {pendingAppointments.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'}`}>
                {pendingAppointments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeTab === 'today'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Today
            {todayAppointments.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'}`}>
                {todayAppointments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('complete')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeTab === 'complete'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
            {completeAppointments.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'complete' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-600'}`}>
                {completeAppointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Render based on Active Tab */}
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
      ) : activeTab === 'pending' ? (
        /* ════════ PENDING VIEW (Approve / Reject Online Requests) ════════ */
        <ApproveAppointmentSection
          appointments={appointments}
          onConfirm={(a) => handleStatus(a._id, 'Confirmed')}
          onReject={(a, reason) => handleStatus(a._id, 'Cancelled', { notes: reason })}
        />
      ) : activeTab === 'today' ? (
        /* ════════ TODAY VIEW (Today Online Consultations + Join Call / Chat) ════════ */
        <TodayAppointmentsSection
          appointments={appointments}
          selectedDate={selectedDate}
          calendar={CalendarWidget}
          onRefresh={loadAppointments}
          user={user}
          onViewDetails={(a) => setDetailsApt(a)}
        />
      ) : (
        /* ════════ COMPLETE VIEW (Online Appointment History) ════════ */
        <AppointmentHistorySection appointments={appointments} />
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <Dialog open={showPrescriptionModal} onOpenChange={setShowPrescriptionModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Write Online Prescription
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Patient Name</Label>
                  <Input value={prescriptionData.patientName} readOnly className="bg-muted text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Diagnosis *</Label>
                  <Input
                    placeholder="e.g. Acute Bronchitis"
                    value={prescriptionData.diagnosis}
                    onChange={e => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Chief Complaints</Label>
                <Input
                  placeholder="e.g. Fever, Cough for 3 days"
                  value={prescriptionData.chiefComplaints}
                  onChange={e => setPrescriptionData({ ...prescriptionData, chiefComplaints: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold">Medications</Label>
                  <Button type="button" size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={addMedication}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                {prescriptionData.medications.map((med, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 mb-2 items-center">
                    <Input placeholder="Medicine" value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} className="col-span-4 text-xs h-8" />
                    <Input placeholder="Dosage" value={med.dosage} onChange={e => updateMedication(i, 'dosage', e.target.value)} className="col-span-3 text-xs h-8" />
                    <Input placeholder="Freq" value={med.frequency} onChange={e => updateMedication(i, 'frequency', e.target.value)} className="col-span-2 text-xs h-8" />
                    <Input placeholder="Notes" value={med.instructions} onChange={e => updateMedication(i, 'instructions', e.target.value)} className="col-span-2 text-xs h-8" />
                    <Button type="button" size="sm" variant="ghost" className="col-span-1 h-8 w-8 p-0 text-destructive" onClick={() => removeMedication(i)}>
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Advice / Instructions</Label>
                  <Input placeholder="Drink warm water, rest" value={prescriptionData.advice} onChange={e => setPrescriptionData({ ...prescriptionData, advice: e.target.value })} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Follow-up</Label>
                  <Input placeholder="After 5 days" value={prescriptionData.followUp} onChange={e => setPrescriptionData({ ...prescriptionData, followUp: e.target.value })} className="text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowPrescriptionModal(false)}>Cancel</Button>
                <Button size="sm" onClick={handleGeneratePrescription}>Save & Send Prescription</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Appointment Details Modal */}
      {detailsApt && (
        <AppointmentDetailsModal
          appointment={detailsApt}
          isOpen={!!detailsApt}
          onClose={() => setDetailsApt(null)}
          onRefresh={loadAppointments}
        />
      )}
    </div>
  );
}
