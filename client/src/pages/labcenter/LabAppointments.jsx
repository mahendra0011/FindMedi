import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, User, CheckCircle, XCircle, RefreshCw, Search, Filter, Activity, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const statusColors = { Scheduled: 'bg-info/10 text-info', Completed: 'bg-success/10 text-success', Cancelled: 'bg-destructive/10 text-destructive' };
const modalities = ['MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'Echo', 'ECG', 'Mammography'];

const defaultAppts = [
  { _id: 'a1', patient: 'Ravi Kumar', modality: 'MRI Brain', date: new Date().toISOString().split('T')[0], time: '09:00 AM', status: 'Scheduled', notes: 'Contrast required' },
  { _id: 'a2', patient: 'Priya Sharma', modality: 'CT Abdomen', date: new Date().toISOString().split('T')[0], time: '11:00 AM', status: 'Completed', notes: '' },
  { _id: 'a3', patient: 'Amit Patel', modality: 'X-Ray Chest', date: new Date().toISOString().split('T')[0], time: '02:00 PM', status: 'Scheduled', notes: '' },
  { _id: 'a4', patient: 'Sneha Reddy', modality: 'Ultrasound Abdomen', date: new Date().toISOString().split('T')[0], time: '03:30 PM', status: 'Scheduled', notes: 'Fasting 6 hrs' },
  { _id: 'a5', patient: 'Vikram Singh', modality: 'ECG', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:00 AM', status: 'Scheduled', notes: '' },
];

export default function LabAppointments() {
  const [appts, setAppts] = useState(() => {
    const stored = localStorage.getItem('medicore_labcenter_appointments');
    return stored ? JSON.parse(stored) : defaultAppts;
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => { localStorage.setItem('medicore_labcenter_appointments', JSON.stringify(appts)); }, [appts]);

  const handleStatus = (id, status) => setAppts(prev => prev.map(a => a._id === id ? { ...a, status } : a));

  const filtered = appts.filter(a => {
    const ms = !search || a.patient.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || a.status === filter;
    return ms && mf;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Appointment / Visit Management</h1>
        <p className="text-muted-foreground">Imaging scan & visit scheduling</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{appts.length}</p>
          <p className="text-xs text-muted-foreground">Total Appointments</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-info">{appts.filter(a => a.status === 'Scheduled').length}</p>
          <p className="text-xs text-muted-foreground">Scheduled</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-success">{appts.filter(a => a.status === 'Completed').length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{new Set(appts.map(a => a.modality)).size}</p>
          <p className="text-xs text-muted-foreground">Modalities</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['All', 'Scheduled', 'Completed', 'Cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <CalendarDays className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No appointments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a, i) => (
            <motion.div key={a._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{a.patient}</h3>
                  <Badge variant="secondary" className="mt-1">{a.modality}</Badge>
                </div>
                <Badge className={statusColors[a.status] || statusColors.Scheduled}>{a.status}</Badge>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>{a.date}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{a.time}</span></div>
              </div>
              {a.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 mb-3">{a.notes}</p>}
              <div className="flex gap-2">
                {a.status === 'Scheduled' && (
                  <>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatus(a._id, 'Completed')}><CheckCircle className="w-3.5 h-3.5" /> Complete</Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleStatus(a._id, 'Cancelled')}><XCircle className="w-3.5 h-3.5" /> Cancel</Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
