import { useState, useEffect } from 'react';
import { Clock, Calendar, Settings, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const allTimeSlots = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DoctorSchedule() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = await api.getDoctors();
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
        }
      } catch (e) { toast.error(e.message); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!doctor) return (
    <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
      <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground text-lg">Schedule not available</p>
      <p className="text-sm text-muted-foreground/70">Contact admin to set your schedule</p>
    </div>
  );

  const selectedSlots = doctor.time_slots || [];
  const schedule = doctor.weekly_schedule || {};
  const leaves = doctor.leaves || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Schedule</h1>
        <p className="text-muted-foreground">Your schedule is managed by the hospital administration</p>
      </div>

      {/* Read-only notice */}
      <div className="bg-info/10 border border-info/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-info mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-foreground">Schedule managed by Admin</p>
          <p className="text-sm text-muted-foreground mt-0.5">This is a view-only schedule. Please contact the hospital administration for any changes.</p>
        </div>
      </div>

      {/* Time Slots */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Available Time Slots
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {allTimeSlots.map(slot => {
            const active = selectedSlots.includes(slot);
            return (
              <div key={slot}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-center transition-all ${active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground'}`}>
                {slot}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">{selectedSlots.length} time slots available</p>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Weekly Schedule
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {days.map(day => (
            <div key={day}
              className={`p-4 rounded-xl text-center transition-all border-2 ${schedule[day] ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}>
              <p className="font-semibold capitalize text-sm">{day}</p>
              <p className="text-xs mt-1 opacity-70">{schedule[day] ? 'Available' : 'Off'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaves */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Leaves & Holidays
        </h2>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leaves marked</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaves.map(leave => (
              <span key={leave} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {leave}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Profile Details */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Profile Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Name</p><p className="font-medium text-foreground">{doctor.name}</p></div>
          <div><p className="text-muted-foreground">Specialization</p><p className="font-medium text-foreground">{doctor.specialization}</p></div>
          <div><p className="text-muted-foreground">Experience</p><p className="font-medium text-foreground">{doctor.experience}</p></div>
          <div><p className="text-muted-foreground">Consultation Fees</p><p className="font-medium text-foreground">₹{doctor.consultation_fees || doctor.fees}</p></div>
          <div><p className="text-muted-foreground">Location</p><p className="font-medium text-foreground">{doctor.location || 'Not set'}</p></div>
          <div><p className="text-muted-foreground">Rating</p><p className="font-medium text-foreground">{doctor.rating} ({doctor.reviews_count || 0} reviews)</p></div>
        </div>
      </div>
    </div>
  );
}
