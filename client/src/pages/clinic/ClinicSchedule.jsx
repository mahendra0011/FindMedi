import { useState, useEffect, useMemo } from 'react';
import { Clock, Calendar, Save, Plus, X, Settings, CheckCircle, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function generateTimeSlots(startTime, endTime, slotDuration) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let h = sh, m = sm;
  while (h < eh || (h === eh && m < em)) {
    const hour = h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const time = `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    slots.push(time);
    m += slotDuration;
    while (m >= 60) { m -= 60; h++; }
  }
  return slots;
}

export default function ClinicSchedule() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [leaves, setLeaves] = useState([]);
  const [newLeave, setNewLeave] = useState('');
  const [slotDuration, setSlotDuration] = useState('15');
  const [bufferPerHour, setBufferPerHour] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [manualMode, setManualMode] = useState(false);

  const patientsPerHour = useMemo(() => Math.floor(60 / parseInt(slotDuration || 15)), [slotDuration]);
  const totalWorkingMinutes = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }, [startTime, endTime]);
  const totalSlots = useMemo(() => {
    if (!startTime || !endTime || !slotDuration) return 0;
    return generateTimeSlots(startTime, endTime, parseInt(slotDuration)).length;
  }, [startTime, endTime, slotDuration]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = await api.getDoctors();
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
          setSelectedSlots(myDoc.time_slots || []);
          setSchedule(myDoc.weekly_schedule || {});
          setLeaves(myDoc.leaves || []);
          setSlotDuration(String(myDoc.slotDuration || 15));
          setBufferPerHour(String(myDoc.bufferPerHour || 1));
          if (myDoc.workingHours) {
            setStartTime(myDoc.workingHours.start || '09:00');
            setEndTime(myDoc.workingHours.end || '17:00');
          }
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

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

  const handleGenerateAndSaveSlots = () => {
    const slots = generateTimeSlots(startTime, endTime, parseInt(slotDuration));
    setSelectedSlots(slots);
  };

  useEffect(() => {
    if (!manualMode) handleGenerateAndSaveSlots();
  }, [startTime, endTime, slotDuration, manualMode]);

  const handleSave = async () => {
    if (!doctor) return;
    setSaving(true);
    try {
      await api.updateDoctorSchedule(doctor._id, {
        time_slots: selectedSlots,
        weekly_schedule: schedule,
        leaves,
        slotDuration: parseInt(slotDuration),
        bufferPerHour: parseInt(bufferPerHour),
        workingHours: { start: startTime, end: endTime },
      });
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
          <h1 className="font-heading text-2xl font-bold text-foreground">My Schedule & Availability</h1>
          <p className="text-muted-foreground">Full control over your clinic timing and availability</p>
        </div>
        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Schedule'}
          {saved && <CheckCircle className="w-4 h-4 text-success" />}
        </Button>
      </div>

      {/* Slot Settings */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Slot Settings
          </h2>
          <button onClick={() => setManualMode(!manualMode)} className="text-xs text-primary hover:underline">
            {manualMode ? 'Auto Mode' : 'Manual Slot Selection'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Working Hours Start</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Working Hours End</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Consultation Duration (min)</label>
            <select value={slotDuration} onChange={e => setSlotDuration(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="10">10 min</option>
              <option value="15">15 min</option>
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Buffer Slots Per Hour</label>
            <select value={bufferPerHour} onChange={e => setBufferPerHour(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm">
              <option value="0">0 (no buffer)</option>
              <option value="1">1 slot</option>
              <option value="2">2 slots</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
          <span><strong className="text-foreground">{patientsPerHour}</strong> patients/hour</span>
          <span><strong className="text-foreground">{totalWorkingMinutes}</strong> min working time</span>
          <span><strong className="text-foreground">{totalSlots}</strong> total slots</span>
          <span><strong className="text-foreground">{totalSlots - Math.floor(totalWorkingMinutes / 60) * parseInt(bufferPerHour || 0)}</strong> bookable slots</span>
        </div>
        {manualMode && (
          <Button size="sm" onClick={handleGenerateAndSaveSlots} className="gap-1 mt-3">
            <Plus className="w-3 h-3" /> Regenerate Slots
          </Button>
        )}
      </div>

      {/* Time Slots Grid */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Time Slots
          </h2>
          <span className="text-xs text-muted-foreground">{selectedSlots.length} slots</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {selectedSlots.map(slot => (
            <button key={slot} onClick={() => manualMode && toggleSlot(slot)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${'bg-primary text-primary-foreground shadow-md'} ${manualMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}>
              {slot}
            </button>
          ))}
        </div>
        {selectedSlots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Set working hours and duration above to auto-generate slots</p>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Weekly Working Days
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

      {/* Leaves / Holidays */}
      <div className="bg-card rounded-2xl border border-border/60 p-6">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Holidays & Time-off
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input type="date" value={newLeave} onChange={e => setNewLeave(e.target.value)} className="sm:max-w-xs" />
          <Button onClick={addLeave} className="gap-2 w-full sm:w-auto"><Plus className="w-4 h-4" /> Add</Button>
        </div>
        {leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground">No holidays marked</p>
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
    </div>
  );
}
