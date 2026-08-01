import { useState, useMemo } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, CheckCircle,
  User, History, TrendingUp,
  XCircle, AlertTriangle, FileText, Info, Phone, Mail, MapPin, Droplet,
} from 'lucide-react';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import {
  parseTime, subSlotFor, getHourSlots, getSubSlotsForHour, hourBoxFor,
} from '@/lib/timeSlots';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Approve Appointments Section — same-to-same layout & UI as Appointment History:
 * 3 filling columns — calendar + patient list (left), time filter + cards (middle),
 * status overview + recent (right). Cards use the SAME CompletedCard design with
 * only Confirm/Reject actions; rejected appointments show the rejection reason.
 */
export default function ApproveAppointmentSection({ appointments, onConfirm, onReject }) {
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());

  const today = getISTDateString();

  // Shared reject modal target (used by cards AND recent requests)
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  // Expanded inline form (recent requests panel)
  const [expandedId, setExpandedId] = useState(null);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // Pending + rejected (with reason) appointments for the selected date
  const approveForDate = useMemo(
    () => appointments.filter(a => {
      if (a.date !== selectedDate) return false;
      const s = (a.status || '').toLowerCase();
      return s === 'pending' || s === 'cancelled';
    }),
    [appointments, selectedDate]
  );

  // Most recent requests first (by slot time, fallback to createdAt)
  const sorted = useMemo(
    () => [...approveForDate].sort((a, b) => {
      const ta = parseTime(a.time)?.hour ?? 0;
      const tb = parseTime(b.time)?.hour ?? 0;
      return tb - ta;
    }),
    [approveForDate]
  );

  const hourSlots = useMemo(() => getHourSlots(), []);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedSubSlot, setSelectedSubSlot] = useState(null);

  const subSlots = useMemo(() => {
    if (selectedHour) return getSubSlotsForHour(selectedHour);
    const present = [...new Set(sorted.map(a => subSlotFor(a.time)).filter(Boolean))];
    return present.length ? present : getSubSlotsForHour(hourBoxFor(sorted[0]?.time) || hourSlots[0]);
  }, [selectedHour, sorted, hourSlots]);

  const hourAppointments = useMemo(
    () => selectedHour
      ? sorted.filter(a => hourBoxFor(a.time) === selectedHour)
      : sorted,
    [sorted, selectedHour]
  );

  const slotAppointments = useMemo(() => {
    if (!selectedSubSlot) return hourAppointments;
    return hourAppointments.filter(a => subSlotFor(a.time) === selectedSubSlot);
  }, [hourAppointments, selectedSubSlot]);

  const handleHourClick = (h) => {
    setSelectedHour(selectedHour === h ? null : h);
    setSelectedSubSlot(null);
  };
  const handleSubSlotClick = (s) => {
    setSelectedSubSlot(s === selectedSubSlot ? null : s);
  };

  // Selected date info for the banner
  const selDateObj = new Date(`${selectedDate}T00:00:00`);
  const dayName = selDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = selDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const pendingCount = (a) => (a || []).filter(x => (x.status || '').toLowerCase() === 'pending').length;
  const rejectedCount = (a) => (a || []).filter(x => (x.status || '').toLowerCase() === 'cancelled').length;

  const recent = useMemo(() => {
    return [...appointments]
      .filter(a => {
        const s = (a.status || '').toLowerCase();
        return s === 'pending' || s === 'cancelled';
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (parseTime(b.time)?.hour ?? 0) - (parseTime(a.time)?.hour ?? 0))
      .slice(0, 30);
  }, [appointments]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:flex-1 md:min-h-0 md:grid-rows-1">
      {/* ════════════ LEFT: Calendar (fixed) + Patient list (fills) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm shrink-0">
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/25">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">{selectedDate === today ? 'Today' : 'Selected Date'}</p>
                <p className="font-heading text-base font-bold text-foreground leading-tight">{dayName}</p>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-bold text-amber-600 leading-none">{pendingCount(approveForDate)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pending</p>
              </div>
            </div>
            {(pendingCount(approveForDate) > 0 || rejectedCount(approveForDate) > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending {pendingCount(approveForDate)}
                </span>
                {rejectedCount(approveForDate) > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> Rejected {rejectedCount(approveForDate)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Approve Appointments
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground" aria-label="Previous month">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground" aria-label="Next month">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month + Year label */}
          <p className="text-sm font-semibold text-foreground mb-2">
            {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground/60">{d}</div>
            ))}
            {Array.from({ length: getFirstDay(calDate) }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const hasPending = appointments.some(a => a.date === dateStr && (a.status || '').toLowerCase() === 'pending');
              const hasRejected = appointments.some(a => a.date === dateStr && (a.status || '').toLowerCase() === 'cancelled');
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}`}
                >
                  {day}
                  {!isSelected && (hasPending || hasRejected) && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${hasPending ? 'bg-amber-500' : 'bg-destructive'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hour slot boxes + sub-slots — under the calendar */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Select Time</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {hourSlots.map(h => {
              const count = approveForDate.filter(a => hourBoxFor(a.time) === h).length;
              return (
                <button
                  key={h}
                  onClick={() => handleHourClick(h)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors relative ${
                    selectedHour === h
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {h}
                  {count > 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${selectedHour === h ? 'text-primary-foreground/90' : 'text-primary'}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-slots — horizontal scroll */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-1.5">Select Slot</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {subSlots.map(s => {
              const count = hourAppointments.filter(a => subSlotFor(a.time) === s).length;
              return (
                <button
                  key={s}
                  onClick={() => handleSubSlotClick(s)}
                  className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors relative ${
                    selectedSubSlot === s
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                  {count > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-amber-600">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════ MIDDLE: Date header + time filter + cards (internal scroll) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {/* Date header */}
        <div className="flex items-center justify-between shrink-0">
          <h4 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {formatDisplayDate(selectedDate) || selectedDate}
          </h4>
          <span className="text-xs text-muted-foreground">
            {slotAppointments.length} request{slotAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Request cards */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {slotAppointments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center flex-1 flex flex-col items-center justify-center">
              <CheckCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {approveForDate.length === 0
                  ? 'No pending appointments for this date.'
                  : 'No results match your time filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slotAppointments.map(apt => (
                <div key={apt._id} id={`history-card-${apt._id}`} className="scroll-mt-4">
                  <ApproveCard
                    apt={apt}
                    subSlotFor={subSlotFor}
                    onViewFile={(url) => window.open(url, '_blank')}
                    onConfirm={onConfirm}
                    onRejectClick={(a) => setRejectTarget(a)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════ RIGHT: Recent requests (internal scroll) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {/* Recent requests (fills to bottom) */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex-1 min-h-0 flex flex-col">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2 shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Requests
          </h4>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No other pending requests.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map(apt => {
                  const isRejected = (apt.status || '').toLowerCase() === 'cancelled';
                  const isExpanded = expandedId === apt._id;
                  return (
                    <div key={apt._id}>
                      <div
                        onClick={() => {
                          if (isRejected) return;
                          setExpandedId(isExpanded ? null : apt._id);
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors border ${
                          isExpanded ? 'bg-muted/50 border-primary/30' : 'border-transparent hover:bg-muted/50 hover:border-border/40 cursor-pointer'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isRejected ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {(apt.patient || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{apt.patient}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {apt.time} {subSlotFor(apt.time) ? `· ${subSlotFor(apt.time)}` : ''}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 shrink-0" />
                            {formatDisplayDate(apt.date) || apt.date}
                          </p>
                        </div>
                        {isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 bg-destructive/10 text-destructive">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Confirm request"
                              onClick={(e) => { e.stopPropagation(); onConfirm(apt); }}
                              className="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center transition-colors hover:bg-success hover:text-white"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              title="Reject request"
                              onClick={(e) => { e.stopPropagation(); setRejectTarget(apt); }}
                              className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center transition-colors hover:bg-destructive hover:text-white"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {isExpanded && !isRejected && (
                        <div className="mt-2">
                          <ApproveCard
                            apt={apt}
                            subSlotFor={subSlotFor}
                            onViewFile={(url) => window.open(url, '_blank')}
                            onConfirm={onConfirm}
                            onRejectClick={(a) => setRejectTarget(a)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Shared Reject reason modal (mandatory) ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setRejectTarget(null); setRejectReasonInput(''); }}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="font-heading text-lg font-bold text-foreground">Reject Appointment</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to reject <span className="font-semibold text-foreground">{rejectTarget.patient}</span>'s appointment request. Please tell the reason for rejection (required).
            </p>
            <Textarea
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              placeholder="Tell the reason for reject… (e.g. Slot unavailable, Doctor on leave)"
              className="resize-none h-24"
              autoFocus
            />
            {rejectReasonInput.trim().length > 0 && rejectReasonInput.trim().length < 10 && (
              <p className="text-xs text-destructive mt-1">Reason must be at least 10 characters.</p>
            )}
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setRejectTarget(null); setRejectReasonInput(''); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                disabled={rejectReasonInput.trim().length < 10}
                onClick={() => {
                  onReject && onReject(rejectTarget, rejectReasonInput.trim());
                  setRejectTarget(null);
                  setRejectReasonInput('');
                }}
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Approve appointment card — SAME design as the CompletedCard in
 * TodayAppointmentsSection, but with ONLY Confirm/Reject actions.
 * Rejected appointments show the rejection reason (apt.notes).
 * ════════════════════════════════════════════════════════════ */
function ApproveCard({ apt, subSlotFor, onViewFile, onConfirm, onRejectClick }) {
  const patient = apt.patientId;
  const intake = apt.preConsultationDetails;
  const isRejected = (apt.status || '').toLowerCase() === 'cancelled';

  const [showDetails, setShowDetails] = useState(false);
  const [showIntake, setShowIntake] = useState(true);

  return (
    <div className="bg-card rounded-2xl border border-border/60 p-5 shadow-sm flex-1 flex flex-col mb-3">
      {/* Time + slot highlight banner — on top */}
      <div className={`mb-3 rounded-xl bg-gradient-to-r px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm ${
        isRejected ? 'from-destructive via-red-500 to-destructive' : 'from-amber-500 via-amber-400 to-amber-500'
      }`}>
        <Clock className="w-3.5 h-3.5 text-white" />
        <span className="text-sm font-bold text-white tracking-wide">
          {apt.time} {subSlotFor && `· ${subSlotFor(apt.time)}`}
        </span>
      </div>

      {/* Header: photo + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0 overflow-hidden">
          {patient?.avatar ? (
            <img src={patient.avatar} alt={apt.patient} className="w-full h-full object-cover" />
          ) : (
            (apt.patient || '?').slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base font-bold text-foreground truncate">{apt.patient}</h3>
          {isRejected ? (
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-semibold bg-destructive/10 text-destructive text-[10px]">
              <XCircle className="w-3 h-3" />
              Rejected
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 text-[10px]">
              <Clock className="w-3 h-3" />
              Awaiting Approval
            </div>
          )}
        </div>
      </div>

      {/* Personal details grid */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {patient?.dateOfBirth && (
          <Detail icon={User} label="Age" value={`${Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000)} yrs`} />
        )}
        {patient?.phone && (
          <Detail icon={Phone} label="Phone" value={patient.phone} />
        )}
        {patient?.email && (
          <Detail icon={Mail} label="Email" value={patient.email} />
        )}
        {patient?.gender && (
          <Detail icon={User} label="Gender" value={patient.gender} />
        )}
        {patient?.address && (
          <div className="col-span-2">
            <Detail icon={MapPin} label="Address" value={patient.address} />
          </div>
        )}
        {patient?.bloodGroup && (
          <Detail icon={Droplet} label="Blood" value={patient.bloodGroup} />
        )}
      </div>

      {/* Disease / symptoms from intake */}
      {apt.symptoms && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] font-bold uppercase text-amber-600 mb-0.5">Symptoms / Disease</p>
          <p className="text-xs text-foreground">{apt.symptoms}</p>
        </div>
      )}

      {/* Rejection reason banner */}
      {isRejected && (
        <div className="bg-destructive/5 border border-destructive/25 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] font-bold uppercase text-destructive mb-0.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Rejection Reason
          </p>
          <p className="text-xs text-foreground">{apt.notes || 'No reason provided'}</p>
        </div>
      )}

      {/* ONLY Confirm + Reject buttons (rejected cards: nothing left to do) */}
      {!isRejected && (
        <div className="grid grid-cols-2 gap-2 mb-1.5">
          <Button size="sm" className="gap-1 bg-success hover:bg-success/90 text-white" onClick={() => onConfirm && onConfirm(apt)}>
            <CheckCircle className="w-3.5 h-3.5" /> Confirm
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => onRejectClick && onRejectClick(apt)} aria-label={`Reject ${apt.patient}`}>
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
        </div>
      )}

      {/* View Details + Intake Details toggle buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline" size="sm" className={`gap-1 text-[10px] px-2 py-1 h-7 border-dashed border-border/80 hover:bg-muted/30 ${showDetails ? 'bg-primary/10 text-primary border-primary/40' : ''}`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info className="w-3 h-3 text-muted-foreground" /> View Details
        </Button>
        <Button
          variant="outline" size="sm" className={`gap-1 text-[10px] px-2 py-1 h-7 border-dashed border-border/80 hover:bg-muted/30 ${showIntake ? 'bg-primary/10 text-primary border-primary/40' : ''}`}
          onClick={() => setShowIntake(!showIntake)}
        >
          <FileText className="w-3 h-3 text-muted-foreground" /> Intake Details
        </Button>
      </div>

      {/* View Details dropdown */}
      {showDetails && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" /> Appointment Details
          </h4>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <div>
                <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/60">Doctor</p>
                <p className="text-sm font-bold">{apt.doctorName || apt.doctor || apt.doctorId?.name || 'Doctor'}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isRejected ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {isRejected ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {isRejected ? 'Rejected' : 'Pending'}
              </span>
            </div>
            <IntakeRow label="Patient" value={apt.patient} />
            <IntakeRow label="Date" value={formatDisplayDate(apt.date)} />
            <IntakeRow label="Time" value={apt.time} />
            <IntakeRow label="Fee" value={`₹${apt.fees || 0}`} />
            {apt.transactionId && <IntakeRow label="Transaction" value={apt.transactionId} />}
            {apt.invoiceId && <IntakeRow label="Invoice" value={apt.invoiceId} />}

            <div className="pt-2 border-t border-border/50 mt-2">
              <h5 className="text-xs font-bold text-foreground mb-2">Patient Contact</h5>
              <IntakeRow label="Phone" value={patient?.phone || 'N/A'} />
              <IntakeRow label="Email" value={patient?.email || 'N/A'} />
              <IntakeRow label="Requested On" value={apt.createdAt ? new Date(apt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'} />
            </div>
          </div>
        </div>
      )}

      {/* Intake Form dropdown */}
      {showIntake && (
        <div className="mt-3 bg-muted/20 rounded-xl p-4 border border-border/40">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" /> Quick Intake Form
          </h4>
          {intake ? (
            <div className="space-y-2.5">
              <IntakeRow label="Chief Complaint" value={
                intake.chiefComplaint === 'Other' ? intake.chiefComplaintOther : intake.chiefComplaint
              } />
              {intake.symptomsDuration && <IntakeRow label="Duration" value={intake.symptomsDuration} />}
              <IntakeRow label="Past Medical History" value={
                intake.pastMedicalHistory?.hasHistory === false ? 'No' :
                intake.pastMedicalHistory?.hasHistory === true ? (intake.pastMedicalHistory?.details || 'Yes') : '—'
              } />
              <IntakeRow label="Past Treatment" value={
                intake.currentTreatment?.hasPastTreatment === false ? 'No' :
                intake.currentTreatment?.hasPastTreatment === true ? [
                  intake.currentTreatment?.doctorName,
                  intake.currentTreatment?.cityState,
                  intake.currentTreatment?.when,
                ].filter(Boolean).join(', ') || 'Yes' : '—'
              } />
              {intake.currentTreatment?.hasPastTreatment && intake.currentTreatment?.prescriptionFile && (
                <IntakeRow label="Prescription" value={
                  <button onClick={() => onViewFile && onViewFile(intake.currentTreatment.prescriptionFile)} className="text-primary underline hover:text-primary/80">View File</button>
                } />
              )}
              {intake.currentTreatment?.hasPastTreatment && (
                <IntakeRow label="Taking Medicines" value={
                  intake.currentTreatment?.takingMedicines === true ? 'Yes' : intake.currentTreatment?.takingMedicines === false ? 'No' : '—'
                } />
              )}
              <IntakeRow label="Test Reports" value={
                intake.testReports?.hasReports === false ? 'No' :
                intake.testReports?.hasReports === true ? (
                  intake.testReports?.reportFile ?
                    <button onClick={() => onViewFile && onViewFile(intake.testReports.reportFile)} className="text-primary underline hover:text-primary/80">View File</button>
                    : 'Yes'
                ) : '—'
              } />
              <IntakeRow label="Current Medicines" value={
                intake.currentMedications?.hasMedications === false ? 'No' :
                intake.currentMedications?.hasMedications === true ? (intake.currentMedications?.details || 'Yes') : '—'
              } />
              <IntakeRow label="Allergies" value={
                intake.allergies?.hasAllergies === false ? 'No' :
                intake.allergies?.hasAllergies === true ? (intake.allergies?.details || 'Yes') : '—'
              } danger={intake.allergies?.hasAllergies === true} />
              <IntakeRow label="Family History" value={
                intake.familyHistory?.hasHistory === false ? 'No' :
                intake.familyHistory?.hasHistory === true ? (intake.familyHistory?.details || 'Yes') : '—'
              } />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No pre-consultation details available.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small helpers ── */
function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground/60">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function IntakeRow({ label, value, danger = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs text-right font-medium truncate ${danger ? 'text-destructive font-semibold' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
