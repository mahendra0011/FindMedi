import { Clock, Calendar, CheckCircle2 } from 'lucide-react';

export interface FacilityTimingsProps {
  timings?: Record<string, string>;
  is24x7?: boolean;
}

const DEFAULT_SCHEDULE = {
  monday: '9:00 AM - 8:00 PM',
  tuesday: '9:00 AM - 8:00 PM',
  wednesday: '9:00 AM - 8:00 PM',
  thursday: '9:00 AM - 8:00 PM',
  friday: '9:00 AM - 8:00 PM',
  saturday: '9:00 AM - 6:00 PM',
  sunday: 'Closed',
};

export default function FacilityTimings({ timings = DEFAULT_SCHEDULE, is24x7 = false }: FacilityTimingsProps) {
  const schedule = { ...DEFAULT_SCHEDULE, ...timings };
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const todayKey = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Operating Hours & Schedule</h3>
        </div>
        {is24x7 && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
            Open 24 Hours / 7 Days
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {days.map((d) => {
          const isToday = d === todayKey;
          const val = (schedule as any)[d] || 'Closed';
          const isClosed = val.toLowerCase().includes('closed');

          return (
            <div
              key={d}
              className={`flex items-center justify-between p-2.5 rounded-xl border ${
                isToday ? 'bg-primary/5 border-primary/30 font-semibold text-primary' : 'bg-muted/10 text-foreground'
              }`}
            >
              <span className="capitalize">{d} {isToday && '(Today)'}</span>
              <span className={isClosed ? 'text-muted-foreground' : 'font-medium'}>{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
