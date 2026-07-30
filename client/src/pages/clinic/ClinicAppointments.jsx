import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, FileText, IndianRupee, Send, X, ChevronLeft, ChevronRight, UserCheck, Activity, Stethoscope, Hash, Calendar, Users, CalendarClock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';

const statusColors = { Pending: 'bg-amber-50 text-amber-600 border border-amber-200', Confirmed: 'bg-success/10 text-success', Cancelled: 'bg-destructive/10 text-destructive', Completed: 'bg-info/10 text-info' };
const statusDot = { Pending: 'bg-amber-500', Confirmed: 'bg-emerald-500', Cancelled: 'bg-red-500', Completed: 'bg-blue-500' };
const filters = ['All', 'Pending', 'Confirmed', 'Cancelled', 'Completed'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ─── Reusable Appointment Card (used by list view + calendar popup) ───
function AppointmentCard({ apt, onConfirm, onCancel, onCompleteAndBill }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg text-foreground">{apt.patient}</h3>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${statusColors[apt.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[apt.status]}`} />
              {apt.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">{apt.time}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2 bg-muted/20 p-3 rounded-lg border border-border/50">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{formatDisplayDate(apt.date)}</span>
          <div className="w-1 h-1 rounded-full bg-border" />
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{apt.time}</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {apt.tokenNumber && <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-primary/70" /><span>Token: <span className="font-medium text-foreground">{apt.tokenNumber}</span></span></div>}
          {apt.doctor && <div className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-primary/70" /><span>Doctor: {apt.doctor}</span></div>}
          {apt.type && <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary/70" /><span>Type: {apt.type}</span></div>}
          {apt.fees > 0 && <div className="flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-primary/70" /><span className="font-medium text-emerald-600">₹{apt.fees}</span></div>}
        </div>
        {apt.symptoms && (
          <div className="flex items-start gap-1.5 text-sm">
            <Stethoscope className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
            <span className="line-clamp-2">Symptoms: {apt.symptoms}</span>
          </div>
        )}
        {(apt.transactionId || apt.invoiceId) && (
          <div className="flex items-center gap-1.5 text-sm">
            <FileText className="w-3.5 h-3.5 text-primary/70 shrink-0" />
            <span className="truncate">{apt.invoiceId ? `Bill: ${apt.invoiceId}` : `Txn: ${apt.transactionId}`}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {apt.status === 'Pending' && (
          <Button size="sm" className="flex-1 gap-1" onClick={() => onConfirm?.(apt._id)}>
            <CheckCircle className="w-3.5 h-3.5" /> Confirm
          </Button>
        )}
        {apt.status === 'Confirmed' && (
          <>
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive" onClick={() => onCancel?.(apt._id)}>
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
            <Button size="sm" className="flex-1 gap-1" onClick={() => onCompleteAndBill?.(apt._id)}>
              <CheckCircle className="w-3.5 h-3.5" /> Complete & Bill
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ClinicAppointments() {
  const { user } = useAuth();
  const location = useLocation();
  // Derive mode from URL: /clinic/appointments/approve → approve, else → today
  const mode = location.pathname.endsWith('/approve') ? 'approve' : 'today';
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(new Date());
  const [approveDate, setApproveDate] = useState(getISTDateString());
  const [approveCalDate, setApproveCalDate] = useState(new Date());

  // Calendar popup state
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef(null);

  const [completeId, setCompleteId] = useState(null);
  const [billAmount, setBillAmount] = useState(500);
  const [billModal, setBillModal] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      // Always fetch ALL statuses so we can show today + pending counts in both modes
      const data = await api.getAppointments({ status: 'All' });
      setAppointments(data?.appointments || data?.data || data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAppointments(); }, [user?.name]);

  const today = getISTDateString();
  // Pending appointments (for the approve mode)
  const pendingAppointments = useMemo(
    () => appointments.filter(a => (a.status || '').toLowerCase() === 'pending'),
    [appointments]
  );
  // Today's appointments (all statuses) — for the today mode
  const todayAppointments = useMemo(
    () => appointments.filter(a => a.date === today),
    [appointments, today]
  );

  // The list shown depends on the active mode
  const visibleAppointments = useMemo(() => {
    if (mode === 'approve') return pendingAppointments.filter(a => a.date === approveDate);
    // today mode: respect the status filter, but always scope to today's date
    if (filter === 'All') return todayAppointments;
    return todayAppointments.filter(a => (a.status || '') === filter);
  }, [mode, pendingAppointments, todayAppointments, filter]);

  // Close popup on outside click
  useEffect(() => {
    if (!showPopup) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopup]);

  const handleStatus = async (id, status) => {
    try { await api.updateAppointment(id, { status }); loadAppointments(); } catch (e) { console.error(e); toast.error(e.response?.data?.message || 'Failed to update appointment'); }
  };

  const handleGenerateBill = async () => {
    if (!completeId) return;
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return;
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

  const handleDayClick = (day, dayAppts) => {
    if (dayAppts.length === 0) return;
    const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowPopup(true);
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // Shared action handlers for AppointmentCard
  const cardActions = {
    onConfirm: (id) => handleStatus(id, 'Confirmed'),
    onCancel: (id) => handleStatus(id, 'Cancelled'),
    onCompleteAndBill: (id) => { setCompleteId(id); setBillModal(true); },
  };

  const selectedAppts = selectedDate ? appointments.filter(a => a.date === selectedDate) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
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
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <p className="text-muted-foreground">
            {mode === 'approve'
              ? 'Review and confirm pending appointment requests'
              : 'All appointments scheduled for today'}
          </p>
          {/* Tab switcher — Today ↔ Approve (Styled as Pill Switch) */}
          <div className="flex items-center bg-primary/10 rounded-full p-1 ml-2">
            <Link to="/clinic/appointments">
              <button className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${mode === 'today' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                <CalendarClock className="w-4 h-4" /> Today
                {pendingAppointments.length > 0 && mode === 'today' && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">{pendingAppointments.length}</span>
                )}
              </button>
            </Link>
            <Link to="/clinic/appointments/approve">
              <button className={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${mode === 'approve' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                <FileCheck className="w-4 h-4" /> Approve
                {pendingAppointments.length > 0 && mode !== 'today' && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">{pendingAppointments.length}</span>
                )}
              </button>
            </Link>
          </div>
          {/* List/Calendar toggle — only relevant in today mode */}
          {mode === 'today' && (
            <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5 ml-auto">
              <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>List</button>
              <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>Calendar</button>
            </div>
          )}
        </div>
      </div>

      {/* Status filters — only in today mode (approve mode always shows pending) */}
      {mode === 'today' && (
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {f}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : mode === 'approve' ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar Calendar for Approve */}
          <div className="lg:w-[320px] shrink-0 space-y-6">
            <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-lg font-semibold text-foreground">My Schedule</h3>
                <div className="flex items-center gap-1">
                  <button onClick={() => setApproveCalDate(new Date(approveCalDate.getFullYear(), approveCalDate.getMonth() - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setApproveCalDate(new Date(approveCalDate.getFullYear(), approveCalDate.getMonth() + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground/60">{d}</div>)}
                {Array.from({ length: getFirstDay(approveCalDate) }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: getDaysInMonth(approveCalDate) }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${approveCalDate.getFullYear()}-${String(approveCalDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = dateStr === approveDate;
                  const hasPending = pendingAppointments.some(a => a.date === dateStr);
                  return (
                    <button key={day} onClick={() => setApproveDate(dateStr)}
                      className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground hover:bg-muted'}
                      `}
                    >
                      {day}
                      {hasPending && !isSelected && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-card rounded-[24px] border border-border/60 p-5 flex items-center justify-between shadow-sm">
               <div>
                  <h4 className="text-3xl font-light text-foreground">{visibleAppointments.length}</h4>
                  <p className="text-sm font-medium text-muted-foreground">Patients on selected date</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 cursor-pointer transition-colors"><ChevronRight className="w-5 h-5 text-foreground" /></div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1">
             {visibleAppointments.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground bg-card rounded-[24px] border border-border/60">No pending appointments on this date</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                 {visibleAppointments.map(apt => (
                    <AppointmentCard key={apt._id} apt={apt} onConfirm={cardActions.onConfirm} onCancel={cardActions.onCancel} onCompleteAndBill={cardActions.onCompleteAndBill} />
                 ))}
               </div>
             )}
          </div>
        </div>
      ) : mode === 'today' && view === 'calendar' ? (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-heading text-lg font-semibold">{months[calDate.getMonth()]} {calDate.getFullYear()}</h3>
            <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="w-5 h-5" /></button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: getFirstDay(calDate) }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAppts = appointments.filter(a => a.date === dateStr);
              const isToday = dateStr === getISTDateString();
              const hasAppts = dayAppts.length > 0;

              return (
                <div key={day}
                  className={`relative min-h-16 rounded-xl p-2 border transition-all cursor-pointer
                    ${isToday ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : hasAppts ? 'border-primary/30 bg-primary/[0.03] hover:bg-primary/10 hover:border-primary/50 hover:shadow-md' : 'border-border/40 hover:bg-muted/30'}`}
                  onClick={() => handleDayClick(day, dayAppts)}
                >
                  {/* Day number */}
                  <p className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : 'text-foreground'}`}>{day}</p>

                  {/* Appointment count badge */}
                  {hasAppts && (
                    <div className="absolute top-1 right-1">
                      <span className={`inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded-full text-[11px] font-bold leading-none
                        ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-primary/90 text-white shadow-sm'}`}>
                        {dayAppts.length}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : visibleAppointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No appointments scheduled for today
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleAppointments.map((apt, i) => (
            <AppointmentCard key={apt._id} apt={apt} {...cardActions} />
          ))}
        </div>
      )}

      {/* ─── Calendar Day Popup (large modal, 2×2 grid) ─── */}
      <AnimatePresence>
        {showPopup && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowPopup(false)}>
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Popup header */}
              <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground text-xl">
                      {formatDisplayDate(selectedDate)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''} scheduled
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Popup body — 2×2 grid, scrollable after 4 cards */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-85px)]">
                {selectedAppts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAppts.map(apt => (
                      <AppointmentCard key={apt._id} apt={apt} {...cardActions} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <CalendarDays className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No appointments on this day</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Complete & Bill Modal ─── */}
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
    </div>
  );
}
