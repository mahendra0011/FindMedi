import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, Save, Plus, X, Settings, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [newLeave, setNewLeave] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = await api.getDoctors();
        const myDoc = doctors.find(d => d.email === user?.email) || doctors[0];
        if (myDoc) {
          setDoctor(myDoc);
          setSelectedSlots(myDoc.time_slots || []);
          setSchedule(myDoc.weekly_schedule || {});
          setLeaves(myDoc.leaves || []);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const toggleSlot = (slot) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const toggleDay = (day) => {
    setSchedule(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const addLeave = () => {
    if (newLeave && !leaves.includes(newLeave)) {
      setLeaves(prev => [...prev, newLeave]);
      setNewLeave('');
    }
  };

  const removeLeave = (date) => {
    setLeaves(prev => prev.filter(l => l !== date));
  };

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      await api.updateDoctorSchedule(doctor._id, { time_slots: selectedSlots, weekly_schedule: schedule, leaves });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Schedule</h1>
          <p className="text-muted-foreground">Set your availability, time slots, and leaves</p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Schedule'}
          {saved && <CheckCircle className="w-4 h-4 text-success" />}
        </Button>
      </div>

      {/* Time Slots */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Available Time Slots
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {allTimeSlots.map(slot => (
            <button key={slot} onClick={() => toggleSlot(slot)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedSlots.includes(slot) ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {slot}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Click to toggle availability. Selected: {selectedSlots.length} slots</p>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Weekly Schedule
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {days.map(day => (
            <button key={day} onClick={() => toggleDay(day)}
              className={`p-4 rounded-xl text-center transition-all border-2 ${schedule[day] ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}>
              <p className="font-semibold capitalize text-sm">{day}</p>
              <p className="text-xs mt-1 opacity-70">{schedule[day] ? 'Available' : 'Off'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Leaves */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Mark Leaves / Holidays
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input type="date" value={newLeave} onChange={e => setNewLeave(e.target.value)} className="sm:max-w-xs" />
          <Button onClick={addLeave} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Add Leave</Button>
        </div>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leaves marked</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {leaves.map(leave => (
              <span key={leave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                {leave}
                <button onClick={() => removeLeave(leave)} className="hover:text-destructive/70"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Profile Management */}
      {doctor && (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Profile Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Name</p><p className="font-medium text-foreground">{doctor.name}</p></div>
            <div><p className="text-muted-foreground">Specialization</p><p className="font-medium text-foreground">{doctor.specialization}</p></div>
            <div><p className="text-muted-foreground">Experience</p><p className="font-medium text-foreground">{doctor.experience}</p></div>
            <div><p className="text-muted-foreground">Consultation Fees</p><p className="font-medium text-foreground">Rs {doctor.consultation_fees || doctor.fees}</p></div>
            <div><p className="text-muted-foreground">Location</p><p className="font-medium text-foreground">{doctor.location || 'Not set'}</p></div>
            <div><p className="text-muted-foreground">Rating</p><p className="font-medium text-foreground">{doctor.rating} ({doctor.reviews_count || 0} reviews)</p></div>
          </div>
        </div>
      )}
    </div>
  );
}