import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, CheckCircle, XCircle, AlertCircle, RefreshCw, FileText, IndianRupee, Send, Plus, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = { Confirmed: 'bg-success/10 text-success', Pending: 'bg-warning/10 text-warning', Cancelled: 'bg-destructive/10 text-destructive', Completed: 'bg-info/10 text-info' };
const filters = ['All', 'Confirmed', 'Pending', 'Cancelled', 'Completed'];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ClinicAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [view, setView] = useState('list');
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(new Date());

  const [completeId, setCompleteId] = useState(null);
  const [billAmount, setBillAmount] = useState(500);
  const [billModal, setBillModal] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ doctor: user?.name, status: filter });
      setAppointments(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadAppointments(); }, [filter, user?.name]);

  const handleStatus = async (id, status) => {
    try { await api.updateAppointment(id, { status }); loadAppointments(); } catch (e) { console.error(e); }
  };

  const handleGenerateBill = async () => {
    if (!completeId) return;
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return;
    try {
      await api.createBill({
        patient: apt.patient,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: user?.name,
        service: `${apt.type} - ${apt.department || 'Clinic'}`,
        amount: billAmount,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
      });
      await api.createNotification({
        title: 'New Invoice',
        message: `Invoice of ₹${billAmount} generated for ${apt.patient}`,
        type: 'payment',
        userId: apt.patientId || apt.patient,
      });
      await api.updateAppointment(completeId, { status: 'Completed' });
      setBillModal(false);
      setCompleteId(null);
      loadAppointments();
    } catch (e) { console.error(e); }
  };

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDay = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-muted-foreground">Manage patient appointments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('list')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>List</button>
          <button onClick={() => setView('calendar')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>Calendar</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'calendar' ? (
        <div className="bg-card rounded-2xl border border-border/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="font-heading text-lg font-semibold">{months[calDate.getMonth()]} {calDate.getFullYear()}</h3>
            <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1))} className="p-2 hover:bg-muted rounded-lg"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
            ))}
            {Array.from({ length: getFirstDay(calDate) }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: getDaysInMonth(calDate) }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calDate.getFullYear()}-${String(calDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAppts = appointments.filter(a => a.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              return (
                <div key={day} className={`min-h-20 rounded-lg p-1 border ${isToday ? 'border-primary bg-primary/5' : 'border-border/40'} ${dayAppts.length > 0 ? 'cursor-pointer hover:bg-muted/30' : ''}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>{day}</p>
                  {dayAppts.slice(0, 2).map(a => (
                    <div key={a._id} className={`text-[10px] px-1 rounded mt-0.5 truncate ${statusColors[a.status]}`}>{a.patient?.split(' ')[0]}</div>
                  ))}
                  {dayAppts.length > 2 && <p className="text-[10px] text-muted-foreground mt-0.5">+{dayAppts.length - 2} more</p>}
                </div>
              );
            })}
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No appointments found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt, i) => (
            <motion.div key={apt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{apt.patient}</h3>
                  <p className="text-sm text-primary">{apt.type} {apt.department ? `- ${apt.department}` : ''}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[apt.status]}`}>{apt.status}</span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>{apt.date}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{apt.time}</span></div>
              </div>
              <div className="flex gap-2">
                {apt.status === 'Pending' && (
                  <>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatus(apt._id, 'Confirmed')}><CheckCircle className="w-3.5 h-3.5" /> Accept</Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive" onClick={() => handleStatus(apt._id, 'Cancelled')}><XCircle className="w-3.5 h-3.5" /> Reject</Button>
                  </>
                )}
                {apt.status === 'Confirmed' && (
                  <Button size="sm" className="flex-1 gap-1" onClick={() => { setCompleteId(apt._id); setBillModal(true); }}><CheckCircle className="w-3.5 h-3.5" /> Complete & Bill</Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {billModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBillModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Complete & Generate Bill</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Service</label>
                <Input value={appointments.find(a => a._id === completeId)?.type || 'Consultation'} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (Rs)</label>
                <Input type="number" value={billAmount} onChange={e => setBillAmount(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setBillModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateBill}><Send className="w-4 h-4" /> Generate Bill</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
