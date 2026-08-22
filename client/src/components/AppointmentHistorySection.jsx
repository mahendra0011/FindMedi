import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Search, CheckCircle,
  Phone, Mail, FileText, History, CalendarCheck2, TrendingUp, User,
  BarChart3, Award, Trophy, UserX, ChevronUp, ChevronDown,
  IndianRupee, CreditCard, Smartphone, Landmark, Wallet, Loader2,
  Hash, Ticket, Cake, Droplet, Stethoscope, Beaker, Pill,
  Download, RotateCcw, AlertCircle, MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { resolveFileUrl, isValidFileUrl, api, downloadPaymentInvoice, downloadBillPdf } from '@/lib/api';
import { 
  parseTime, subSlotFor, getHourSlots, getSubSlotsForHour, hourBoxFor 
} from '@/lib/timeSlots';
import { CompletedCard } from '@/components/TodayAppointmentsSection';
import { toast } from 'sonner';

/**
 * Appointment History Section — shows completed appointments for any selected date.
 * Mirrors the "Today Appointments" layout: 3 filling columns, calendar left,
 * search + time-ordered cards in the middle (internal scroll), summary right.
 *
 * Props:
 *  - appointments: all appointments for the doctor (completed are derived)
 */

// Count appointments across time ranges (used for the Status Overview panel)
const countStats = (list, today) => {
  const [y, m, d] = today.split('-').map(Number);
  const ago7 = new Date(y, m - 1, d - 6);
  const ago7Str = `${ago7.getFullYear()}-${String(ago7.getMonth() + 1).padStart(2, '0')}-${String(ago7.getDate()).padStart(2, '0')}`;
  const ago6m = new Date(y, m - 6, 1);
  const ago6mStr = `${ago6m.getFullYear()}-${String(ago6m.getMonth() + 1).padStart(2, '0')}`;
  return {
    today: list.filter(a => a.date === today).length,
    last7: list.filter(a => (a.date || '') >= ago7Str).length,
    month: list.filter(a => (a.date || '').startsWith(today.slice(0, 7))).length,
    last6m: list.filter(a => (a.date || '') >= ago6mStr).length,
    year: list.filter(a => (a.date || '').startsWith(today.slice(0, 4))).length,
    all: list.length,
  };
};
export default function AppointmentHistorySection({ appointments }) {
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());
  const [viewMode, setViewMode] = useState('complete'); // 'complete' | 'absent' | 'payments'
  const [showMore, setShowMore] = useState(false);

  // ── Payment history (patient ne is doctor ko jo payments kiye) ──
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const res = await api.getTransactions({ limit: 100 });
      const list = res?.data || res?.payments || [];
      setPayments(list);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payment history');
    }
    setPaymentsLoading(false);
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    if (!paymentSearch.trim()) return payments;
    const q = paymentSearch.toLowerCase();
    return payments.filter(t =>
      (t.patient_name || '').toLowerCase().includes(q) ||
      (t.patient?.name || '').toLowerCase().includes(q) ||
      (t.patient?.phone || '').toLowerCase().includes(q) ||
      (t.patient?.email || '').toLowerCase().includes(q) ||
      (t.transaction_id || '').toLowerCase().includes(q) ||
      (t.invoice_id || '').toLowerCase().includes(q)
    );
  }, [payments, paymentSearch]);

  const paymentStats = useMemo(() => ({
    total: payments.filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0),
    completed: payments.filter(t => t.status === 'completed').length,
    pending: payments.filter(t => t.status === 'pending').length,
    failed: payments.filter(t => t.status === 'failed').length,
    refunded: payments.filter(t => t.status === 'refunded').length,
  }), [payments]);

  const today = getISTDateString();

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // All completed (or absent) appointments for the selected date — switch ke hisaab se
  const modeForDate = useMemo(
    () => appointments.filter(a => a.date === selectedDate && (a.status || '').toLowerCase() === (viewMode === 'complete' ? 'completed' : 'missed')),
    [appointments, selectedDate, viewMode]
  );
  const filtered = modeForDate;

  // Most recently completed first (by consultation end time, fallback to slot time)
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      const ta = a.consultationEndTime ? new Date(a.consultationEndTime).getTime() : (parseTime(a.time).hour || 0) * 60;
      const tb = b.consultationEndTime ? new Date(b.consultationEndTime).getTime() : (parseTime(b.time).hour || 0) * 60;
      return tb - ta;
    }),
    [filtered]
  );

  const completionTimeLabel = (a) => {
    const t = a.consultationEndTime || a.updatedAt || a.createdAt;
    return t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  };
  const completionLabel = (a) => completionTimeLabel(a) || 'Completed';

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

  // Selected date info for the banner
  const selDateObj = new Date(`${selectedDate}T00:00:00`);
  const dayName = selDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = selDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  // ── Status overview (BOTH completed and absent counts, independent of switch) ──
  const completedAll = useMemo(
    () => appointments.filter(a => (a.status || '').toLowerCase() === 'completed'),
    [appointments]
  );
  const absentAll = useMemo(
    () => appointments.filter(a => (a.status || '').toLowerCase() === 'missed'),
    [appointments]
  );

  const completedStats = useMemo(() => countStats(completedAll, today), [completedAll, today]);
  const absentStats = useMemo(() => countStats(absentAll, today), [absentAll, today]);

  // Average completed per active day since the first completed appointment
  const avgPerDay = useMemo(() => {
    if (!completedAll.length) return 0;
    const dates = completedAll.map(a => a.date || '').filter(Boolean).sort();
    const first = dates[0];
    const days = Math.max(1, Math.floor((new Date(today) - new Date(first)) / 86400000) + 1);
    return (completedAll.length / days).toFixed(1);
  }, [completedAll, today]);

  // Date with the most completed appointments
  const busiestDay = useMemo(() => {
    const map = {};
    completedAll.forEach(a => {
      const d = a.date || '';
      map[d] = (map[d] || 0) + 1;
    });
    let best = null;
    Object.entries(map).forEach(([d, c]) => {
      if (!best || c > best.count) best = { date: d, count: c };
    });
    return best;
  }, [completedAll]);

  const recent = useMemo(() => {
    return [...appointments]
      .filter(a => (a.status || '').toLowerCase() === (viewMode === 'complete' ? 'completed' : 'missed') && a.date !== selectedDate)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || parseTime(b.time) - parseTime(a.time));
  }, [appointments, selectedDate, viewMode]);
  const handleHourClick = (h) => {
    setSelectedHour(selectedHour === h ? null : h); // toggle
    setSelectedSubSlot(null);
  };

  const handleSubSlotClick = (s) => {
    setSelectedSubSlot(s === selectedSubSlot ? null : s);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:flex-1 md:min-h-0 md:grid-rows-1">
      {/* ════════════ LEFT: Calendar (fixed) + Summary (fills) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm shrink-0">
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">{selectedDate === today ? 'Today' : 'Selected Date'}</p>
                <p className="font-heading text-base font-bold text-foreground leading-tight">{dayName}</p>
                <p className="text-xs text-muted-foreground">{dateLabel}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-bold text-primary leading-none">{modeForDate.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{viewMode === 'complete' ? 'Completed' : 'Absent'}</p>
              </div>
            </div>
            {modeForDate.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${viewMode === 'complete' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${viewMode === 'complete' ? 'bg-success' : 'bg-destructive'}`} /> {viewMode === 'complete' ? 'Completed' : 'Absent'} {modeForDate.length}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Appointment History
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
              const hasCompleted = appointments.some(a => a.date === dateStr && (a.status || '').toLowerCase() === (viewMode === 'complete' ? 'completed' : 'missed'));
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}`}
                >
                  {day}
                  {hasCompleted && !isSelected && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${viewMode === 'complete' ? 'bg-success' : 'bg-destructive'}`} />
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
              const count = sorted.filter(a => hourBoxFor(a.time) === h).length;
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
                    <span className="ml-1 text-[10px] font-bold text-success">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════ MIDDLE: Search + History cards (internal scroll) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">
        {/* Complete / Absent / Payments switch */}
        <div className="flex items-center justify-between shrink-0 gap-3">
          <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
            <button
              onClick={() => setViewMode('complete')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'complete' ? 'bg-card text-success shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </button>
            <button
              onClick={() => setViewMode('absent')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'absent' ? 'bg-card text-destructive shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserX className="w-3.5 h-3.5" /> Absent
            </button>
            <button
              onClick={() => setViewMode('payments')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'payments' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" /> Payments
            </button>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
            viewMode === 'complete' ? 'bg-success/10 text-success' : viewMode === 'absent' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            {viewMode === 'complete' ? 'Completed patients' : viewMode === 'absent' ? 'Missed appointments' : `${payments.length} payments`}
          </span>
        </div>

        {/* Date header */}
        <div className="flex items-center justify-between shrink-0">
          <h4 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            {viewMode === 'payments' ? (
              <IndianRupee className="w-4 h-4 text-primary" />
            ) : (
              <CalendarDays className="w-4 h-4 text-primary" />
            )}
            {viewMode === 'payments' ? 'Payment History' : (formatDisplayDate(selectedDate) || selectedDate)}
          </h4>
          <span className="text-xs text-muted-foreground">
            {viewMode === 'payments'
              ? `${filteredPayments.length} payment${filteredPayments.length !== 1 ? 's' : ''}`
              : `${slotAppointments.length} ${viewMode === 'complete' ? 'completed' : 'absent'} appointment${slotAppointments.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Completed appointments list */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {viewMode === 'payments' ? (
            <>
              {/* Payment search */}
              <div className="relative mb-3 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by patient, phone, txn / invoice ID…"
                  value={paymentSearch}
                  onChange={e => setPaymentSearch(e.target.value)}
                  className="pl-8 h-9 text-xs w-full"
                />
              </div>
              {paymentsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="bg-card rounded-2xl border border-border/60 p-8 text-center flex-1 flex flex-col items-center justify-center">
                  <IndianRupee className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {payments.length === 0
                      ? 'No payments received yet. When patients pay for appointments, they appear here.'
                      : 'No payments match your search.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((txn) => (
                    <PaymentCard key={txn._id} txn={txn} />
                  ))}
                </div>
              )}
            </>
          ) : slotAppointments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center flex-1 flex flex-col items-center justify-center">
              {viewMode === 'complete'
                ? <CheckCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                : <UserX className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />}
              <p className="text-sm text-muted-foreground">
                {modeForDate.length === 0
                  ? (viewMode === 'complete' ? 'No completed appointments for this date.' : 'No absent patients for this date.')
                  : 'No results match your time filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slotAppointments.map((apt, i) => (
                <div key={apt._id || i} id={`history-card-${apt._id}`} className="scroll-mt-4">
                  <CompletedCard 
                    apt={apt} 
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
      </div>

      {/* ════════════ RIGHT: Status overview + Recent (internal scroll) ════════════ */}
      <div className="space-y-4 flex flex-col md:min-h-0">

        {/* Status overview — completed + absent counts (both shown together) */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Status Overview
          </h4>

          {/* Completed group */}
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-success">Completed</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatusTile icon={Clock} label="Today Appointments" value={completedStats.today} />
            <StatusTile icon={CalendarDays} label="Last 7 Days Appointments" value={completedStats.last7} />
            <StatusTile icon={CalendarCheck2} label="This Month Appointments" value={completedStats.month} tone="success" />
            {showMore && (
              <>
                <StatusTile icon={History} label="Last 6 Months Appointments" value={completedStats.last6m} tone="warning" />
                <StatusTile icon={Award} label="This Year Appointments" value={completedStats.year} tone="warning" />
                <StatusTile icon={BarChart3} label="All Appointments" value={completedStats.all} tone="warning" />
              </>
            )}
          </div>

          {/* Absent group */}
          <div className="flex items-center gap-1.5 mt-4 mb-2">
            <UserX className="w-3.5 h-3.5 text-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Absent</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatusTile icon={Clock} label="Today Absent" value={absentStats.today} tone="danger" />
            <StatusTile icon={CalendarDays} label="Last 7 Days Absent" value={absentStats.last7} tone="danger" />
            <StatusTile icon={CalendarCheck2} label="This Month Absent" value={absentStats.month} tone="danger" />
            {showMore && (
              <>
                <StatusTile icon={History} label="Absent 6 Months" value={absentStats.last6m} tone="danger" />
                <StatusTile icon={Award} label="This Year Absents" value={absentStats.year} tone="danger" />
                <StatusTile icon={BarChart3} label="All Absents" value={absentStats.all} tone="danger" />
              </>
            )}
          </div>

          <button
            onClick={() => setShowMore(!showMore)}
            className="mt-4 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            {showMore ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> More</>
            )}
          </button>
          <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Avg / Day</span>
              <span className="font-bold text-foreground">{avgPerDay}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3 h-3 text-warning" /> Busiest Day
              </span>
              <span className="font-bold text-foreground">
                {busiestDay ? `${formatDisplayDate(busiestDay.date)} · ${busiestDay.count} patients` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent completed/absent (fills to bottom) */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex-1 min-h-0 flex flex-col">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2 shrink-0">
            {viewMode === 'payments'
              ? <IndianRupee className="w-4 h-4 text-primary" />
              : viewMode === 'complete'
                ? <TrendingUp className="w-4 h-4 text-primary" />
                : <UserX className="w-4 h-4 text-destructive" />}
            {viewMode === 'payments' ? 'Payment Summary' : viewMode === 'complete' ? 'Recent Completed' : 'Recent Absent'}
          </h4>
          {viewMode === 'payments' && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Total Collected</p>
                  <p className="font-heading text-lg font-bold text-foreground mt-0.5">₹{paymentStats.total.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Paid Count</p>
                  <p className="font-heading text-lg font-bold text-foreground mt-0.5">{paymentStats.completed}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Pending</p>
                  <p className="font-heading text-lg font-bold text-foreground mt-0.5">{paymentStats.pending}</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500">Failed</p>
                  <p className="font-heading text-lg font-bold text-foreground mt-0.5">{paymentStats.failed}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] pb-2 border-b border-border/40 mb-2 shrink-0">
                <span className="text-muted-foreground">Refunded</span>
                <span className="font-bold text-foreground">{paymentStats.refunded}</span>
              </div>
            </>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {viewMode === 'payments' ? (
              payments.slice(0, 12).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                  <IndianRupee className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No payments yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 12).map((txn, i) => (
                    <button
                      key={txn._id || i}
                      onClick={() => setViewMode('payments')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-muted/50 border border-transparent hover:border-border/40"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {(txn.patient_name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{txn.patient_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="w-3 h-3 shrink-0" />
                          {txn.transaction_id}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 shrink-0" />
                          {formatDateTime(txn.createdAt)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 bg-emerald-500/10 text-emerald-600">
                        ₹{txn.amount?.toLocaleString('en-IN') || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )
            ) : recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                {viewMode === 'complete'
                  ? <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  : <UserX className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />}
                <p className="text-xs text-muted-foreground">
                  {viewMode === 'complete' ? 'No other completed appointments yet.' : 'No absent patients yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((apt, i) => (
                  <button
                    key={apt._id || i}
                    onClick={() => {
                      setSelectedDate(apt.date);
                      setTimeout(() => {
                        document.getElementById(`history-card-${apt._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 60);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors hover:bg-muted/50 border border-transparent hover:border-border/40"
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${viewMode === 'complete' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
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
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap shrink-0 ${viewMode === 'complete' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {viewMode === 'complete'
                        ? <CheckCircle className="w-3 h-3" />
                        : <UserX className="w-3 h-3" />}
                      {viewMode === 'complete' ? completionLabel(apt) : 'Absent'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Status tile for the Status Overview panel ── */
function StatusTile({ icon: Icon, label, value, tone = 'primary' }) {
  const toneMap = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={`w-3.5 h-3.5 ${toneMap[tone] || toneMap.primary} shrink-0`} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{label}</span>
      </div>
      <p className="font-heading text-xl font-bold text-foreground leading-tight">{value}</p>
    </div>
  );
}

/* ── Payment helpers ── */
const paymentStatusConfig = {
  completed: { label: 'Paid', color: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-600', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-blue-500/10 text-blue-600', icon: RotateCcw },
};
const methodIcons = { card: CreditCard, upi: Smartphone, netbanking: Landmark, cash: Wallet };

function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatShortDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} yrs` : '';
}

function PayInfoRow({ icon: Icon, label, value, color = 'text-muted-foreground' }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
      <span className="text-[11px] text-muted-foreground min-w-[72px]">{label}:</span>
      <span className="text-xs font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

/* ── Payment card — patient ne doctor ko kiya payment, full details ke saath ── */
function PaymentCard({ txn }) {
  const isAppt = txn.serviceType === 'appointment';
  const isTest = txn.serviceType === 'test';
  const isMed = txn.serviceType === 'medicine';
  const patient = txn.patient || {};
  const ref = txn.reference || {};

  const StatusIcon = paymentStatusConfig[txn.status]?.icon || CheckCircle;
  const MethodIcon = methodIcons[txn.method] || CreditCard;
  const TypeIcon = isAppt ? Stethoscope : isTest ? Beaker : Pill;
  const typeBadgeColor = isAppt ? 'bg-blue-500/10 text-blue-600' : isTest ? 'bg-purple-500/10 text-purple-600' : 'bg-rose-500/10 text-rose-600';
  const serviceName = isAppt ? 'Appointment Booking' : isTest ? 'Lab Test' : 'Medicine Order';
  const typeLabel = isAppt ? 'Appointment' : isTest ? 'Lab Test' : 'Medicine';
  const fullAddress = [patient.address, patient.city, patient.state].filter(Boolean).join(', ');

  return (
    <div key={txn._id} className="bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-lg transition-all">
      <div className="p-5">
        {/* Top row: type + status + amount */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeBadgeColor}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadgeColor}`}>
                  <TypeIcon className="w-3 h-3" /> {typeLabel}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${paymentStatusConfig[txn.status]?.color || ''}`}>
                  <StatusIcon className="w-3 h-3" /> {paymentStatusConfig[txn.status]?.label || txn.status}
                </span>
              </div>
              <p className="font-heading font-semibold text-foreground text-sm">{serviceName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{txn.description || ''}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-heading text-xl font-bold text-foreground">₹{txn.amount?.toLocaleString('en-IN') || 0}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDateTime(txn.createdAt)}</p>
          </div>
        </div>

        {/* Patient details */}
        <div className="bg-muted/20 rounded-xl border border-border/30 p-4 mb-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <User className="w-3 h-3" /> Patient Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <PayInfoRow icon={User} label="Full Name" value={patient.name || txn.patient_name || 'N/A'} color="text-primary" />
            <PayInfoRow icon={Cake} label="Age" value={calcAge(patient.dateOfBirth)} color="text-blue-500" />
            <PayInfoRow icon={User} label="Gender" value={patient.gender} color="text-purple-500" />
            <PayInfoRow icon={Droplet} label="Blood Group" value={patient.bloodGroup} color="text-red-500" />
            <PayInfoRow icon={Phone} label="Phone" value={patient.phone} color="text-emerald-500" />
            <PayInfoRow icon={Mail} label="Email" value={patient.email} color="text-cyan-500" />
            <div className="sm:col-span-2">
              <PayInfoRow icon={MapPin} label="Address" value={fullAddress} color="text-amber-500" />
            </div>
          </div>
        </div>

        {/* Payment & transaction details */}
        <div className="bg-muted/10 rounded-xl border border-border/20 p-4 mb-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Hash className="w-3 h-3" /> Payment & Transaction Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <PayInfoRow icon={IndianRupee} label="Fee Paid" value={`₹${txn.amount?.toLocaleString('en-IN') || 0}`} color="text-orange-500" />
            <PayInfoRow icon={MethodIcon} label="Method" value={(txn.method || '').toUpperCase()} color="text-emerald-500" />
            <PayInfoRow icon={CalendarDays} label="Date & Time" value={formatDateTime(txn.createdAt)} color="text-blue-500" />
            <PayInfoRow icon={StatusIcon} label="Status" value={paymentStatusConfig[txn.status]?.label || txn.status} color={paymentStatusConfig[txn.status]?.color?.split(' ')[1] || 'text-muted-foreground'} />
            <PayInfoRow icon={Hash} label="Transaction ID" value={txn.transaction_id} color="text-muted-foreground" />
            <PayInfoRow icon={Ticket} label="Invoice ID" value={txn.invoice_id} color="text-cyan-500" />
            <PayInfoRow icon={FileText} label="Bill ID" value={txn.invoice_id ? txn.invoice_id.replace(/INV/i, 'BILL') : ''} color="text-violet-500" />
            {isAppt && ref.appointmentDate && (
              <PayInfoRow icon={CalendarDays} label="Appt Date" value={`${formatShortDate(ref.appointmentDate)}, ${ref.appointmentTime || ''}`} color="text-blue-500" />
            )}
            {isAppt && ref.tokenNumber && (
              <PayInfoRow icon={Ticket} label="Token No." value={ref.tokenNumber} color="text-emerald-500" />
            )}
            {isAppt && ref.doctorName && (
              <PayInfoRow icon={Stethoscope} label="Doctor" value={`Dr. ${ref.doctorName.replace('Dr. ', '')}`} color="text-primary" />
            )}
            {isTest && ref.bookingId && (
              <PayInfoRow icon={Hash} label="Booking ID" value={ref.bookingId} color="text-cyan-500" />
            )}
            {isMed && ref.orderId && (
              <PayInfoRow icon={Hash} label="Order ID" value={ref.orderId} color="text-rose-500" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
          <Button size="sm" variant="ghost" className="gap-1.5 rounded-xl h-9 text-xs"
            onClick={() => {
              const billName = txn.invoice_id ? txn.invoice_id.replace('INV', 'BILL') : 'bill';
              downloadBillPdf(txn._id, `${billName}.pdf`).catch(err => toast.error(err.message));
            }}>
            <Download className="w-3.5 h-3.5" /> Download Bill
          </Button>
          {txn.status === 'completed' && (
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl h-9 text-xs"
              onClick={() => downloadPaymentInvoice(txn._id, `${txn.invoice_id || 'invoice'}.pdf`).catch(err => toast.error(err.message))}>
              <Download className="w-3.5 h-3.5" /> Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
