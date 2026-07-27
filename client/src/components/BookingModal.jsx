import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeCheck, CalendarDays, CheckCircle, CheckCircle2, ChevronRight, CreditCard, Landmark, Smartphone, Wallet, ArrowLeft, Users, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BillCheckout from './BillCheckout';
import { api, downloadPaymentInvoice, downloadBillPdf } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';

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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);
  const processingRef = useRef(false);

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
      setBookingNotes('');
      setPaymentMethod('card');
      setBookingDetails(null);
      
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

  // Doctor + date change hone par uske already-booked slots fetch karo WITH COUNTS
  useEffect(() => {
    if (!currentDoc?._id || !bookingDate) { setBookedSlots([]); setSlotCounts({}); return; }
    api.getBookedSlots({ doctorId: currentDoc._id, date: bookingDate })
      .then(slots => {
        setBookedSlots(Array.isArray(slots) ? slots : []);
        // Count bookings per slot for capacity display
        const counts = {};
        if (Array.isArray(slots)) {
          slots.forEach(slot => { counts[slot] = (counts[slot] || 0) + 1; });
        }
        setSlotCounts(counts);
      })
      .catch(() => { setBookedSlots([]); setSlotCounts({}); });
  }, [currentDoc?._id, bookingDate]);

  // Calculate remaining slots for current time selection
  const getRemainingSlots = (time) => {
    const capacity = currentDoc?.maxBookingsPerSlot || 1;
    const bookedCount = slotCounts[time] || 0;
    return Math.max(0, capacity - bookedCount);
  };

  const isSlotFull = (time) => {
    const capacity = currentDoc?.maxBookingsPerSlot || 1;
    const bookedCount = slotCounts[time] || 0;
    return bookedCount >= capacity;
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
    
    setBookingStep(1); // Go to Payment Method
  };

  const handlePayment = async () => {
    if (processingRef.current) return;
    if (!currentDoc) { toast.error('No doctor selected'); return; }
    if (!user) { toast.error('Please login to book an appointment'); navigate('/login'); return; }

    processingRef.current = true;
    setPaymentLoading(true);

    let apptId = null;

    try {
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
      setBookingStep(3);
      if (onSuccess) onSuccess();

    } catch (e) {
      const msg = e.response?.data?.message || e.message || '';
      const status = e.response?.status;
      // Already-paid idempotency case — treat as success
      if (status === 200 && msg.includes('already be completed')) {
        toast.success('Appointment already booked');
        setBookingStep(3);
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
            .then(slots => {
              setBookedSlots(Array.isArray(slots) ? slots : []);
              const counts = {};
              if (Array.isArray(slots)) slots.forEach(s => { counts[s] = (counts[s] || 0) + 1; });
              setSlotCounts(counts);
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
                        {doc.maxBookingsPerSlot > 1 && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-amber-600 font-medium">{doc.maxBookingsPerSlot}/slot</span>
                          </>
                        )}
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
                  {currentDoc?.maxBookingsPerSlot > 1 && (
                    <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                      ⏱️ {currentDoc.maxBookingsPerSlot} patients per slot
                    </p>
                  )}
                  {currentDoc?.autoConfirmAppointment === true ? (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Auto-confirm: ON
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
                  <p className="text-[11px] text-muted-foreground mb-0.5">Available Slot</p>
                  <p className="font-semibold text-xs text-emerald-600">
                    {currentDoc?.next_available_slot || 'Today'}
                    {currentDoc?.maxBookingsPerSlot > 1 && ` (${currentDoc.maxBookingsPerSlot}/slot)`}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Select Date</label>
                <Input type="date" className="w-full" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={getISTDateString()} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Select Time Slot</label>
                <select value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm">
                  <option value="">Choose time</option>
                  {(currentDoc?.time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']).map(t => {
                    const isFull = isSlotFull(t);
                    const remaining = getRemainingSlots(t);
                    const capacity = currentDoc?.maxBookingsPerSlot || 1;
                    return (
                      <option key={t} disabled={isFull} value={t}>
                        {t} {isFull ? '(Full)' : `(${remaining}/${capacity} left)`}
                      </option>
                    );
                  })}
                </select>
                {/* Remaining slots info */}
                {bookingTime && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <div className={`px-2 py-1 rounded-md ${isSlotFull(bookingTime) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {isSlotFull(bookingTime) ? '⚠️ This slot is full' : `✅ ${getRemainingSlots(bookingTime)} more bookings allowed`}
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
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" disabled={!bookingDate || !bookingTime || bookingLoading} onClick={handleProceedToPayment}>
                <>Next: Payment <ChevronRight className="w-3.5 h-3.5 ml-1" /></>
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
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" onClick={() => setBookingStep(2)}>
                Next: Review Bill <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
              {currentDoc?.autoConfirmAppointment !== true && (
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
                <Button variant="outline" size="sm" className="w-full sm:w-auto flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button size="sm" className="w-full sm:w-auto flex-1" disabled={paymentLoading} onClick={handlePayment}>
                  {paymentLoading ? <>Processing…</> : <>Pay ₹{Number(currentDoc?.consultation_fees) || Number(currentDoc?.fees) || 0}</>}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}

        {bookingStep === 3 && (
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
                {formatDisplayDate(bookingDate)} • {bookingTime}
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