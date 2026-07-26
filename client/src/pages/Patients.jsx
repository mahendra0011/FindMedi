import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, UserRound, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const statusCls = { Active:'bg-success/10 text-success', Discharged:'bg-muted text-muted-foreground', Critical:'bg-destructive/10 text-destructive' };
const empty = { name:'', age:'', gender:'Male', disease:'', doctor:'', phone:'', email:'', bloodGroup:'', status:'Active' };

export default function Patients() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search, statusFilter],
    queryFn: () => api.getPatients({ ...(search && { search }), ...(statusFilter && { status: statusFilter }) }),
    select: (data) => data?.data || data || [],
  });

  const createMut = useMutation({ mutationFn: api.createPatient, onSuccess: () => { qc.invalidateQueries(['patients']); setModal(false); setForm(empty); } });
  const deleteMut = useMutation({ mutationFn: api.deletePatient, onSuccess: () => qc.invalidateQueries(['patients']) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); createMut.mutate({ ...form, age: Number(form.age) }); };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">{patients.length} registered patients</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> Add Patient</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search patients…" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['', 'Active', 'Discharged', 'Critical'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Patient','Age / Gender','Diagnosis','Doctor','Admitted','Status',''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(6)].map((_,i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                ))
              ) : patients.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <UserRound className="w-10 h-10 mx-auto mb-2 opacity-20" />No patients found
                </td></tr>
              ) : patients.map(p => (
                <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground flex-shrink-0">
                        {p.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-card-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.bloodGroup}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.age} / {p.gender}</td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{p.disease}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.doctor}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{p.admitted ? new Date(p.admitted).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCls[p.status] ?? 'bg-muted text-muted-foreground'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { if (confirm('Remove patient?')) deleteMut.mutate(p._id); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {modal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold">Add New Patient</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Full Name</label><Input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Jane Smith" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Age</label><Input type="number" value={form.age} onChange={e=>set('age',e.target.value)} placeholder="35" required /></div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Gender</label>
                  <select value={form.gender} onChange={e=>set('gender',e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1.5 block">Diagnosis</label><Input value={form.disease} onChange={e=>set('disease',e.target.value)} placeholder="e.g. Hypertension" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Assigned Doctor</label><Input value={form.doctor} onChange={e=>set('doctor',e.target.value)} placeholder="Dr. Smith" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Phone</label><Input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+1 555-0000" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Blood Group</label><Input value={form.bloodGroup} onChange={e=>set('bloodGroup',e.target.value)} placeholder="A+" /></div>
              </div>
              {createMut.error && <p className="text-sm text-destructive">{createMut.error.message}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMut.isPending}>{createMut.isPending ? 'Adding…' : 'Add Patient'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
