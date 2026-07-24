import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CalendarDays, Clock, X, Trash2, MapPin, FileText, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const STATUSES = ['All','Confirmed','Pending','Cancelled','Completed'];
const DEPARTMENTS = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology'];
const empty = { patient:'', doctor:'', department:'Cardiology', date:'', time:'', status:'Pending', notes:'' };

const statusColors = {
  Confirmed: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
  Pending: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
  Cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  Completed: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function Appointments() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['appointments', statusFilter],
    queryFn: () => api.getAppointments(statusFilter !== 'All' ? { status: statusFilter } : {}),
  });
  const appointments = raw?.data || raw?.appointments || Array.isArray(raw) ? raw : [];

  const createMut = useMutation({ mutationFn: api.createAppointment, onSuccess: () => { qc.invalidateQueries(['appointments']); setModal(false); setForm(empty); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }) => api.updateAppointment(id, data), onSuccess: () => qc.invalidateQueries(['appointments']) });
  const deleteMut = useMutation({ mutationFn: api.deleteAppointment, onSuccess: () => qc.invalidateQueries(['appointments']) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); createMut.mutate(form); };

  const statusCounts = STATUSES.slice(1).reduce((acc, s) => ({ ...acc, [s]: appointments.filter(a=>a.status===s).length }), {});

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">{appointments.length} total appointments</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> New Appointment</Button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
            {s} {s !== 'All' && <span className="ml-1 opacity-60">({statusCounts[s] ?? 0})</span>}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => <div key={i} className="bg-card rounded-xl border p-5 animate-pulse h-40" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No appointments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {appointments.map(apt => {
            const sc = statusColors[apt.status] || statusColors.Pending;
            const initials = getInitials(apt.doctor);
            return (
            <div key={apt._id} className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="text-primary-foreground font-bold text-sm">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-semibold text-sm text-foreground truncate">{apt.doctor}</p>
                    <p className="text-xs text-primary truncate">{apt.department || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {apt.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                    <p className="text-xs font-medium text-foreground truncate">{formatDate(apt.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="text-xs font-medium text-foreground truncate">{apt.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Token</p>
                    <p className="text-xs font-medium text-foreground truncate">{apt.tokenNumber || apt.queuePosition || '—'}</p>
                  </div>
                </div>
              </div>

              {apt.notes && (
                <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{apt.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl h-9 text-xs"
                  onClick={() => updateMut.mutate({ id: apt._id, data: { status: 'Cancelled' } })}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-xl h-9 text-xs"
                  onClick={() => updateMut.mutate({ id: apt._id, data: { status: 'Pending' } })}>
                  <RotateCcw className="w-3.5 h-3.5" /> Reschedule
                </Button>
                <button onClick={() => { if (confirm('Delete appointment?')) deleteMut.mutate(apt._id); }}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* New Appointment Modal */}
      {modal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">New Appointment</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">Patient Name</label><Input value={form.patient} onChange={e=>set('patient',e.target.value)} placeholder="Patient name" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Doctor</label><Input value={form.doctor} onChange={e=>set('doctor',e.target.value)} placeholder="Dr. Name" required /></div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Department</label>
                  <select value={form.department} onChange={e=>set('department',e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1.5 block">Date</label><Input type="date" value={form.date} onChange={e=>set('date',e.target.value)} required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Time</label><Input type="time" value={form.time} onChange={e=>set('time',e.target.value)} required /></div>
                <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Notes</label><Input value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional notes…" /></div>
              </div>
              {createMut.error && <p className="text-sm text-destructive">{createMut.error.message}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMut.isPending}>{createMut.isPending ? 'Saving…' : 'Book Appointment'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}