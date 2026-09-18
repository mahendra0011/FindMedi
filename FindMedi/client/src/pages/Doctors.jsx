import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Star, Clock, Phone, Mail, X, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const SPECIALIZATIONS = ['Cardiology','Neurology','Orthopedics','Pediatrics','Dermatology','Oncology','General Surgery','Psychiatry'];

const empty = { name:'', specialization:'Cardiology', experience:'', rating:4.5, phone:'', email:'', available:true, initials:'', department:'' };

export default function Doctors() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['doctors', search, typeFilter],
    queryFn: () => {
      const params = {};
      if (search) params.search = search;
      if (typeFilter !== 'all') params.doctor_type = typeFilter;
      return api.getDoctors(params);
    },
  });

  const createMut = useMutation({ mutationFn: api.createDoctor, onSuccess: () => { qc.invalidateQueries(['doctors']); setModal(false); setForm(empty); } });
  const deleteMut = useMutation({ mutationFn: api.deleteDoctor, onSuccess: () => qc.invalidateQueries(['doctors']) });
  const toggleMut = useMutation({ mutationFn: ({ id, available }) => api.updateDoctor(id, { available }), onSuccess: () => qc.invalidateQueries(['doctors']) });

  const submit = (e) => { e.preventDefault(); createMut.mutate({ ...form, initials: form.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), department: form.specialization }); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">{doctors.length} medical staff members</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> Add Doctor</Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {['all', 'hospital', 'clinic'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${typeFilter === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'all' ? 'All' : t === 'hospital' ? 'Hospital' : 'Clinic'}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-md sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or specialization…" className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_,i) => <div key={i} className="bg-card rounded-xl border p-6 animate-pulse h-52" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map(doctor => (
            <div key={doctor._id} className="bg-card rounded-xl border shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 p-6 group">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-heading font-bold text-lg flex-shrink-0 shadow-lg shadow-primary/20 overflow-hidden">
                  {doctor.profile_photo
                    ? <img src={doctor.profile_photo} alt="" className="w-full h-full object-cover" />
                    : doctor.initials || doctor.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-card-foreground truncate">{doctor.name}</h3>
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${doctor.doctor_type === 'clinic' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                      {doctor.doctor_type === 'clinic' ? 'Clinic' : 'Hospital'}
                    </span>
                  </div>
                  <p className="text-sm text-primary font-medium">{doctor.specialization}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span className="text-xs font-medium text-card-foreground">{doctor.rating}</span>
                    <span className="text-xs text-muted-foreground">• {doctor.patients?.toLocaleString()} patients</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{doctor.experience}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{doctor.phone}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3 h-3" /><span className="truncate">{doctor.email}</span></div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button onClick={() => toggleMut.mutate({ id: doctor._id, available: !doctor.available })}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${doctor.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {doctor.available ? 'Available' : 'Unavailable'}
                </button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm('Remove this doctor?')) deleteMut.mutate(doctor._id); }}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {doctors.length === 0 && (
            <div className="col-span-3 text-center py-16">
              <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No doctors found</p>
            </div>
          )}
        </div>
      )}

      {/* Add Doctor Modal */}
      {modal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-xl font-bold text-card-foreground">Add New Doctor</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-sm font-medium mb-1.5 block">Full Name</label><Input value={form.name} onChange={e => set('name',e.target.value)} placeholder="Dr. John Doe" required /></div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Specialization</label>
                  <select value={form.specialization} onChange={e => set('specialization',e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium mb-1.5 block">Experience</label><Input value={form.experience} onChange={e => set('experience',e.target.value)} placeholder="e.g. 5 years" required /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Phone</label><Input value={form.phone} onChange={e => set('phone',e.target.value)} placeholder="+1 234-567-8900" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Email</label><Input type="email" value={form.email} onChange={e => set('email',e.target.value)} placeholder="doctor@medicare.com" required /></div>
              </div>
              {createMut.error && <p className="text-sm text-destructive">{createMut.error.message}</p>}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={createMut.isPending}>{createMut.isPending ? 'Adding…' : 'Add Doctor'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
