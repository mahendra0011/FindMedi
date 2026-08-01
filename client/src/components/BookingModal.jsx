import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeCheck, CalendarDays, CheckCircle, CheckCircle2, ChevronRight, CreditCard, Landmark, Smartphone, Wallet, ArrowLeft, Users, FileDown, Clock, User, UserPlus, Heart, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BillCheckout from './BillCheckout';
import { api, downloadPaymentInvoice, downloadBillPdf } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import IntakeFormStep from './IntakeFormStep';

export default function BookingModal({
  open,
  onOpenChange,
  doctor,
  facility,
  onSuccess,
}) {
  const [bookingStep, setBookingStep] = useState(doctor ? 0 : -1);
  const [selectedDoctor, setSelectedDoctor] = useState(doctor || null);
  const [fetchedDoctors, setFetchedDoctors] = useState([]);
  const [fetchingDoctors, setFetchingDoctors] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [slotCounts, setSlotCounts] = useState({});
  const [dateDisabledSlots, setDateDisabledSlots] = useState([]);
  const [pendingDisabledSlots, setPendingDisabledSlots] = useState([]);
  const [bookingWindow, setBookingWindow] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [intakeFormData, setIntakeFormData] = useState({
    chiefComplaint: '', chiefComplaintOther: '', symptomsDuration: '',
    pastMedicalHistory: { hasHistory: null, details: '' },
    currentTreatment: { hasPastTreatment: null, doctorName: '', cityState: '', when: '', prescriptionFile: '', takingMedicines: null },
    testReports: { hasReports: null, reportFile: '' },
    currentMedications: { hasMedications: null, details: '' },
    allergies: { hasAllergies: null, details: '' },
    familyHistory: { hasHistory: null, details: '' },
  });
  const processingRef = useRef(false);

  // Booking target: 'self' | 'family' | 'other'
  const [bookingFor, setBookingFor] = useState('self');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [fetchingFamily, setFetchingFamily] = useState(false);
  const [otherPatient, setOtherPatient] = useState({ name: '', gender: 'Male', phone: '', age: '', bloodGroup: '' });

  const { user } = useAuth();
  const navigate = useNavigate();

  // Reset state when opened
  useEffect(() => {
    if (open) {
      const doc = doctor || null;
      setSelectedDoctor(doc);
      setBookingStep(doc ? 0 : -1);
      setBookingDate(getISTDateString());
      setBookingTime('');
      setSelectedHour(null);
      setDateDisabledSlots([]);
      setPendingDisabledSlots([]);
      setBookingWindow(null);
      setBookingNotes('');
      setPaymentMethod('card');
      setBookingDetails(null);
      setIntakeFormData({
        chiefComplaint: '', chiefComplaintOther: '', symptomsDuration: '',
        pastMedicalHistory: { hasHistory: null, details: '' },
        currentTreatment: { hasPastTreatment: null, doctorName: '', cityState: '', when: '', prescriptionFile: '', takingMedicines: null },
        testReports: { hasReports: null, reportFile: '' },
        currentMedications: { hasMedications: null, details: '' },
        allergies: { hasAllergies: null, details: '' },
        familyHistory: { hasHistory: null, details: '' },
      });
      setBookingFor('self');
      setSelectedFamilyMember(null);
      setOtherPatient({ name: '', gender: 'Male', phone: '', age: '', bloodGroup: '' });

      // Fetch family members
      if (user) {
        setFetchingFamily(true);
        api.dispatch(null, '/patient/family')
          .then(res => setFamilyMembers(res?.members || []))
          .catch(() => setFamilyMembers([]))
          .finally(() => setFetchingFamily(false));
      }
      
      if (!doc && facility && (!facility.doctors || facility.doctors.length === 0)) {
        setFetchingDoctors(true);
        const query = facility.type === 'clinic' ? { clinicId: facility._id } : { hospitalId: facility._id };
        api.getDoctors(query)
          .then(res => {
            const docs = Array.isArray(res) ? res : (res?.data || res?.doctors || []);
            setFetchedDoctors(docs);
          })
          .catch(err => console.error('Failed to fetch facility doctors:', err))
          .finally(() => setFetchingDoctors(false));
      } else {
        setFetchedDoctors(facility?.doctors || []);
      }
    }
  }, [open, doctor, facility]);

  const currentDoc = selectedDoctor || doctor;
  const isAutoConfirm = currentDoc?.autoConfirmAppointment ?? facility?.settings?.autoConfirmAppointment ?? true;

  // Doctor + date change hone par uske already-booked slots fetch karo WITH COUNTS
  useEffect(() => {
    if (!currentDoc?._id || !bookingDate) { setBookedSlots([]); setSlotCounts({}); setDateDisabledSlots([]); setPendingDisabledSlots([]); setBookingWindow(null); return; }
    api.getBookedSlots({ doctorId: currentDoc._id, date: bookingDate })
      .then(res => {
        // New shape: { counts, capacity, fullSlots, dateDisabled, bookingWindow, pendingDisabledSlots }. Legacy shape: ["10:00 AM", ...]
        if (res && typeof res === 'object' && !Array.isArray(res) && res.counts) {
          setSlotCounts(res.counts || {});
          setBookedSlots(res.fullSlots || Object.keys(res.counts || {}));
          setDateDisabledSlots(res.dateDisabled || []);
          setPendingDisabledSlots(res.pendingDisabledSlots || []);
          setBookingWindow(res.bookingWindow || null);
        } else {
          const arr = Array.isArray(res) ? res : [];
          setBookedSlots(arr);
          const counts = {};
          arr.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
          setSlotCounts(counts);
          setDateDisabledSlots([]);
          setPendingDisabledSlots([]);
          setBookingWindow(null);
        }
      })
      .catch(() => { setBookedSlots([]); setSlotCounts({}); setDateDisabledSlots([]); setPendingDisabledSlots([]); setBookingWindow(null); });
  }, [currentDoc?._id, bookingDate, currentDoc?.maxBookingsPerSlot]);

  const isSlotFull = (time) => {
    // Per sub-slot, only 1 booking is allowed (15 min = 1 patient treatment)
    const bookedCount = slotCounts[time] || 0;
    return bookedCount >= 1;
  };

  const handleProceedToPayment = () => {
    if (processingRef.current) return;
    if (!currentDoc) { toast.error('No doctor selected'); return; }
    if (!user) { toast.error('Please login to book an appointment'); navigate('/login'); return; }
    
    // Validate inputs
    if (!bookingDate || !bookingTime) { toast.error('Please select date and time'); return; }

    // Check if slot is full
    if (isSlotFull(bookingTime)) {
      toast.error('This time slot is full. Please choose a different time.');
      return;
    }

    // consultation_fees must be a valid positive number
    const fees = Number(currentDoc.consultation_fees) || Number(currentDoc.fees);
    if (!fees || fees <= 0) {
      toast.error('Doctor consultation fee is not set. Please contact support.');
      return;
    }
    setBookingDetails({ doctor: currentDoc.name, specialization: currentDoc.specialization, date: bookingDate, time: bookingTime, fees });
    
    setBookingStep(1); // Go to "Who is this for?" step
  };

  const handlePayment = async () => {
    if (processingRef.current) return;
    if (!currentDoc) { toast.error('No doctor selected'); return; }
    if (!user) { toast.error('Please login to book an appointment'); navigate('/login'); return; }

    processingRef.current = true;
    setPaymentLoading(true);

    let apptId = null;

    try {
      // Pre-check: confirm slot is still available before processing payment
      try {
        const slotCheck = await api.getBookedSlots({ doctorId: currentDoc._id, date: bookingDate });
        const counts = (slotCheck && slotCheck.counts) ? slotCheck.counts : {};
        if ((counts[bookingTime] || 0) >= 1) {
          toast.error('This slot is already booked. Please try another slot.');
          setBookingTime('');
          setBookingStep(0);
          setSlotCounts(counts);
          setBookedSlots(slotCheck.fullSlots || Object.keys(counts));
          setDateDisabledSlots(slotCheck.dateDisabled || []);
          setBookingLoading(false);
          processingRef.current = false;
          return;
        }
      } catch (_) { /* proceed even if check fails — server will catch duplicates */ }

      const fees = Number(currentDoc.consultation_fees) || Number(currentDoc.fees);
      if (!fees || fees <= 0) {
        throw new Error('Doctor consultation fee is not set. Please contact support.');
      }

      console.log('[BookingModal] Creating appointment + payment in single call');
      const payResult = await api.payTransaction({
        serviceType: 'appointment',
        appointment: {
          doctorId: currentDoc._id,
          doctor: currentDoc.name,
          doctorName: currentDoc.name,
          department: currentDoc.specialization || 'General',
          facilityId: facility?._id || currentDoc.clinicProfile?.clinic_id,
          date: bookingDate,
          time: bookingTime,
          notes: bookingNotes,
          type: 'Consultation',
          bookingFor: bookingFor,
          familyMemberId: bookingFor === 'family' ? selectedFamilyMember?._id : undefined,
          familyMemberName: bookingFor === 'family' ? selectedFamilyMember?.name : undefined,
          otherPatientDetails: bookingFor === 'other' ? otherPatient : undefined,
          preConsultationDetails: intakeFormData,
        },
        amount: fees,
        method: paymentMethod,
        description: `Consultation with ${currentDoc.name}`,
        provider: facility?.name || currentDoc.name,
        lineItems: [{ name: 'Consultation Fee', price: fees, qty: 1 }],
      });

      console.log('[BookingModal] Payment result:', payResult);

      if (!payResult?.success) {
        throw new Error(payResult?.message || 'Payment failed');
      }

      const appointmentStatus = payResult.appointmentStatus || 'Confirmed';
      const appointmentData = payResult.appointment || {};
      apptId = appointmentData._id || '';

      toast.success(appointmentStatus === 'Confirmed' ? 'Payment successful! Appointment confirmed.' : 'Payment successful! Awaiting clinic confirmation.');
      setBookingDetails({
        ...appointmentData,
        doctor: currentDoc.name,
        specialization: currentDoc.specialization,
        date: bookingDate,
        time: bookingTime,
        fees,
        transactionId: payResult.transaction_id,
        invoiceId: payResult.invoice_id,
        appointmentStatus,
      });
      setBookingStep(5);
      if (onSuccess) onSuccess();

    } catch (e) {
      const msg = e.response?.data?.message || e.message || '';
      const status = e.response?.status;
      // Already-paid idempotency case — treat as success
      if (status === 200 && msg.includes('already be completed')) {
        toast.success('Appointment already booked');
        setBookingStep(5);
        if (onSuccess) onSuccess();
      } else if (status === 409) {
        toast.error(msg || 'This slot is already booked. Please pick a different time.');
        // Force back to slot-selection step so the user can't accidentally
        // resubmit the exact same (now-confirmed) date/time again.
        setBookingTime('');
        setBookingStep(0);
        // Refresh booked slots for this doctor/date so the taken slot
        // shows as disabled immediately, instead of only failing on submit.
        if (currentDoc?._id && bookingDate) {
          api.getBookedSlots({ doctorId: currentDoc._id, date: bookingDate })
            .then(res => {
                if (res && typeof res === 'object' && !Array.isArray(res) && res.counts) {
                  setSlotCounts(res.counts || {});
                  setBookedSlots(res.fullSlots || Object.keys(res.counts || {}));
                  setDateDisabledSlots(res.dateDisabled || []);
                  setPendingDisabledSlots(res.pendingDisabledSlots || []);
                  setBookingWindow(res.bookingWindow || null);
                } else {
                  const arr = Array.isArray(res) ? res : [];
                  setBookedSlots(arr);
                  const counts = {};
                  arr.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
                  setSlotCounts(counts);
                  setDateDisabledSlots([]);
                  setPendingDisabledSlots([]);
                }
            })
            .catch(() => {});
        }
      } else {
        toast.error(msg || 'Booking failed');
        if (apptId) {
          try { await api.deleteAppointment(apptId); } catch (_) {}
        }
      }
    }
    setPaymentLoading(false);
    processingRef.current = false;
  };

  // ─── Slot helpers: group flat time_slots into hours + build time ranges ───
  const slotDuration = currentDoc?.slotDuration || 15;

  // Max bookable date from doctor's booking window (e.g. 2 weeks from today)
  const maxBookableDate = useMemo(() => {
    const bw = bookingWindow;
    if (!bw || typeof bw.value !== 'number' || bw.value <= 0 || !bw.unit) return null;
    const d = new Date();
    switch (bw.unit) {
      case 'hours': d.setHours(d.getHours() + bw.value); break;
      case 'days': d.setDate(d.getDate() + bw.value); break;
      case 'weeks': d.setDate(d.getDate() + bw.value * 7); break;
      case 'months': d.setMonth(d.getMonth() + bw.value); break;
      default: return null;
    }
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }, [bookingWindow]);

  // "09:15 AM" -> minutes since midnight (e.g. 555)
  const slotToMinutes = (t) => {
    const m = t?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (/PM/i.test(m[3])) h += 12;
    return h * 60 + parseInt(m[2], 10);
  };

  // minutes since midnight -> "9:15 AM"
  const minutesToSlot = (mins) => {
    let h = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
  };

  // minutes -> short "9:00" for range display
  const minutesToShort = (mins) => {
    let h = Math.floor(mins / 60) % 24;
    const mm = mins % 60;
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')}`;
  };

  // Is a slot disabled for this specific date by the doctor in My Schedule?
  const isSlotDisabled = (slotStr) => dateDisabledSlots.includes(slotStr);

  // Is a slot pending removal (doctor requested to disable it, awaiting admin approval)?
  const isSlotPendingUpdate = (slotStr) => pendingDisabledSlots.includes(slotStr);

  // Group all time_slots (enabled + date-disabled + pending-disabled) into hours.
  const hourGroups = useMemo(() => {
    const enabledSlots = currentDoc?.time_slots || [];
    const allSlots = [...enabledSlots,
      ...dateDisabledSlots.filter(s => !enabledSlots.includes(s)),
      ...pendingDisabledSlots.filter(s => !enabledSlots.includes(s) && !dateDisabledSlots.includes(s))];
    // Fallback if nothing
    const slots = allSlots.length > 0 ? allSlots : ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];
    const groups = {};
    slots.forEach(t => {
      const mins = slotToMinutes(t);
      if (mins == null) return;
      const h24 = Math.floor(mins / 60) % 24;
      let h12 = h24 % 12; if (h12 === 0) h12 = 12;
      const key = `${h12} ${h24 >= 12 ? 'PM' : 'AM'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort((a, b) => slotToMinutes(a[1][0]) - slotToMinutes(b[1][0]));
  }, [currentDoc?.time_slots, dateDisabledSlots]);

  // Range string for a slot: "9:00–9:15"
  const rangeFor = (slotStr) => {
    const start = slotToMinutes(slotStr);
    if (start == null) return slotStr;
    const end = start + slotDuration;
    return `${minutesToShort(start)}–${minutesToShort(end)}`;
  };

  const fullRangeFor = (slotStr) => {
    const start = slotToMinutes(slotStr);
    if (start == null) return slotStr;
    const end = start + slotDuration;
    return `${minutesToSlot(start)} – ${minutesToSlot(end)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full rounded-2xl">
        {bookingStep === -1 && (
          <>
            <DialogHeader>
              <DialogTitle>Select Doctor</DialogTitle>
              <DialogDescription>
                Choose a doctor at {facility?.name || 'this facility'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              {fetchingDoctors ? (
                <div className="text-center text-sm text-muted-foreground py-6">Loading doctors...</div>
              ) : fetchedDoctors.length > 0 ? (
                fetchedDoctors.map((doc, idx) => (
                <motion.div
                  key={doc._id || idx}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 cursor-pointer"
                  onClick={() => { setSelectedDoctor(doc); setBookingStep(0); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                      <span className="text-primary-foreground font-bold text-xs">{doc.name?.split(' ').map(n=>n[0]).join('').slice(0,2) || 'DR'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-sm text-foreground truncate">{doc.name}</h3>
                      <p className="text-xs font-medium text-primary mt-0.5">{doc.specialization}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">{doc.experience || `${doc.experienceYears || 0} yrs`}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium text-primary">₹{doc.fees || doc.consultation_fees || 0}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                  </div>
                </motion.div>
              ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-6">No doctors available.</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </>
        )}

        {bookingStep === 0 && currentDoc && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {!doctor && (
                  <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setBookingStep(-1)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                Book Appointment
              </DialogTitle>
              <DialogDescription>
                Quick booking for {facility?.name || 'Clinic'} - {currentDoc?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-bold text-xs">{currentDoc?.name?.split(' ')?.map(n=>n?.[0])?.join('')?.slice(0,2) || 'DR'}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground text-sm truncate">{currentDoc?.name}</h3>
                  <p className="text-xs text-primary">{currentDoc?.specialization}</p>
                  {isAutoConfirm ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Auto accept appointment is on
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600 mt-1 font-medium">
                      ⚠️ You may have to wait for booking confirmation
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Consultation Fee</p>
                  <p className="font-bold text-sm text-primary">₹{Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 text-center">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Avg Treatment Time</p>
                  <p className="font-semibold text-xs text-emerald-600">
                    {currentDoc?.slotDuration || 15} mins
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Select Date</label>
                <Input type="date" className="w-full" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={getISTDateString()} max={maxBookableDate || undefined} />
                {maxBookableDate && bookingWindow && (
                  <p className="text-[10px] text-muted-foreground">
                    📅 You can book up to <strong>{bookingWindow.value} {bookingWindow.unit}</strong> in advance ({maxBookableDate})
                  </p>
                )}
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
                    const avail = hourSlots.filter(s => !isSlotFull(s) && !isSlotDisabled(s) && !isSlotPendingUpdate(s)).length;
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
                                ? (pendingUpdate
                                    ? 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed'
                                    : 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed')
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
                <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Any specific concerns…" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm" className="w-full" disabled={!bookingDate || !bookingTime || bookingLoading} onClick={handleProceedToPayment}>
                <>Next: Who is this for? <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
              </Button>
            </DialogFooter>
          </>
        )}

        {bookingStep === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setBookingStep(0)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Who is this appointment for?
              </DialogTitle>
              <DialogDescription>
                Select who you're booking this appointment for
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-3">
              {/* Self */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                onClick={() => { setBookingFor('self'); setSelectedFamilyMember(null); }}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  bookingFor === 'self' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/30 bg-card'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bookingFor === 'self' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">Myself</p>
                  <p className="text-xs text-muted-foreground">{user?.name || 'Book for yourself'}</p>
                </div>
                {bookingFor === 'self' && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
              </motion.div>

              {/* Family Members */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Heart className="w-3 h-3" /> My Family
                </p>
                {fetchingFamily ? (
                  <div className="text-center text-sm text-muted-foreground py-4">Loading family members...</div>
                ) : familyMembers.length === 0 ? (
                  <div className="text-center p-4 bg-muted/20 rounded-xl border border-dashed border-border/40">
                    <Users className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1.5" />
                    <p className="text-xs text-muted-foreground">No family members added yet</p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-xs gap-1" onClick={() => { onOpenChange(false); navigate('/patient/family'); }}>
                      <UserPlus className="w-3 h-3" /> Add Family Member
                    </Button>
                  </div>
                ) : (
                  familyMembers.map((m) => (
                    <motion.div
                      key={m._id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => { setBookingFor('family'); setSelectedFamilyMember(m); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        bookingFor === 'family' && selectedFamilyMember?._id === m._id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/30 bg-card'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bookingFor === 'family' && selectedFamilyMember?._id === m._id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.relation} · {m.gender}{m.bloodGroup ? ` · ${m.bloodGroup}` : ''}</p>
                      </div>
                      {bookingFor === 'family' && selectedFamilyMember?._id === m._id && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Other */}
              <div className="space-y-2">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  onClick={() => { setBookingFor('other'); setSelectedFamilyMember(null); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    bookingFor === 'other' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/60 hover:border-primary/30 bg-card'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bookingFor === 'other' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">Other</p>
                    <p className="text-xs text-muted-foreground">Book for someone else</p>
                  </div>
                  {bookingFor === 'other' && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                </motion.div>

                {bookingFor === 'other' && (
                  <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
                        <Input value={otherPatient.name} onChange={e => setOtherPatient({ ...otherPatient, name: e.target.value })} placeholder="Patient name" className="h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Gender</label>
                        <select value={otherPatient.gender} onChange={e => setOtherPatient({ ...otherPatient, gender: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-background text-sm">
                          {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                        <Input value={otherPatient.phone} onChange={e => setOtherPatient({ ...otherPatient, phone: e.target.value })} placeholder="Phone number" className="h-8 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Age</label>
                        <Input type="number" value={otherPatient.age} onChange={e => setOtherPatient({ ...otherPatient, age: e.target.value })} placeholder="Age" className="h-8 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Blood Group</label>
                      <Input value={otherPatient.bloodGroup} onChange={e => setOtherPatient({ ...otherPatient, bloodGroup: e.target.value })} placeholder="e.g. A+" className="h-8 text-sm" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBookingStep(0)}>Back</Button>
              <Button size="sm" onClick={() => {
                if (bookingFor === 'family' && !selectedFamilyMember) {
                  toast.error('Please select a family member');
                  return;
                }
                if (bookingFor === 'other' && !otherPatient.name) {
                  toast.error('Please enter the patient name');
                  return;
                }
                setBookingStep(2);
              }}>
                Next: Intake Form <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {bookingStep === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setBookingStep(1)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Patient Intake Form
              </DialogTitle>
              <DialogDescription>
                Please provide some details before we proceed
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <IntakeFormStep 
                formData={intakeFormData} 
                setFormData={setIntakeFormData} 
              />
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBookingStep(1)}>Back</Button>
              <Button size="sm" onClick={() => {
                if (!intakeFormData.chiefComplaint) {
                  toast.error('Please select your chief complaint or main symptom');
                  return;
                }
                setBookingStep(3);
              }}>
                Review & Pay <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {bookingStep === 3 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setBookingStep(2)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Payment Method
              </DialogTitle>
              <DialogDescription>
                Choose how you'd like to pay
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              {[
                { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Pay securely with your card' },
                { id: 'upi', label: 'UPI', icon: Smartphone, desc: 'Google Pay, PhonePe, Paytm' },
                { id: 'netbanking', label: 'Net Banking', icon: Landmark, desc: 'All major banks supported' },
                { id: 'wallet', label: 'Wallet', icon: Wallet, desc: 'Paytm, Mobikwik, Freecharge' },
              ].map(m => (
                <motion.div
                  key={m.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === m.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border/60 hover:border-primary/30 bg-card'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    paymentMethod === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  {paymentMethod === m.id && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                </motion.div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setBookingStep(2)}>Back</Button>
              <Button size="sm" onClick={() => setBookingStep(4)}>
                Next: Review Bill <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DialogFooter>
          </>
        )}

        {bookingStep === 4 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="w-7 h-7 -ml-1" onClick={() => setBookingStep(3)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                Review & Confirm
              </DialogTitle>
              <DialogDescription>
                Verify your appointment details
              </DialogDescription>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <BillCheckout
                amount={Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0}
                serviceType="appointment"
                provider={facility?.name || currentDoc?.name}
                details={{ doctor: currentDoc?.name, specialization: currentDoc?.specialization, date: formatDisplayDate(bookingDate), time: bookingTime, type: 'Consultation' }}
                lineItems={[{ name: 'Consultation Fee', price: Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0, qty: 1 }]}
                platformFee={0}
                gst={0}
                discount={0}
              />
              
              {/* Auto-confirm warning */}
              {!isAutoConfirm && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] text-amber-50 font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-xs text-amber-800 font-medium">Appointment requires manual confirmation</p>
                      <p className="text-xs text-amber-700 mt-0.5">⚠️ You may have to wait for booking confirmation after payment</p>
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto flex-1" onClick={() => setBookingStep(3)}>Back</Button>
                <Button size="sm" className="w-full sm:w-auto flex-1" disabled={paymentLoading} onClick={handlePayment}>
                  {paymentLoading ? <>Processing…</> : <>Pay ₹{Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0}</>}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {bookingStep === 5 && (
          <div className="py-8 text-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h3 className="text-lg font-bold text-primary mb-2">
              {bookingDetails?.appointmentStatus === 'Pending' ? 'Payment Received — Pending Confirmation' : 'Booking Confirmed!'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {bookingDetails?.appointmentStatus === 'Pending' ? 'Clinic will confirm your appointment shortly' : `Appointment booked for ${currentDoc?.name}`}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <CalendarDays className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-primary">
                {formatDisplayDate(bookingDate)} • {fullRangeFor(bookingTime)}
              </p>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">
                Payment of ₹{Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0} via {paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'netbanking' ? 'Net Banking' : paymentMethod === 'wallet' ? 'Wallet' : 'Card'} successful
              </span>
            </div>
            {bookingDetails?.transactionId && (
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => downloadPaymentInvoice(bookingDetails.transactionId, `invoice-${bookingDetails.invoiceId || 'appt'}.pdf`)}>
                  <FileDown className="w-3.5 h-3.5" /> Invoice
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5"
                  onClick={() => downloadBillPdf(bookingDetails.transactionId, `bill-${bookingDetails.invoiceId || 'appt'}.pdf`)}>
                  <FileDown className="w-3.5 h-3.5" /> Bill
                </Button>
              </div>
            )}
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/patient/appointments')}>View Appointments</Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}