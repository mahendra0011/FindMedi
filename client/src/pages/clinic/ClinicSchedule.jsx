import { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, Save, Plus, X, XCircle, Settings, CheckCircle, Info, Users, Coffee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';
import { toast } from 'sonner';
import ScheduleFieldHighlight, { formatFieldValue } from '@/components/ScheduleFieldHighlight';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function generateTimeSlots(startTime, endTime, slotDuration, breakTime = {}) {
  const slots = [];
  const toMins = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const startMins = toMins(startTime);
  const endMins = toMins(endTime);
  const breakStart = breakTime?.start ? toMins(breakTime.start) : null;
  const breakEnd = breakTime?.end ? toMins(breakTime.end) : null;
  if (startMins == null || endMins == null) return slots;

  let mins = startMins;
  while (mins < endMins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const hour = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const time = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    const slotEnd = mins + slotDuration;
    const inBreak = breakStart != null && breakEnd != null &&
      !(slotEnd <= breakStart || mins >= breakEnd);
    if (!inBreak) slots.push(time);
    mins += slotDuration;
  }
  return slots;
}

export default function ClinicSchedule({ adminMode, doctorId, requestMode, rejectedRequest, pendingRequest, latestRequest, onRequestCancelled, onRequestCreated, refreshTrigger }) {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Track dismissed reviewed request so highlights/banners hide after clicking "OK, Got it"
  const [dismissedRequestId, setDismissedRequestId] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [newLeave, setNewLeave] = useState('');
  const [slotDuration, setSlotDuration] = useState('15');
  const [bufferPerHour, setBufferPerHour] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakTime, setBreakTime] = useState({ start: '', end: '' });
  // Booking window: patients can book within X units from today
  const [bookingWindow, setBookingWindow] = useState({ unit: 'weeks', value: 2 });

  // Per-date disabled slots: { "2026-07-27": ["09:00 AM", ...] }
  const [dateDisabledSlots, setDateDisabledSlots] = useState({});
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  // Slots already booked by patients for the selected date (read-only)
  const [bookedSlots, setBookedSlots] = useState([]);

  const patientsPerHour = useMemo(() => Math.floor(60 / parseInt(slotDuration || 15)), [slotDuration]);
  const totalWorkingMinutes = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [startTime, endTime]);
  const totalSlots = useMemo(() => {
    if (!startTime || !endTime || !slotDuration) return 0;
    return generateTimeSlots(startTime, endTime, parseInt(slotDuration), breakTime).length;
  }, [startTime, endTime, slotDuration, breakTime]);

  // All slots (with break removed) for the grid display
  const allSlots = useMemo(() => {
    if (!startTime || !endTime || !slotDuration) return [];
    return generateTimeSlots(startTime, endTime, parseInt(slotDuration), breakTime);
  }, [startTime, endTime, slotDuration, breakTime]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let myDoc = null;
        if (adminMode && doctorId) {
          // Admin mode: load specific doctor by ID
          const doctors = (await api.getDoctors({ includeAll: 'true' }))?.data || [];
          myDoc = doctors.find(d => d._id === doctorId) || null;
        } else {
          // Clinic doctor mode: load own profile
          const doctors = (await api.getDoctors())?.data || [];
          myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        }
        if (myDoc) {
          setDoctor(myDoc);
          setSelectedSlots(myDoc.time_slots || []);
          setSchedule(myDoc.weekly_schedule || {});
          setLeaves(myDoc.leaves || []);
          setSlotDuration(String(myDoc.slotDuration || 15));
          setBufferPerHour(String(myDoc.bufferPerHour || 1));
          if (myDoc.workingHours) {
            setStartTime(myDoc.workingHours.start || '09:00');
            setEndTime(myDoc.workingHours.end || '17:00');
          }
          if (myDoc.breakTime) setBreakTime({ start: myDoc.breakTime.start || '', end: myDoc.breakTime.end || '' });
          if (myDoc.bookingWindow) setBookingWindow({ unit: myDoc.bookingWindow.unit || 'weeks', value: myDoc.bookingWindow.value ?? 2 });
          if (myDoc.dateDisabledSlots) setDateDisabledSlots(myDoc.dateDisabledSlots);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name, adminMode, doctorId, refreshTrigger]);

  // Keep selectedSlots in sync with generated slots
  useEffect(() => {
    setSelectedSlots(allSlots);
  }, [allSlots]);

  // Fetch already-booked slots for the selected date so we can show them as "Reserved"
  useEffect(() => {
    if (!doctor?._id || !selectedDate) { setBookedSlots([]); return; }
    api.getBookedSlots({ doctorId: doctor._id, date: selectedDate })
      .then(res => {
        if (res && typeof res === 'object' && !Array.isArray(res) && res.counts) {
          setBookedSlots(Object.keys(res.counts || {}));
        } else {
          setBookedSlots(Array.isArray(res) ? res : []);
        }
      })
      .catch(() => setBookedSlots([]));
  }, [doctor?._id, selectedDate]);

  const toggleDay = (day) => {
    setSchedule(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const addLeave = () => {
    if (newLeave && !leaves.includes(newLeave)) {
      setLeaves(prev => [...prev, newLeave]);
      setNewLeave('');
    }
  };

  const removeLeave = (date) => {
    setLeaves(prev => prev.filter(l => l !== date));
  };

  // Toggle a slot as disabled for the currently-selected date
  const toggleDateSlot = (slot) => {
    if (!selectedDate) { toast.error('Please pick a date first'); return; }
    setDateDisabledSlots(prev => {
      const current = prev[selectedDate] || [];
      const next = current.includes(slot)
        ? current.filter(s => s !== slot)
        : [...current, slot];
      return { ...prev, [selectedDate]: next };
    });
  };

  const clearDateDisabled = () => {
    if (!selectedDate) return;
    setDateDisabledSlots(prev => {
      const next = { ...prev };
      delete next[selectedDate];
      return next;
    });
  };

  // Build a per-field status map from the latest request (approved → blue, rejected → red).
  // Only relevant on the doctor's own page (requestMode), driven by latestRequest.
  // If the doctor already dismissed this request, hide all highlights.
  const fieldStatus = useMemo(() => {
    const map = {}; // { bookingWindow: 'approved'|'rejected', slotDuration: ... }
    if (!requestMode || !latestRequest) return map;
    if (dismissedRequestId === latestRequest._id) return map;
    const status = (latestRequest.status || '').toLowerCase();
    if (status !== 'approved' && status !== 'rejected') return map;
    const rc = latestRequest.requestedChanges || {};
    const applied = latestRequest.appliedFields || [];
    Object.keys(rc).forEach((key) => {
      if (rc[key] == null) return;
      if (status === 'approved') {
        map[key] = applied.includes(key) ? 'approved' : 'rejected';
      } else {
        map[key] = 'rejected';
      }
    });
    return map;
  }, [requestMode, latestRequest, dismissedRequestId]);

  const latestStatus = (latestRequest?.status || '').toLowerCase();
  const isPendingBlur = requestMode && latestStatus === 'pending';

  const handleCancelRequest = async () => {
    if (!latestRequest?._id) return;
    setCancelling(true);
    try {
      await api.cancelScheduleChangeRequest(latestRequest._id);
      toast.success('Change request cancelled');
      onRequestCancelled?.();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to cancel request');
    }
    setCancelling(false);
  };

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      const payload = {
        weekly_schedule: schedule,
        leaves,
        slotDuration: parseInt(slotDuration),
        bufferPerHour: parseInt(bufferPerHour),
        workingHours: { start: startTime, end: endTime },
        breakTime,
        dateDisabledSlots,
        bookingWindow,
      };

      if (requestMode) {
        // Doctor request flow — don't write directly, create a change request
        await api.createScheduleChangeRequest({ requestedChanges: payload });
        toast.success('Change request submitted — awaiting admin approval');
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
        // Reset dismissal so a fresh review cycle shows the banner/highlights again
        setDismissedRequestId(null);
        // Tell the wrapper to reload requests so the blur + cancel button appear immediately
        onRequestCreated?.();
      } else {
        // Direct save (admin / clinic_doctor)
        await api.updateDoctorSchedule(doctor._id, { time_slots: selectedSlots, ...payload });
        setSaved(true);
        toast.success('Schedule saved');
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to save schedule');
    }
    setSaving(false);
  };

  // Slots disabled for the selected date
  const selectedDateDisabled = selectedDate ? (dateDisabledSlots[selectedDate] || []) : [];

  // Slots pending disable (in a pending request but not yet live) for the selected date
  const pendingDateDisabled = useMemo(() => {
    if (!requestMode || !latestRequest || latestRequest.status !== 'Pending') return [];
    if (!selectedDate) return [];
    const pendingSlots = latestRequest.requestedChanges?.dateDisabledSlots?.[selectedDate] || [];
    const liveDisabled = new Set(selectedDateDisabled);
    return pendingSlots.filter(s => !liveDisabled.has(s));
  }, [requestMode, latestRequest, selectedDate, selectedDateDisabled]);

  const rangeFor = (slot) => {
    const m = slot?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return slot;
    let h = parseInt(m[1], 10) % 12; if (/PM/i.test(m[3])) h += 12;
    const mm = parseInt(m[2], 10);
    const endMins = h * 60 + mm + parseInt(slotDuration || 15);
    let eh = Math.floor(endMins / 60) % 24;
    let eMin = endMins % 60;
    let e12 = eh % 12; if (e12 === 0) e12 = 12;
    return `${m[1]}:${m[2]}–${e12}:${String(eMin).padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {adminMode && (
            <button onClick={() => window.history.back()} className="text-xs text-muted-foreground hover:text-primary mb-1 flex items-center gap-1">
              ← Back to doctors list
            </button>
          )}
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {adminMode ? `${doctor?.name || 'Doctor'}'s Schedule` : 'My Schedule & Availability'}
          </h1>
          <p className="text-muted-foreground">
            {requestMode
              ? 'Edit your schedule and request changes — admin will review'
              : adminMode
                ? `Managing schedule for ${doctor?.specialization || 'doctor'}`
                : 'Full control over your clinic timing and availability'}
          </p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Submitting...' : requestMode ? 'Request for Save' : 'Save Schedule'}
          {saved && <CheckCircle className="w-4 h-4 text-success" />}
        </Button>
      </div>

      {/* Rejection banner — shown when last request was rejected or partially applied */}
      {requestMode && rejectedRequest && dismissedRequestId !== rejectedRequest._id && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <Info className="w-4 h-4" /> Your last request was {rejectedRequest.status}
          </p>
          {rejectedRequest.rejectionNote && (
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">{rejectedRequest.rejectionNote}</p>
          )}
          {rejectedRequest.appliedFields?.length > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">
              ✓ Applied: {rejectedRequest.appliedFields.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Pending banner — shown when a request is awaiting review */}
      {requestMode && pendingRequest && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> A change request is pending admin review
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-1">
            Submitted on {pendingRequest.createdAt ? new Date(pendingRequest.createdAt).toLocaleDateString() : ''}. You'll be notified once reviewed.
          </p>
        </div>
      )}

      {/* Reviewed banner — shown after admin approves/rejects, dismissed by clicking "OK, Got it" */}
      {requestMode && latestRequest && dismissedRequestId !== latestRequest._id && (latestStatus === 'approved' || latestStatus === 'rejected') && (
        <div className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          latestStatus === 'approved'
            ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30'
            : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30'
        }`}>
          <div>
            <p className={`text-sm font-semibold flex items-center gap-2 ${
              latestStatus === 'approved' ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'
            }`}>
              {latestStatus === 'approved'
                ? <><CheckCircle className="w-4 h-4" /> Your schedule change request was approved</>
                : <><XCircle className="w-4 h-4" /> Your schedule change request was rejected</>
              }
            </p>
            {latestRequest.appliedFields?.length > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">
                ✓ Applied: {latestRequest.appliedFields.join(', ')}
              </p>
            )}
            {latestRequest.rejectionNote && (
              <p className={`text-xs mt-1 ${latestStatus === 'approved' ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-red-600/80 dark:text-red-400/80'}`}>
                {latestRequest.rejectionNote}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              See the highlighted changes below for details.
            </p>
          </div>
          <Button variant="outline" className="shrink-0 gap-2" onClick={() => setDismissedRequestId(latestRequest._id)}>
            <CheckCircle className="w-4 h-4" /> OK, Got it
          </Button>
        </div>
      )}

      {/* Editable schedule area — blurred while a request is pending, with a centered Cancel button */}
      <div className="relative">
        <div className={isPendingBlur ? 'pointer-events-none select-none blur-sm' : ''}>

      {/* Slot Settings */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Slot Settings
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Working Hours Start</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
            {fieldStatus.workingHours && (
              <ScheduleFieldHighlight
                status={fieldStatus.workingHours}
                label="Working Hours"
                oldText={formatFieldValue('workingHours', latestRequest?.oldValues?.workingHours)}
                newText={formatFieldValue('workingHours', latestRequest?.requestedChanges?.workingHours)}
              />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Working Hours End</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Consultation Duration (min)</label>
            <select value={slotDuration} onChange={e => setSlotDuration(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
            {fieldStatus.slotDuration && (
              <ScheduleFieldHighlight
                status={fieldStatus.slotDuration}
                label="Slot Duration"
                oldText={formatFieldValue('slotDuration', latestRequest?.oldValues?.slotDuration)}
                newText={formatFieldValue('slotDuration', latestRequest?.requestedChanges?.slotDuration)}
              />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Buffer Slots Per Hour</label>
            <select value={bufferPerHour} onChange={e => setBufferPerHour(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="0">0 (no buffer)</option>
              <option value="1">1 slot</option>
              <option value="2">2 slots</option>
            </select>
            {fieldStatus.bufferPerHour && (
              <ScheduleFieldHighlight
                status={fieldStatus.bufferPerHour}
                label="Buffer"
                oldText={formatFieldValue('bufferPerHour', latestRequest?.oldValues?.bufferPerHour)}
                newText={formatFieldValue('bufferPerHour', latestRequest?.requestedChanges?.bufferPerHour)}
              />
            )}
          </div>
        </div>

        {/* Break Time — slots in this range won't show anywhere */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
          <div className="sm:col-span-2 flex items-center gap-2 text-amber-700">
            <Coffee className="w-4 h-4" />
            <span className="text-xs font-semibold">Break Time (slots in this range won't show in booking)</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Break Start</label>
            <Input type="time" value={breakTime.start} onChange={e => setBreakTime(p => ({ ...p, start: e.target.value }))} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Break End</label>
            <Input type="time" value={breakTime.end} onChange={e => setBreakTime(p => ({ ...p, end: e.target.value }))} className="w-full" />
          </div>
          {fieldStatus.breakTime && (
            <div className="sm:col-span-4">
              <ScheduleFieldHighlight
                status={fieldStatus.breakTime}
                label="Break Time"
                oldText={formatFieldValue('breakTime', latestRequest?.oldValues?.breakTime)}
                newText={formatFieldValue('breakTime', latestRequest?.requestedChanges?.breakTime)}
              />
            </div>
          )}
        </div>

        {/* Booking Window — restrict how far in advance patients can book */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="sm:col-span-2 flex items-center gap-2 text-primary">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold">Booking Window (patients can only book within this range from today)</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Window Length</label>
            <Input type="number" min={0} value={bookingWindow.value} onChange={e => setBookingWindow(p => ({ ...p, value: Number(e.target.value) || 0 }))} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
            <select value={bookingWindow.unit} onChange={e => setBookingWindow(p => ({ ...p, unit: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          {fieldStatus.bookingWindow && (
            <div className="sm:col-span-4">
              <ScheduleFieldHighlight
                status={fieldStatus.bookingWindow}
                label="Booking Window"
                oldText={formatFieldValue('bookingWindow', latestRequest?.oldValues?.bookingWindow)}
                newText={formatFieldValue('bookingWindow', latestRequest?.requestedChanges?.bookingWindow)}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
          <span><strong className="text-foreground">{patientsPerHour}</strong> patients/hour</span>
          <span><strong className="text-foreground">{totalWorkingMinutes}</strong> min working time</span>
          <span><strong className="text-foreground">{totalSlots}</strong> total slots</span>
        </div>
      </div>

      {/* Time Slots Grid — with per-date disable */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Time Slots
            </h2>
            {/* Date picker + selected date right next to the heading */}
            <div className="flex items-center gap-2">
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-8 text-xs" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {(() => {
                  const d = new Date(selectedDate + 'T00:00:00');
                  const dd = String(d.getDate()).padStart(2, '0');
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const yy = d.getFullYear();
                  return `${dd}-${mm}-${yy}`;
                })()}
              </span>
              {selectedDateDisabled.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                  {selectedDateDisabled.length} disabled
                </Badge>
              )}
              {selectedDateDisabled.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearDateDisabled} className="text-destructive h-7 px-2 text-xs">
                  <X className="w-3 h-3" /> Clear
                </Button>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{allSlots.length} slots total</span>
        </div>

        {allSlots.length > 0 ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {allSlots.map(slot => {
                const isReserved = bookedSlots.includes(slot);
                const isDisabled = selectedDateDisabled.includes(slot);
                const isPending = pendingDateDisabled.includes(slot);
                // Reserved slots are read-only — no toggle, no click
                if (isReserved) {
                  return (
                    <div key={slot}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-center bg-gray-900 text-white border border-gray-800 shadow-sm opacity-90 cursor-not-allowed">
                      <span className="block">{rangeFor(slot)}</span>
                      <span className="block text-[9px] font-normal opacity-80">Booked</span>
                    </div>
                  );
                }
                return (
                  <button key={slot} onClick={() => toggleDateSlot(slot)}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 ${
                      isDisabled
                        ? 'bg-red-100 text-red-600 border border-red-300 shadow-sm'
                        : isPending
                        ? 'bg-red-100 text-red-700 border border-red-300 shadow-sm'
                        : 'bg-primary text-primary-foreground shadow-md'
                    }`}>
                    <span className="block">{rangeFor(slot)}</span>
                    {isPending && <span className="block text-[9px] font-normal">Pending</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-primary" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-red-100 border border-red-300" /> Disabled for this date only
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Pending (awaiting admin approval)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-gray-900" /> Booked (already reserved)
              </span>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Set working hours and duration above to auto-generate slots</p>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Weekly Working Days
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {days.map(day => (
            <button key={day} onClick={() => toggleDay(day)}
              className={`p-4 rounded-xl text-center transition-all border-2 ${schedule[day] ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}>
              <p className="font-semibold capitalize text-sm">{day}</p>
              <p className="text-xs mt-1 opacity-70">{schedule[day] ? 'Available' : 'Off'}</p>
            </button>
          ))}
        </div>
        {fieldStatus.weekly_schedule && (
          <div className="mt-3">
            <ScheduleFieldHighlight
              status={fieldStatus.weekly_schedule}
              label="Weekly Schedule"
              oldText={formatFieldValue('weekly_schedule', latestRequest?.oldValues?.weekly_schedule)}
              newText={formatFieldValue('weekly_schedule', latestRequest?.requestedChanges?.weekly_schedule)}
            />
          </div>
        )}
      </div>

      {/* Leaves / Holidays */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Holidays & Time-off
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input type="date" value={newLeave} onChange={e => setNewLeave(e.target.value)} className="sm:max-w-xs" />
          <Button onClick={addLeave} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays marked</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaves.map(leave => (
              <span key={leave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {leave}
                <button onClick={() => removeLeave(leave)} className="hover:text-destructive/70"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
        {fieldStatus.leaves && (
          <div className="mt-3">
            <ScheduleFieldHighlight
              status={fieldStatus.leaves}
              label="Leaves"
              oldText={formatFieldValue('leaves', latestRequest?.oldValues?.leaves)}
              newText={formatFieldValue('leaves', latestRequest?.requestedChanges?.leaves)}
            />
          </div>
        )}
        {fieldStatus.dateDisabledSlots && (
          <div className="mt-2">
            <ScheduleFieldHighlight
              status={fieldStatus.dateDisabledSlots}
              label="Date Disabled Slots"
              oldText={formatFieldValue('dateDisabledSlots', latestRequest?.oldValues?.dateDisabledSlots)}
              newText={formatFieldValue('dateDisabledSlots', latestRequest?.requestedChanges?.dateDisabledSlots)}
            />
          </div>
        )}
      </div>
        </div>{/* end blur wrapper */}

        {/* Centered Cancel Request overlay (only while pending) */}
        {isPendingBlur && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-24">
            <div className="bg-card border border-amber-300 shadow-2xl rounded-2xl p-6 max-w-sm w-[90%] text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground mb-1">Request Pending Review</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your schedule change request is awaiting admin approval. Editing is locked until it's reviewed.
              </p>
              <Button variant="destructive" className="w-full gap-2" onClick={handleCancelRequest} disabled={cancelling}>
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                {cancelling ? 'Cancelling...' : 'Cancel Request'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
