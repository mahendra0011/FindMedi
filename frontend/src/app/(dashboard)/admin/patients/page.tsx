/**
 * Patients Management — ported from client/src/pages/Patients.jsx
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Search, UserRound, X, Trash2, Users, CheckCircle, HeartPulse, AlertTriangle, UserPlus, CalendarDays, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { users } from '@/lib/api';

const statusConfig: Record<string, { label: string; color: string }> = {
  Active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  Discharged: { label: 'Discharged', color: 'bg-muted text-muted-foreground border-border/40' },
  Critical: { label: 'Critical', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const empty = { name: '', age: '', gender: 'Male', disease: '', doctor: '', phone: '', email: '', bloodGroup: '', status: 'Active' };

interface PatientRow {
  _id: string;
  name: string;
  age?: number;
  gender?: string;
  disease?: string;
  doctor?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  status?: string;
}

export default function AdminPatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['admin-patients', search, statusFilter],
    queryFn: async (): Promise<PatientRow[]> => {
      const res = await users.get({ ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) });
      const arr = (res as unknown as { data?: unknown[] })?.data ?? res;
      return (Array.isArray(arr) ? arr : []) as PatientRow[];
    },
    staleTime: 30_000,
  });

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => users.create(body as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-patients'] });
      setModal(false);
      setForm(empty);
      toast.success('Patient created');
    },
    onError: () => toast.error('Failed to create patient'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => users.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-patients'] });
      toast.success('Patient removed');
    },
    onError: () => toast.error('Failed to delete patient'),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    createMut.mutate({ ...form, age: Number(form.age) || 0 });
  };

  const patients = patientsData ?? [];
  const filters = ['', 'Active', 'Discharged', 'Critical'];
  const activeCount = patients.filter((p) => p.status === 'Active').length;
  const criticalCount = patients.filter((p) => p.status === 'Critical').length;
  const dischargedCount = patients.filter((p) => p.status === 'Discharged').length;
  const statValues = [patients.length, activeCount, dischargedCount, criticalCount];
  const statCards = [
    { label: 'Total Patients', icon: Users, color: 'text-primary' },
    { label: 'Active', icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Discharged', icon: HeartPulse, color: 'text-sky-500' },
    { label: 'Critical', icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-primary/10"
      >
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <p className="text-sm font-medium text-white/70">Admin</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">Patients Management</h1>
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={s.label} className="bg-card rounded-3xl border border-border/50 p-5 shadow-sm">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{statValues[i]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients..." className="pl-10 h-10 rounded-xl bg-background border-border/50 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40'}`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                {['Patient', 'Age / Gender', 'Diagnosis', 'Doctor', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-muted-foreground px-5 py-3.5 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/20">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {p.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      {p.age ?? '-'} / {p.gender ?? '-'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.disease || '-'}</td>
                    <td className="px-5 py-3.5 text-sm">{p.doctor || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${(statusConfig[p.status ?? 'Active']?.color ?? statusConfig['Active']!.color)}`}>
                        {p.status ?? 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(p._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border/60 p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserRound className="w-5 h-5" /> Add Patient
              </h2>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <Input value={form.name} onChange={(e) => set(form.name, e.target.value)} placeholder="Full name *" required />
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.age} onChange={(e) => set(form.age, e.target.value)} placeholder="Age" type="number" />
                <select value={form.gender} onChange={(e) => set(form.gender, e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <Input value={form.phone} onChange={(e) => set(form.phone, e.target.value)} placeholder="Phone" />
              <Input value={form.email} onChange={(e) => set(form.email, e.target.value)} placeholder="Email" type="email" />
              <Input value={form.disease} onChange={(e) => set(form.disease, e.target.value)} placeholder="Diagnosis / Disease" />
              <Input value={form.doctor} onChange={(e) => set(form.doctor, e.target.value)} placeholder="Assigned Doctor" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={form.bloodGroup} onChange={(e) => set(form.bloodGroup, e.target.value)} placeholder="Blood Group" />
                <select value={form.status} onChange={(e) => set(form.status, e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                  <option>Active</option>
                  <option>Discharged</option>
                  <option>Critical</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={createMut.isPending}>
                {createMut.isPending ? 'Saving...' : 'Add Patient'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
