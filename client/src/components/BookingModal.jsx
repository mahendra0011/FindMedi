import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BadgeCheck, CalendarDays, CheckCircle, CheckCircle2, ChevronRight, CreditCard, Landmark, Smartphone, Wallet, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BillCheckout from './BillCheckout';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function BookingModal({
  open,
  onOpenChange,
  doctor,
  facility,
  onSuccess,
}) {
  const [bookingStep, setBookingStep] = useState(0);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setBookingStep(0);
      setBookingDate(new Date().toISOString().split('T')[0]);
      setBookingTime('');
      setBookingNotes('');
      setPaymentMethod('card');
      setBookingDetails(null);
    }
  }, [open]);

  const handleCreateAppointment = async () => {
    if (!doctor) { toast.error('No doctor selected'); return; }
    if (!user) { toast.error('Please login to book an appointment'); navigate('/login'); return; }
    
    setBookingLoading(true);
    try {
      const fees = doctor.consultation_fees || doctor.fees || 0;
      const result = await api.createAppointment({
        doctorId: doctor._id,
        doctor: doctor.name,
        doctorName: doctor.name,
        department: doctor.specialization || 'General',
        facilityId: facility?._id || doctor.clinicProfile?.clinic_id,
        patient: user.name || 'Patient',
        patientId: user._id,
        email: user.email,
        phone: user.phone || '',
        date: bookingDate,
        time: bookingTime,
        notes: bookingNotes,
        type: 'Consultation',
      });
      setBookingDetails({ ...(result || {}), doctor: doctor.name, date: bookingDate, time: bookingTime, fees });
      setBookingStep(1); // Go to Payment Method
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Failed to reserve appointment');
    }
    setBookingLoading(false);
  };

  const handlePayment = async () => {
    const fees = bookingDetails?.fees || 0;
    if (fees <= 0) { setBookingStep(3); return; }
    setPaymentLoading(true);
    try {
      const result = await api.payTransaction({
        serviceType: 'appointment',
        referenceId: bookingDetails?._id,
        amount: fees,
        method: paymentMethod,
        description: `Consultation with ${bookingDetails?.doctor || 'Doctor'}`,
        provider: facility?.name || bookingDetails?.doctor || 'Doctor',
        lineItems: [{ name: 'Consultation Fee', price: fees, qty: 1 }],
      });
      if (result?.success) {
        toast.success('Payment successful! Appointment confirmed.');
        setBookingStep(3); // Go to Success Screen
        if (onSuccess) onSuccess();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || 'Payment failed');
    }
    setPaymentLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full rounded-2xl">
        {bookingStep === 0 && (
          <>
            <DialogHeader>
              <DialogTitle>Book Appointment</DialogTitle>
              <DialogDescription>
                Quick booking for {facility?.name || 'Clinic'} - {doctor?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground font-bold text-xs">{doctor?.name?.split(' ')?.map(n=>n?.[0])?.join('')?.slice(0,2) || 'DR'}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground text-sm truncate">{doctor?.name}</h3>
                  <p className="text-xs text-primary">{doctor?.specialization}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Consultation Fee</p>
                  <p className="font-bold text-sm text-primary">₹{doctor?.fees || doctor?.consultation_fees || 0}</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-500/10 text-center">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Available Slot</p>
                  <p className="font-semibold text-xs text-emerald-600">{doctor?.next_available_slot || 'Today'}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Select Date</label>
                <Input type="date" className="w-full" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Select Time Slot</label>
                <select value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm">
                  <option value="">Choose time</option>
                  {(doctor?.time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']).map(t => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Notes (optional)</label>
                <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Any specific concerns…" className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button size="sm" disabled={!bookingDate || !bookingTime || bookingLoading} onClick={handleCreateAppointment}>
                {bookingLoading ? <>Booking…</> : <>Next: Payment <ChevronRight className="w-3.5 h-3.5 ml-1" /></>}
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
                amount={doctor?.fees || doctor?.consultation_fees || 0}
                serviceType="appointment"
                provider={facility?.name || doctor?.name}
                details={{ doctor: doctor?.name, specialization: doctor?.specialization, date: bookingDate, time: bookingTime, type: 'Consultation' }}
                lineItems={[{ name: 'Consultation Fee', price: doctor?.fees || doctor?.consultation_fees || 0, qty: 1 }]}
                platformFee={0}
                gst={0}
                discount={0}
                compact
                method={paymentMethod}
                onMethodChange={setPaymentMethod}
                onPay={handlePayment}
                loading={paymentLoading}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" disabled={paymentLoading} onClick={handlePayment}>
                  {paymentLoading ? <>Processing…</> : <>Pay ₹{doctor?.fees || doctor?.consultation_fees || 0}</>}
                </Button>
              </div>
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
            <h3 className="text-lg font-bold text-primary mb-2">Booking Confirmed!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Appointment booked for {doctor?.name}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <CalendarDays className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-primary">
                {bookingDate && new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {bookingTime}
              </p>
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600">
                Payment of ₹{doctor?.fees || doctor?.consultation_fees || 0} via {paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'netbanking' ? 'Net Banking' : paymentMethod === 'wallet' ? 'Wallet' : 'Card'} successful
              </span>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/patient/appointments')}>View Appointments</Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
