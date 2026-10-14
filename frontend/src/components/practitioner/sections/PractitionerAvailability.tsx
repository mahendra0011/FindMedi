import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle, ChevronRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PractitionerDTO } from './PractitionerHeader';

interface PractitionerAvailabilityProps {
  practitioner: PractitionerDTO;
  onSelectSlot?: (slot: { date: string; time: string }) => void;
}

export default function PractitionerAvailability({
  practitioner,
  onSelectSlot,
}: PractitionerAvailabilityProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0);

  // Generate next 7 days for preview
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      index: i,
      dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNumber: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      fullDate: d.toISOString().split('T')[0],
      isToday: i === 0,
      isOff: i === 6, // Sunday off sample
    };
  });

  const slotsByDay: Record<string, string[]> = {
    morning: ['09:30 AM', '10:00 AM', '10:30 AM', '11:15 AM', '11:45 AM'],
    afternoon: ['01:00 PM', '02:30 PM', '03:15 PM'],
    evening: ['05:00 PM', '05:45 PM', '06:30 PM', '07:15 PM', '08:00 PM'],
  };

  const weeklySchedule = [
    { day: 'Monday', hours: '09:30 AM – 01:00 PM, 05:00 PM – 08:30 PM', status: 'Available' },
    { day: 'Tuesday', hours: '09:30 AM – 01:00 PM, 05:00 PM – 08:30 PM', status: 'Available' },
    { day: 'Wednesday', hours: '09:30 AM – 01:00 PM, 05:00 PM – 08:30 PM', status: 'Available' },
    { day: 'Thursday', hours: '09:30 AM – 01:00 PM, 05:00 PM – 08:30 PM', status: 'Available' },
    { day: 'Friday', hours: '09:30 AM – 01:00 PM, 05:00 PM – 08:30 PM', status: 'Available' },
    { day: 'Saturday', hours: '10:00 AM – 02:00 PM (Morning Only)', status: 'Limited Slots' },
    { day: 'Sunday', hours: 'Closed (Emergency on-call only)', status: 'Off-day' },
  ];

  return (
    <div className="bg-card rounded-3xl border border-border/60 p-6 space-y-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-bold text-foreground">Doctor Availability & Slot Calendar</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
          <Zap className="w-3.5 h-3.5 fill-emerald-600" /> Live Availability Sync
        </div>
      </div>

      {/* Date Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Select Date for Slots</span>
          <span>Next 7 days</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {days.map((item) => (
            <button
              key={item.index}
              type="button"
              onClick={() => setSelectedDay(item.index)}
              className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[80px] py-2.5 px-2 rounded-2xl border text-xs transition-all ${
                selectedDay === item.index
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm font-bold'
                  : item.isOff
                  ? 'bg-muted/40 text-muted-foreground border-border/40 opacity-70'
                  : 'bg-card text-foreground border-border/60 hover:border-primary/40'
              }`}
            >
              <span className="text-[10px] uppercase font-semibold">
                {item.isToday ? 'Today' : item.dayName}
              </span>
              <span className="text-base font-extrabold my-0.5">{item.dateNumber}</span>
              <span className="text-[10px] opacity-80">{item.month}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Slots for selected day */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
        {days[selectedDay].isOff ? (
          <div className="py-6 text-center text-xs text-muted-foreground space-y-1">
            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="font-bold text-foreground">Practitioner is Off on this Day</p>
            <p>Please select another day or choose emergency tele-consultation if urgent.</p>
          </div>
        ) : (
          <>
            {/* Morning */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Morning Sessions (9:30 AM - 12:00 PM)
              </span>
              <div className="flex flex-wrap gap-2">
                {slotsByDay.morning.map((slot, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSlot?.({ date: days[selectedDay].fullDate, time: slot })}
                    className="h-8 text-xs font-medium rounded-xl hover:bg-primary hover:text-primary-foreground border-border/60"
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>

            {/* Afternoon */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-500" /> Afternoon Sessions (1:00 PM - 4:00 PM)
              </span>
              <div className="flex flex-wrap gap-2">
                {slotsByDay.afternoon.map((slot, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSlot?.({ date: days[selectedDay].fullDate, time: slot })}
                    className="h-8 text-xs font-medium rounded-xl hover:bg-primary hover:text-primary-foreground border-border/60"
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>

            {/* Evening */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Evening Sessions (5:00 PM - 8:30 PM)
              </span>
              <div className="flex flex-wrap gap-2">
                {slotsByDay.evening.map((slot, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectSlot?.({ date: days[selectedDay].fullDate, time: slot })}
                    className="h-8 text-xs font-medium rounded-xl hover:bg-primary hover:text-primary-foreground border-border/60"
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Regular Weekly Timetable Table */}
      <div className="space-y-2 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Weekly Consultation Pattern
        </h3>
        <div className="rounded-2xl border border-border/40 overflow-hidden divide-y divide-border/30 text-xs">
          {weeklySchedule.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-card hover:bg-muted/30">
              <span className="font-semibold text-foreground w-28">{row.day}</span>
              <span className="text-muted-foreground flex-1 truncate">{row.hours}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                row.status === 'Available'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : row.status === 'Limited Slots'
                  ? 'bg-amber-500/10 text-amber-600'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
