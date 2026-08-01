import { useState, useMemo } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Search, CheckCircle,
  Phone, Mail, FileText, History, CalendarCheck2, TrendingUp, User,
  BarChart3, Award, Trophy,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { 
  parseTime, subSlotFor, getHourSlots, getSubSlotsForHour, hourBoxFor 
} from '@/lib/timeSlots';
import { CompletedCard } from '@/components/TodayAppointmentsSection';

/**
 * Appointment History Section — shows completed appointments for any selected date.
 * Mirrors the "Today Appointments" layout: 3 filling columns, calendar left,
 * search + time-ordered cards in the middle (internal scroll), summary right.
 *
 * Props:
 *  - appointments: all appointments for the doctor (completed are derived)
 */
export default function AppointmentHistorySection({ appointments }) {
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getISTDateString());

  const today = getISTDateString();

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // All completed appointments for the selected date
  const completedForDate = useMemo(
    () => appointments.filter(a => a.date === selectedDate && (a.status || '').toLowerCase() === 'completed'),
    [appointments, selectedDate]
  );
  const filtered = completedForDate;

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

  // Summary stats
  const monthTotal = useMemo(() => {
    const y = selectedDate.slice(0, 4);
    const m = selectedDate.slice(5, 7);
    return appointments.filter(a =>
      (a.date || '').startsWith(`${y}-${m}`) && (a.status || '').toLowerCase() === 'completed'
    ).length;
  }, [appointments, selectedDate]);

  // ── Status overview (all completed appointments, any date) ──
  const completedAll = useMemo(
    () => appointments.filter(a => (a.status || '').toLowerCase() === 'completed'),
    [appointments]
  );

  const todayCount = useMemo(
    () => completedAll.filter(a => a.date === today).length,
    [completedAll, today]
  );

  // Monday start of the current week (Sun → treats it as end of previous week)
  const weekStart = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    const monday = new Date(y, m - 1, d - (wd === 0 ? 6 : wd - 1));
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }, [today]);

  const weekCount = useMemo(
    () => completedAll.filter(a => (a.date || '') >= weekStart).length,
    [completedAll, weekStart]
  );

  const last7Count = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const ago = new Date(y, m - 1, d - 6);
    const agoStr = `${ago.getFullYear()}-${String(ago.getMonth() + 1).padStart(2, '0')}-${String(ago.getDate()).padStart(2, '0')}`;
    return completedAll.filter(a => (a.date || '') >= agoStr).length;
  }, [completedAll, today]);

  const monthCount = useMemo(
    () => completedAll.filter(a => (a.date || '').startsWith(today.slice(0, 7))).length,
    [completedAll, today]
  );

  const yearCount = useMemo(
    () => completedAll.filter(a => (a.date || '').startsWith(today.slice(0, 4))).length,
    [completedAll, today]
  );

  const allTimeCount = completedAll.length;

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
      .filter(a => (a.status || '').toLowerCase() === 'completed' && a.date !== selectedDate)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || parseTime(b.time) - parseTime(a.time));
  }, [appointments, selectedDate]);
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
                <p className="font-heading text-2xl font-bold text-primary leading-none">{completedForDate.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
              </div>
            </div>
            {completedForDate.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Completed {completedForDate.length}
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
              const hasCompleted = appointments.some(a => a.date === dateStr && (a.status || '').toLowerCase() === 'completed');
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all
                    ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted'}`}
                >
                  {day}
                  {hasCompleted && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-success" />
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
        {/* Date header */}
        <div className="flex items-center justify-between shrink-0">
          <h4 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {formatDisplayDate(selectedDate) || selectedDate}
          </h4>
          <span className="text-xs text-muted-foreground">
            {slotAppointments.length} completed appointment{slotAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Completed appointments list */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin flex flex-col">
          {slotAppointments.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-8 text-center flex-1 flex flex-col items-center justify-center">
              <CheckCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {completedForDate.length === 0
                  ? 'No completed appointments for this date.'
                  : 'No results match your time filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {slotAppointments.map((apt, i) => (
                <div key={apt._id || i} id={`history-card-${apt._id}`} className="scroll-mt-4">
                  <CompletedCard 
                    apt={apt} 
                    onViewFile={(url) => window.open(url, '_blank')}
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

        {/* Status overview — completed patients by time range */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm shrink-0">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Status Overview
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <StatusTile icon={Clock} label="Today" value={todayCount} />
            <StatusTile icon={CalendarDays} label="Last 7 Days" value={last7Count} />
            <StatusTile icon={CalendarCheck2} label="This Week" value={weekCount} tone="success" />
            <StatusTile icon={TrendingUp} label="This Month" value={monthCount} tone="success" />
            <StatusTile icon={Award} label="This Year" value={yearCount} tone="warning" />
            <StatusTile icon={History} label="All Time" value={allTimeCount} tone="warning" />
          </div>
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

        {/* Recent completed (fills to bottom) */}
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-sm flex-1 min-h-0 flex flex-col">
          <h4 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2 shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" /> Recent Completed
          </h4>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin">
            {recent.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No other completed appointments yet.</p>
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
                    <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center text-xs font-bold text-success shrink-0">
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
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success whitespace-nowrap shrink-0">
                      <CheckCircle className="w-3 h-3" />
                      {completionLabel(apt)}
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
