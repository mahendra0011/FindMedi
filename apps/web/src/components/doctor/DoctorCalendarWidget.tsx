'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Appointment } from '@/types/models/appointment';

export interface DoctorCalendarWidgetProps {
  appointments: Appointment[];
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  calDate: Date;
  onCalDateChange: (date: Date) => void;
  view: string;
  pendingAppointments: Appointment[];
}

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

/**
 * Shared calendar widget for the doctor appointments screen:
 * today summary banner + month grid with appointment dots.
 */
export function DoctorCalendarWidget({
  appointments,
  today,
  selectedDate,
  onSelectDate,
  calDate,
  onCalDateChange,
  view,
  pendingAppointments,
}: DoctorCalendarWidgetProps) {
  const todayAppts = appointments.filter((a) => a.date === today);
  const confirmed = todayAppts.filter((a) => (a.status || '').toLowerCase() === 'confirmed').length;
  const completed = todayAppts.filter((a) => (a.status || '').toLowerCase() === 'completed').length;
  const pending = todayAppts.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
  const todayDateObj = new Date(`${today}T00:00:00`);
  const dayName = todayDateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateLabel = todayDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bg-card rounded-[24px] border border-border/60 p-5 shadow-sm">
      <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Today</p>
            <p className="font-heading text-base font-bold text-foreground leading-tight">{dayName}</p>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-2xl font-bold text-primary leading-none">{todayAppts.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Appointments</p>
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
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info">
                <span className="w-1.5 h-1.5 rounded-full bg-info" /> Done {completed}
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

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-foreground">
            {view === 'approve' ? 'Pending Requests' : 'Appointments Overview'}
          </h3>
          {view === 'approve' && pendingAppointments.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600">
              {pendingAppointments.length} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCalDateChange(new Date(calDate.getFullYear(), calDate.getMonth() - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCalDateChange(new Date(calDate.getFullYear(), calDate.getMonth() + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-3">
        {calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
          <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground/50 pb-1">
            {d}
          </div>
        ))}
        {Array.from({ length: getFirstDay(calDate) }).map((_, i) => (
          <div key={`e-${i}`} />
        ))}
        {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const hasAppts =
            view === 'approve'
              ? pendingAppointments.some((a) => a.date === dateStr)
              : appointments.some((a) => a.date === dateStr);
          const count = view === 'approve' ? pendingAppointments.filter((a) => a.date === dateStr).length : 0;
          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`relative w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all
                ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30' : 'text-foreground hover:bg-muted/70'}`}
            >
              {day}
              {view === 'approve'
                ? count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold">
                      {count > 9 ? '9+' : count}
                    </span>
                  )
                : hasAppts && !isSelected && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
      {view === 'approve' && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending requests
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" /> Today
          </span>
        </div>
      )}
    </div>
  );
}
