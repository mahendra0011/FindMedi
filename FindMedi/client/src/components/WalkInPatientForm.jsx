import { useEffect, useMemo, useState } from 'react';
import { User, Clock, ChevronRight, ArrowLeft, Send, CalendarDays, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getISTDateString } from '@/lib/dateUtils';
import { getSubSlotsForHour, parseTime } from '@/lib/timeSlots';
import IntakeFormStep from './IntakeFormStep';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genders = ['Male', 'Female', 'Other'];

const emptyForm = { name: '', age: '', gender: 'Male', phone: '', email: '', bloodGroup: '', address: '' };

const initialIntakeForm = {
  chiefComplaint: '', chiefComplaintOther: '', symptomsDuration: '',
  pastMedicalHistory: { hasHistory: null, details: '' },
  currentTreatment: { hasPastTreatment: null, doctorName: '', cityState: '', when: '', prescriptionFile: '', takingMedicines: null },
  testReports: { hasReports: null, reportFile: '' },
  currentMedications: { hasMedications: null, details: '' },
  allergies: { hasAllergies: null, details: '' },
  familyHistory: { hasHistory: null, details: '' },
};

/**
 * Walk-in booking wizard — flow & UI match BookingModal (real-time schedule,
 * booked-slot statuses, intake form).
 *
 * Step 1 — Slot Selection: doctor card + date + hour dropdown + sub-slot grid
 * Step 2 — Patient Details
 * Step 3 — Patient Intake Form
 *
 * Props:
 *  - timeSlots:        string[] — fallback slots (real source: doctor schedule)
 *  - onPatientCreated: fn() — called after a successful booking
 */
export default function WalkInPatientForm({ timeSlots, onPatientCreated }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(getISTDateString());
  const [bookingTime, setBookingTime] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [notes, setNotes] = useState('');
  const [slotCounts, setSlotCounts] = useState({});
  const [fullSlots, setFullSlots] = useState([]);
  const [dateDisabledSlots, setDateDisabledSlots] = useState([]);
  const [pendingDisabledSlots, setPendingDisabledSlots] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [intakeForm, setIntakeForm] = useState(initialIntakeForm);
  const [creating, setCreating] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const doctorId = user?.doctorProfileId || null;

  // Doctor profile fetch — real schedule (time_slots), fee, slotDuration
  const [doctorProfile, setDoctorProfile] = useState(null);
  useEffect(() => {
    if (!doctorId) return;
    api.getDoctor(doctorId)
      .then(res => setDoctorProfile(res?.data || res))
      .catch(() => setDoctorProfile(null));
  }, [doctorId]);

  const consultationFee = Number(doctorProfile?.consultation_fees) || Number(user?.consultationFee) || Number(user?.fees) || 0;
  const slotDuration = Number(doctorProfile?.slotDuration) || user?.slotDuration || 15;

  // Booked/disabled slots fetch for this doctor + date (real-time)
  useEffect(() => {
    if (!doctorId || !date) { setSlotCounts({}); setFullSlots([]); setDateDisabledSlots([]); setPendingDisabledSlots([]); return; }
    api.getBookedSlots({ doctorId, date })
      .then(res => {
        if (res && typeof res === 'object' && !Array.isArray(res) && res.counts) {
          setSlotCounts(res.counts || {});
          setFullSlots(res.fullSlots || Object.keys(res.counts || {}));
          setDateDisabledSlots(res.dateDisabled || []);
          setPendingDisabledSlots(res.pendingDisabledSlots || []);
        } else {
          const arr = Array.isArray(res) ? res : [];
          setFullSlots(arr);
          const counts = {};
          arr.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
          setSlotCounts(counts);
          setDateDisabledSlots([]);
          setPendingDisabledSlots([]);
        }
      })
      .catch(() => { setSlotCounts({}); setFullSlots([]); setDateDisabledSlots([]); setPendingDisabledSlots([]); });
  }, [doctorId, date]);

  // ─── Slot helpers (same as BookingModal) ───
  const slotToMinutes = (t) => {
    const m = t?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (/PM/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
  };

  const minutesToSlot = (mins) => {
    let h = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  const minutesToShort = (mins) => {
    let h = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')}`;
  };

  const isSlotDisabled = (slotStr) => dateDisabledSlots.includes(slotStr);
  const isSlotPendingUpdate = (slotStr) => pendingDisabledSlots.includes(slotStr);
  const isSlotFull = (time) => (slotCounts[time] || 0) >= 1;

  // Real-time hours: doctor schedule (time_slots) se, fallback = prop
  const hourGroups = useMemo(() => {
    const source = (doctorProfile?.time_slots?.length ? doctorProfile.time_slots : timeSlots) || [];
    const enabledHours = new Set();
    source.forEach(t => {
      const { hour } = parseTime(t);
      if (hour != null) enabledHours.add(hour);
    });
    const groups = {};
    [...enabledHours].sort((a, b) => a - b).forEach(h => {
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const key = `${h12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
      groups[key] = getSubSlotsForHour(key).map(sub => {
        const start = sub.split('-')[0];
        const [sh, sm] = start.split(':');
        const sh12 = Number(sh) % 12 === 0 ? 12 : Number(sh) % 12;
        return `${sh12}:${sm} ${h >= 12 ? 'PM' : 'AM'}`;
      });
    });
    return Object.entries(groups);
  }, [doctorProfile?.time_slots, timeSlots]);

  const rangeFor = (slotStr) => {
    const start = slotToMinutes(slotStr);
    if (start == null) return slotStr;
    return `${minutesToShort(start)}–${minutesToShort(start + slotDuration)}`;
  };

  const fullRangeFor = (slotStr) => {
    const start = slotToMinutes(slotStr);
    if (start == null) return slotStr;
    return `${minutesToSlot(start)} – ${minutesToSlot(start + slotDuration)}`;
  };

  const goToIntake = () => {
    if (!form.name) {
      toast.error('Please fill in Full Name');
      return;
    }
    if (!form.phone && !form.email) {
      toast.error('Please fill in Phone or Email');
      return;
    }
    setStep(3);
  };

  const handleRegister = async () => {
    if (!intakeForm.chiefComplaint) {
      toast.error('Please select your chief complaint or main symptom');
      return;
    }
    setCreating(true);
    try {
      const res = await api.walkInAppointment({
        patient: { ...form, age: form.age ? Number(form.age) : 0 },
        doctor: user?.name || '',
        department: user?.department || 'General',
        date,
        time: bookingTime,
        type: 'Consultation',
        symptoms: intakeForm.chiefComplaint,
        notes,
      });
      const apptId = res?.appointment?._id || res?._id;
      if (apptId) {
        try {
          await api.submitIntakeForm(apptId, {
            chiefComplaint: intakeForm.chiefComplaint,
            chiefComplaintOther: intakeForm.chiefComplaintOther,
            symptomsDuration: intakeForm.symptomsDuration,
            pastMedicalHistory: intakeForm.pastMedicalHistory,
            currentTreatment: intakeForm.currentTreatment,
            testReports: intakeForm.testReports,
            currentMedications: intakeForm.currentMedications,
            allergies: intakeForm.allergies,
            familyHistory: intakeForm.familyHistory,
          });
        } catch (e) { console.error('Intake save failed:', e); }
      }
      toast.success(res?.duplicate
        ? `Walk-in "${form.name}" already booked for ${bookingTime}`
        : `Walk-in "${form.name}" booked for ${bookingTime}`);
      setForm(emptyForm);
      setIntakeForm(initialIntakeForm);
      setBookingTime('');
      setSelectedHour('');
      setNotes('');
      setStep(1);
      onPatientCreated?.();
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Failed to book walk-in');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {step === 1 && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Book Walk-in Appointment
            </DialogTitle>
            <DialogDescription>
              Walk-in booking for {user?.name || 'this facility'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Doctor card */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-xs">{user?.name?.split(' ')?.map(n => n?.[0])?.join('')?.slice(0, 2) || 'DR'}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground text-sm truncate">{user?.name}</h3>
                <p className="text-xs text-primary">{user?.specialization || 'Doctor'}</p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <BadgeCheck className="w-3 h-3 text-emerald-500" /> Walk-in confirmed immediately
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 text-center">
                <p className="text-[11px] text-muted-foreground mb-0.5">Consultation Fee</p>
                <p className="font-bold text-sm text-primary">₹{consultationFee}</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 text-center">
                <p className="text-[11px] text-muted-foreground mb-0.5">Avg Treatment Time</p>
                <p className="font-semibold text-xs text-emerald-600">{slotDuration} mins</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Select Date</label>
              <Input type="date" className="w-full" value={date} onChange={e => setDate(e.target.value)} min={getISTDateString()} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Select Time Slot</label>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3" /> Avg {slotDuration} mins
                </span>
              </div>

              {/* Step A: Hour selector dropdown */}
              <select value={selectedHour || ''} onChange={e => { setSelectedHour(e.target.value); setBookingTime(''); }} className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm">
                <option value="">Choose hour</option>
                {hourGroups.map(([hourLabel, hourSlots]) => {
                  const allUnavailable = hourSlots.every(s => isSlotFull(s) || isSlotDisabled(s) || isSlotPendingUpdate(s));
                  return (
                    <option key={hourLabel} value={hourLabel} disabled={allUnavailable}>
                      {hourLabel}{allUnavailable ? ' (Full)' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Step B: Sub-slot boxes for selected hour */}
              {selectedHour && (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    {(() => {
                      const hs = hourGroups.find(([h]) => h === selectedHour)?.[1] || [];
                      const unavailableCount = hs.filter(s => isSlotFull(s) || isSlotDisabled(s) || isSlotPendingUpdate(s)).length;
                      return `${hs.length - unavailableCount} of ${hs.length} slots available in ${selectedHour}`;
                    })()}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {(hourGroups.find(([h]) => h === selectedHour)?.[1] || []).map(t => {
                      const disabled = isSlotDisabled(t);
                      const pendingUpdate = isSlotPendingUpdate(t);
                      const full = isSlotFull(t);
                      const unavailable = disabled || full || pendingUpdate;
                      const selected = bookingTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={unavailable}
                          onClick={() => setBookingTime(t)}
                          className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg border text-center transition-all ${
                            selected
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : unavailable
                              ? 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed'
                              : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5'
                          }`}
                        >
                          <span className="text-xs font-semibold">{rangeFor(t)}</span>
                          <span className={`text-[9px] leading-none ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {disabled ? 'Not Available (Disabled)' : pendingUpdate ? 'Pending — may not be available' : full ? 'Booked' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected slot confirmation pill with full range */}
              {bookingTime && (
                <div className="flex items-center gap-2 text-xs mt-1">
                  <div className={`px-2 py-1 rounded-md ${isSlotFull(bookingTime) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {isSlotFull(bookingTime) ? '⚠️ This slot is full' : '✅ Slot Available'}
                  </div>
                  <div className="px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                    {fullRangeFor(bookingTime)}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific concerns…" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="w-full" disabled={!date || !bookingTime || creating} onClick={() => { setStep(2); }}>
              Next: Patient Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DialogFooter>
        </>
      )}

      {step === 2 && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setStep(1)} disabled={creating}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Patient Details
            </DialogTitle>
            <DialogDescription>
              {date} · {fullRangeFor(bookingTime)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {/* Booking summary pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 text-xs text-primary font-medium">
              <CalendarDays className="w-4 h-4 shrink-0" />
              {getISTDateString() === date ? 'Today' : date} · {fullRangeFor(bookingTime)}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo placeholder + Full Name (same row) */}
              <div className="sm:col-span-2 flex items-end gap-3">
                <div className="w-16 h-20 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter patient full name" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Age</label>
                <Input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age" min={0} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)}
                  className="w-full h-10 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email address" />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Blood Group</label>
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}
                  className="w-full h-10 px-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select</option>
                  {bloodGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setStep(1)} disabled={creating}>Back</Button>
            <Button size="sm" onClick={goToIntake} disabled={creating || !form.name || (!form.phone && !form.email)}>
              Next: Intake Form <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DialogFooter>
        </>
      )}

      {step === 3 && (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setStep(2)} disabled={creating}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Patient Intake Form
            </DialogTitle>
            <DialogDescription>
              Please provide some details before we proceed
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <IntakeFormStep formData={intakeForm} setFormData={setIntakeForm} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setStep(2)} disabled={creating}>Back</Button>
            <Button size="sm" onClick={handleRegister} disabled={creating || !intakeForm.chiefComplaint}>
              {creating ? 'Booking…' : <><Send className="w-3.5 h-3.5 mr-1" /> Book Walk-in Appointment</>}
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}
