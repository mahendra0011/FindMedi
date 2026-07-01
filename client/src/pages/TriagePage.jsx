import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Plus, Clock, ChevronDown, ChevronUp, Heart, X, Stethoscope, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const triageApi = {
  getAll: (p = {}) => api.dispatch(() => Promise.resolve({ entries: [] }), '/triage?' + new URLSearchParams(p)),
  create: (b) => api.dispatch(() => Promise.resolve({}), '/triage', { method: 'POST', body: JSON.stringify(b) }),
  update: (id, b) => api.dispatch(() => Promise.resolve({}), `/triage/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  assign: (id, b) => api.dispatch(() => Promise.resolve({}), `/triage/${id}/assign`, { method: 'PUT', body: JSON.stringify(b) }),
  addMlc: (id, b) => api.dispatch(() => Promise.resolve({}), `/triage/${id}/mlc`, { method: 'PUT', body: JSON.stringify(b) }),
  addNote: (id, b) => api.dispatch(() => Promise.resolve({}), `/triage/${id}/notes`, { method: 'POST', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, immediate: 0, urgent: 0, lessUrgent: 0, active: 0, today: 0, mlc: 0 }), '/triage/stats/main'),
};

const triageColors = {
  'P1-Immediate': 'bg-destructive text-destructive-foreground',
  'P2-Urgent': 'bg-orange-500 text-white',
  'P3-Less Urgent': 'bg-warning text-warning-foreground',
  'P4-Non Urgent': 'bg-info text-info-foreground',
  'P5-Deceased': 'bg-foreground text-background',
};

export default function TriagePage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [triageFilter, setTriageFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEntry, setNewEntry] = useState({
    patientName: '', age: '', gender: 'Male', phone: '', arrivalMode: 'Walk-in', broughtBy: '',
    chiefComplaint: '', triageLevel: 'P3-Less Urgent', triageNotes: '',
    vitals: {}, isMLCO: false,
  });

  const { data } = useQuery({ queryKey: ['triage', search, triageFilter], queryFn: () => triageApi.getAll({ search, triageLevel: triageFilter }) });
  const { data: stats } = useQuery({ queryKey: ['triage-stats'], queryFn: triageApi.getStats });
  const entries = data?.entries || [];

  const createMut = useMutation({ mutationFn: triageApi.create, onSuccess: () => { qc.invalidateQueries(['triage', 'triage-stats']); setShowCreate(false); } });
  const assignMut = useMutation({ mutationFn: ({ id, ...b }) => triageApi.assign(id, b), onSuccess: () => qc.invalidateQueries(['triage']) });
  const mlcMut = useMutation({ mutationFn: ({ id, ...b }) => triageApi.addMlc(id, b), onSuccess: () => qc.invalidateQueries(['triage']) });
  const noteMut = useMutation({ mutationFn: ({ id, ...b }) => triageApi.addNote(id, b), onSuccess: () => qc.invalidateQueries(['triage']) });
  const dischargeMut = useMutation({ mutationFn: ({ id }) => triageApi.update(id, { status: 'Discharged', dischargedAt: new Date() }), onSuccess: () => qc.invalidateQueries(['triage', 'triage-stats']) });

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Emergency Triage</h1><p className="page-subtitle">{stats?.today || 0} today · {stats?.immediate || 0} immediate</p></div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
        {[
          { l: 'Total', v: stats?.total || 0, c: 'text-foreground' },
          { l: '🔴 Immediate', v: stats?.immediate || 0, c: 'text-destructive' },
          { l: '🟠 Urgent', v: stats?.urgent || 0, c: 'text-orange-500' },
          { l: '🟡 Less Urgent', v: stats?.lessUrgent || 0, c: 'text-warning' },
          { l: 'Active', v: stats?.active || 0, c: 'text-info' },
          { l: 'Today', v: stats?.today || 0, c: 'text-primary' },
          { l: '⚖️ MLC', v: stats?.mlc || 0, c: 'text-purple-500' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={triageFilter} onChange={e => setTriageFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Levels</option>
          {['P1-Immediate', 'P2-Urgent', 'P3-Less Urgent', 'P4-Non Urgent', 'P5-Deceased'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Triage</Button>
      </div>

      <div className="space-y-4">
        {entries.map(entry => {
          const isExpanded = expandedId === entry._id;
          return (
            <div key={entry._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry._id)}>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${triageColors[entry.triageLevel] || ''}`}>{entry.triageLevel}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{entry.patientName}</p>
                    <p className="text-xs text-muted-foreground">{entry.chiefComplaint} · {entry.arrivalMode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.isMLCO && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600">MLC</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.status === 'In Treatment' ? 'bg-info/10 text-info' : entry.status === 'Discharged' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{entry.status}</span>
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Age</span><p className="font-medium">{entry.age || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Gender</span><p className="font-medium">{entry.gender || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{entry.phone || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Brought by</span><p className="font-medium">{entry.broughtBy || 'Self'}</p></div>
                    {entry.vitals?.bpSystolic && <div><span className="text-muted-foreground">BP</span><p className="font-medium">{entry.vitals.bpSystolic}/{entry.vitals.bpDiastolic}</p></div>}
                    {entry.vitals?.heartRate && <div><span className="text-muted-foreground">HR</span><p className="font-medium">{entry.vitals.heartRate} bpm</p></div>}
                    {entry.vitals?.spO2 && <div><span className="text-muted-foreground">SpO2</span><p className="font-medium">{entry.vitals.spO2}%</p></div>}
                    {entry.vitals?.temperature && <div><span className="text-muted-foreground">Temp</span><p className="font-medium">{entry.vitals.temperature}°F</p></div>}
                    {entry.assignedDoctorName && <div><span className="text-muted-foreground">Doctor</span><p className="font-medium">{entry.assignedDoctorName}</p></div>}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => { const d = prompt('Doctor Name:'); if (d) assignMut.mutate({ id: entry._id, doctorName: d }); }}><Stethoscope className="w-3 h-3 mr-1" />Assign Doctor</Button>
                    {!entry.isMLCO && <Button size="sm" variant="outline" onClick={() => { const c = prompt('MLC Case Type (Road Accident/Assault/Poisoning/Burns/Fall/Others):'); if (c) mlcMut.mutate({ id: entry._id, caseType: c }); }}><AlertTriangle className="w-3 h-3 mr-1" />Mark MLC</Button>}
                    {entry.status !== 'Discharged' && <Button size="sm" variant="outline" onClick={() => { if (confirm('Discharge?')) dischargeMut.mutate({ id: entry._id }); }}><X className="w-3 h-3 mr-1" />Discharge</Button>}
                    <Button size="sm" variant="outline" onClick={() => { const t = prompt('Note:'); if (t) noteMut.mutate({ id: entry._id, text: t }); }}>Add Note</Button>
                  </div>

                  {entry.mlcNumber && <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20"><p className="text-xs font-semibold text-purple-600">MLC #{entry.mlcNumber} · {entry.mlc?.caseType}</p></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Triage Entry</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newEntry.patientName} onChange={e => setNewEntry({ ...newEntry, patientName: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Age</label><Input type="number" value={newEntry.age} onChange={e => setNewEntry({ ...newEntry, age: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Gender</label><select value={newEntry.gender} onChange={e => setNewEntry({ ...newEntry, gender: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={newEntry.phone} onChange={e => setNewEntry({ ...newEntry, phone: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Arrival Mode</label><select value={newEntry.arrivalMode} onChange={e => setNewEntry({ ...newEntry, arrivalMode: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Walk-in', 'Ambulance', 'Police', 'Referral'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
                <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Chief Complaint *</label><Input value={newEntry.chiefComplaint} onChange={e => setNewEntry({ ...newEntry, chiefComplaint: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Triage Level *</label><select value={newEntry.triageLevel} onChange={e => setNewEntry({ ...newEntry, triageLevel: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['P1-Immediate', 'P2-Urgent', 'P3-Less Urgent', 'P4-Non Urgent', 'P5-Deceased'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">Brought By</label><Input value={newEntry.broughtBy} onChange={e => setNewEntry({ ...newEntry, broughtBy: e.target.value })} placeholder="e.g. Ambulance #123" /></div>
                <div className="col-span-2"><label className="text-sm font-medium mb-1 block">Triage Notes</label><textarea value={newEntry.triageNotes} onChange={e => setNewEntry({ ...newEntry, triageNotes: e.target.value })} className="w-full min-h-[60px] rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
              <Button className="w-full" onClick={() => createMut.mutate(newEntry)} disabled={createMut.isPending || !newEntry.patientName || !newEntry.chiefComplaint}>Create Triage Entry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}