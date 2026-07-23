import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, Filter, XCircle, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = { Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Cancelled: 'bg-destructive/10 text-destructive', Completed: 'bg-info/10 text-info' };
const statusIcons = { Confirmed: CheckCircle, Pending: AlertCircle, Cancelled: XCircle, Completed: CheckCircle };
const filters = ['All', 'Confirmed', 'Pending', 'Cancelled', 'Completed'];

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ patient: user?.name, status: filter });
      setAppointments(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadAppointments(); }, [filter]);

  const handleCancel = async (id) => {
    try {
      await api.updateAppointment(id, { status: 'Cancelled' });
      loadAppointments();
    } catch (e) { console.error(e); }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleId) return;
    try {
      await api.updateAppointment(rescheduleId, { date: newDate, time: newTime, status: 'Pending' });
      setRescheduleId(null); setNewDate(''); setNewTime('');
      loadAppointments();
    } catch (e) { console.error(e); }
  };

  const upcoming = appointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Completed');
  const past = appointments.filter(a => a.status === 'Cancelled' || a.status === 'Completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Appointments</h1>
        <p className="text-muted-foreground">View and manage your appointments</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f} {f !== 'All' && <span className="ml-1 opacity-70">({appointments.filter(a => f === 'All' || a.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No appointments found</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">Upcoming</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((apt, i) => {
                  const StatusIcon = statusIcons[apt.status] || AlertCircle;
                  return (
                    <motion.div key={apt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{apt.doctor}</h3>
                          <p className="text-sm text-primary">{apt.department}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[apt.status]}`}>
                          <StatusIcon className="w-3 h-3" /> {apt.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>{apt.date}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{apt.time}</span></div>
                        <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><span>{apt.type}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setRescheduleId(apt._id)}>
                          <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive hover:text-destructive" onClick={() => handleCancel(apt._id)}>
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground mb-3">Past</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {past.map((apt, i) => {
                  const StatusIcon = statusIcons[apt.status] || AlertCircle;
                  return (
                    <motion.div key={apt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-2xl border border-border/60 p-5 opacity-75">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">{apt.doctor}</h3>
                          <p className="text-sm text-primary">{apt.department}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusColors[apt.status]}`}>
                          <StatusIcon className="w-3 h-3" /> {apt.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>{apt.date}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{apt.time}</span></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRescheduleId(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Reschedule Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Date</label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setNewTime(t)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${newTime === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleReschedule} disabled={!newDate || !newTime}>Confirm</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
