import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Plus, UserRound, X, Trash2, Users, Stethoscope, Activity, CalendarDays, Phone, Mail, ChevronRight, Sparkles, HeartPulse, Clock, CheckCircle, AlertTriangle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const statusConfig = {
  Active: { label: 'Active', icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  Discharged: { label: 'Discharged', icon: HeartPulse, color: 'bg-muted text-muted-foreground border-border/40' },
  Critical: { label: 'Critical', icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const empty = { name: '', age: '', gender: 'Male', disease: '', doctor: '', phone: '', email: '', bloodGroup: '', status: 'Active' };

const statCards = [
  { icon: Users, label: 'Total Patients', color: 'text-primary', gradient: 'from-primary/20 to-primary/5' },
  { icon: CheckCircle, label: 'Active', color: 'text-emerald-500', gradient: 'from-emerald-500/20 to-emerald-500/5' },
  { icon: HeartPulse, label: 'Discharged', color: 'text-sky-500', gradient: 'from-sky-500/20 to-sky-500/5' },
  { icon: AlertTriangle, label: 'Critical', color: 'text-red-500', gradient: 'from-red-500/20 to-red-500/5' },
];

export default function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => api.getPatients({ ...(search && { search }), ...(statusFilter && { status: statusFilter }) }),
    select: (data) => data?.data || data || [],
  });

  const createMut = useMutation({ mutationFn: api.createPatient, onSuccess: () => { qc.invalidateQueries(['patients']); setModal(false); setForm(empty); } });
  const deleteMut = useMutation({ mutationFn: api.deletePatient, onSuccess: () => qc.invalidateQueries(['patients']) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); createMut.mutate({ ...form, age: Number(form.age) }); };

  const filters = ['', 'Active', 'Discharged', 'Critical'];
  const activeCount = patients.filter(p => p.status === 'Active').length;
  const criticalCount = patients.filter(p => p.status === 'Critical').length;
  const dischargedCount = patients.filter(p => p.status === 'Discharged').length;
  const statValues = [patients.length, activeCount, dischargedCount, criticalCount];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-primary/10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <p className="text-sm font-medium text-white/70">{greeting}</p>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold mt-0.5">Patients Management</h1>
            <p className="text-white/80 mt-1">View and manage all registered patients</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
              <CalendarDays className="w-4 h-4 text-white/70" />
              <div className="text-sm">
                <p className="text-white/70 text-xs">{new Date().toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                <p className="font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            <Button size="sm" className="bg-white/20 text-white hover:bg-white/30 rounded-xl border-0" onClick={() => setModal(true)}>
              <UserPlus className="w-4 h-4 mr-1.5" /> Add Patient
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                <s.icon className={`w-5.5 h-5.5 ${s.color}`} />
              </div>
              <p className="font-heading text-3xl font-bold text-foreground tracking-tight">{statValues[i]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-10 h-10 rounded-xl bg-background border-border/50 text-sm"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                {['Patient', 'Age / Gender', 'Diagnosis', 'Doctor', 'Admitted', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
                      <UserRound className="w-7 h-7 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No patients found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {search ? 'Try a different search term.' : 'Add a patient to get started.'}
                    </p>
                  </td>
                </tr>
              ) : patients.map((p, idx) => (
                <motion.tr key={p._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                  className="group hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                        p.status === 'Critical'
                          ? 'bg-red-500/10 text-red-600'
                          : p.status === 'Discharged'
                            ? 'bg-muted/50 text-muted-foreground'
                            : 'bg-primary/10 text-primary'
                      }`}>
                        {p.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{p.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          {p.bloodGroup && <span>{p.bloodGroup}</span>}
                          {p.phone && <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /><span>{p.phone}</span></>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{p.age} / {p.gender}</td>
                  <td className="px-5 py-4 text-sm text-foreground">{p.disease || '—'}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{p.doctor || '—'}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {p.admitted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px]">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(p.admitted).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                      statusConfig[p.status]?.color || 'bg-muted text-muted-foreground border-border/40'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => { if (confirm('Remove patient?')) deleteMut.mutate(p._id); }}
                      className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <UserRound className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">Add New Patient</h2>
                  <p className="text-xs text-muted-foreground">Register a new patient in the system</p>
                </div>
              </div>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                  <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Jane Smith" required className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Age</label>
                  <Input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="35" required className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Gender</label>
                  <select value={form.gender} onChange={e => set('gender', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
                    {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Diagnosis</label>
                  <Input value={form.disease} onChange={e => set('disease', e.target.value)} placeholder="e.g. Hypertension" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Assigned Doctor</label>
                  <Input value={form.doctor} onChange={e => set('doctor', e.target.value)} placeholder="Dr. Smith" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone</label>
                  <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Blood Group</label>
                  <Input value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} placeholder="A+" className="rounded-xl" />
                </div>
              </div>
              {createMut.error && <p className="text-sm text-destructive">{createMut.error.message}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 rounded-xl" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Adding…' : 'Add Patient'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}