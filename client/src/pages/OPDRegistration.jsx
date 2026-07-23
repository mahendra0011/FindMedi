import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, User, X, Printer, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const empty = { name: '', age: '', gender: 'Male', phone: '', address: '', bloodGroup: '', uhid: '' };
const tokenApi = {
  getAll: async (p) => { try { return await api.getTokens(p); } catch (e) { return { tokens: [] }; } },
  generate: async (b) => { try { return await api.generateToken(b); } catch (e) { return null; } },
};

export default function OPDRegistration() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: patients = [] } = useQuery({
    queryKey: ['opd-patients', search],
    queryFn: async () => { try { const res = await api.getPatients({ search }); return res.patients || res; } catch (e) { return []; } },
  });

  const { data: tokensData } = useQuery({
    queryKey: ['opd-tokens'],
    queryFn: () => tokenApi.getAll({}),
  });
  const tokens = tokensData?.tokens || [];

  const createMut = useMutation({
    mutationFn: async (body) => { return await api.createPatient(body); },
    onSuccess: () => { qc.invalidateQueries(['opd-patients']); setShowAdd(false); }
  });

  const generateTokenMut = useMutation({
    mutationFn: tokenApi.generate,
    onSuccess: () => qc.invalidateQueries(['opd-tokens']),
  });

  const printCard = (patient) => {
    window.print();
  };

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">OPD Registration</h1>
          <p className="page-subtitle">Patient registration with UHID generation</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> New Registration</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by UHID/Phone..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => qc.invalidateQueries(['opd-tokens'])}>Refresh Tokens</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Existing Patients</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {patients.map(p => (
              <div key={p._id} className="bg-card rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">UHID: {p.uhid} · {p.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => generateTokenMut.mutate({ patientName: p.name, patientId: p._id, uhid: p.uhid })} disabled={generateTokenMut.isPending}>Token</Button>
                  <Button size="sm" variant="ghost" onClick={() => printCard(p)}><Printer className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
            {patients.length === 0 && <p className="text-muted-foreground text-center py-8">No patients found</p>}
          </div>
        </div>

        <div>
          <h2 className="font-heading text-lg font-semibold mb-4">Today's Token Queue</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tokens.map(t => (
              <div key={t._id} className="bg-card rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-heading font-bold text-primary text-lg">{t.tokenNumber}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'Waiting' ? 'bg-warning/10 text-warning' : t.status === 'In Consultation' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>{t.status}</span>
                </div>
                <p className="text-sm text-foreground">{t.patientName}</p>
                <p className="text-xs text-muted-foreground">{t.department} · Est. wait: {t.estimatedWaitTime} min</p>
              </div>
            ))}
            {tokens.length === 0 && <p className="text-muted-foreground text-center py-8">No tokens generated today</p>}
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">New Patient Registration</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Full Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter full name" /></div>
              <div><label className="text-sm font-medium mb-1 block">Age *</label><Input type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} /></div>
              <div><label className="text-sm font-medium mb-1 block">Gender</label><select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Male','Female','Other'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Phone *</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-sm font-medium mb-1 block">Blood Group</label><Input value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})} placeholder="A+, B-, etc" /></div>
              <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Address</label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            </div>
            <Button className="w-full mt-6" onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name || !form.age || !form.phone}>Register Patient</Button>
          </div>
        </div>
      )}
    </div>
  );
}
