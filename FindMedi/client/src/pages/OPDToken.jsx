import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Clock, User, Plus, X, CheckCircle, SkipForward, Phone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const tokenApi = {
  getAll: async (p) => { return await api.getTokens(p); },
  generate: async (b) => { return await api.generateToken(b); },
  call: async (id) => { return await api.callToken(id); },
  startConsultation: async (id) => { return await api.startTokenConsultation(id); },
  complete: async (id) => { return await api.completeToken(id); },
  skip: async (id, b) => { return await api.skipToken(id, b); },
  recall: async (id) => { return await api.recallToken(id); },
  getStats: async () => { return await api.getTokenStats(); },
};

const triageColors = {
  Emergency: 'bg-destructive text-destructive-foreground',
  Urgent: 'bg-orange-500 text-white',
  Normal: 'bg-primary text-primary-foreground',
  FollowUp: 'bg-info text-info-foreground',
};

export default function OPDToken() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [showGenerate, setShowGenerate] = useState(false);
  const [newToken, setNewToken] = useState({ patientName: '', patientId: '', uhid: '', doctorName: '', department: 'General', type: 'OPD', priority: 'Normal' });
  const [displayToken, setDisplayToken] = useState(null);

  const { data } = useQuery({ queryKey: ['tokens', search, deptFilter], queryFn: () => tokenApi.getAll({ search, department: deptFilter }) });
  const { data: stats } = useQuery({ queryKey: ['token-stats'], queryFn: tokenApi.getStats });
  const tokens = data?.tokens || [];

  const generateMut = useMutation({ mutationFn: tokenApi.generate, onSuccess: (d) => { qc.invalidateQueries(['tokens', 'token-stats']); setShowGenerate(false); setDisplayToken(d); setTimeout(() => setDisplayToken(null), 5000); }, onError: (e) => toast.error(e.message) });
  const callMut = useMutation({ mutationFn: tokenApi.call, onSuccess: () => qc.invalidateQueries(['tokens']), onError: (e) => toast.error(e.message) });
  const startMut = useMutation({ mutationFn: tokenApi.startConsultation, onSuccess: () => qc.invalidateQueries(['tokens']), onError: (e) => toast.error(e.message) });
  const completeMut = useMutation({ mutationFn: tokenApi.complete, onSuccess: () => qc.invalidateQueries(['tokens', 'token-stats']), onError: (e) => toast.error(e.message) });
  const skipMut = useMutation({ mutationFn: ({ id, ...b }) => tokenApi.skip(id, b), onSuccess: () => qc.invalidateQueries(['tokens']), onError: (e) => toast.error(e.message) });
  const recallMut = useMutation({ mutationFn: tokenApi.recall, onSuccess: () => qc.invalidateQueries(['tokens']), onError: (e) => toast.error(e.message) });

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><h1 className="page-title">OPD Token System</h1><p className="page-subtitle">{stats?.waiting || 0} waiting · {stats?.inConsultation || 0} in consultation</p></div>

      {displayToken && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 mb-6 text-center animate-in slide-in-from-top">
          <p className="text-xs text-muted-foreground mb-1">Token Generated</p>
          <p className="text-4xl font-bold text-primary mb-1">{displayToken.tokenNumber}</p>
          <p className="text-sm font-medium">{displayToken.patientName} · {displayToken.department}</p>
          <p className="text-xs text-muted-foreground">Queue Position: #{displayToken.queuePosition} · Est. Wait: {displayToken.estimatedWaitTime} min</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { l: 'Waiting', v: stats?.waiting || 0, c: 'text-warning' },
          { l: 'In Consultation', v: stats?.inConsultation || 0, c: 'text-primary' },
          { l: 'Completed', v: stats?.completed || 0, c: 'text-success' },
          { l: 'Skipped', v: stats?.skipped || 0, c: 'text-destructive' },
          { l: 'Total Today', v: stats?.total || 0, c: 'text-foreground' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search tokens..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="All">All Departments</option>
          {['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT', 'Ophthalmology', 'Dermatology'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <Button onClick={() => setShowGenerate(true)}><Plus className="w-4 h-4 mr-1" /> Generate Token</Button>
      </div>

      <div className="space-y-3">
        {tokens.map(token => (
          <div key={token._id} className={`bg-card rounded-xl border p-4 ${token.status === 'Called' ? 'border-warning/50 bg-warning/5' : token.status === 'In Consultation' ? 'border-primary/50 bg-primary/5' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[60px]">
                <p className="text-2xl font-bold text-foreground">{token.tokenNumber?.split('-').pop()}</p>
                <p className={`text-[10px] font-medium px-1 py-0.5 rounded ${triageColors[token.priority] || 'bg-muted text-muted-foreground'}`}>{token.priority}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">{token.patientName}</p>
                  {token.uhid && <span className="text-[10px] text-muted-foreground">{token.uhid}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{token.department} · {token.doctorName || 'Unassigned'} · #{token.queuePosition} in queue</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p><Clock className="w-3 h-3 inline mr-1" />{new Date(token.createdAt).toLocaleTimeString()}</p>
                {token.estimatedWaitTime && <p>~{token.estimatedWaitTime} min wait</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${token.status === 'Waiting' ? 'bg-warning/10 text-warning' : token.status === 'Called' ? 'bg-info/10 text-info' : token.status === 'In Consultation' ? 'bg-primary/10 text-primary' : token.status === 'Completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{token.status}</span>
            </div>
            {token.status === 'Waiting' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => callMut.mutate(token._id)}><Phone className="w-3 h-3 mr-1" /> Call</Button>
                <Button size="sm" variant="outline" onClick={() => skipMut.mutate({ id: token._id, reason: 'Not present' })}><SkipForward className="w-3 h-3 mr-1" /> Skip</Button>
              </div>
            )}
            {token.status === 'Called' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => startMut.mutate(token._id)}>Start Consultation</Button>
                <Button size="sm" variant="outline" onClick={() => recallMut.mutate(token._id)}>Recall</Button>
              </div>
            )}
            {token.status === 'In Consultation' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" variant="outline" onClick={() => completeMut.mutate(token._id)}><CheckCircle className="w-3 h-3 mr-1" /> Complete</Button>
              </div>
            )}
          </div>
        ))}
        {tokens.length === 0 && <div className="text-center py-20"><Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No tokens for today</p></div>}
      </div>

      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowGenerate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">Generate Token</h2><button onClick={() => setShowGenerate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newToken.patientName} onChange={e => setNewToken({ ...newToken, patientName: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">UHID (optional)</label><Input value={newToken.uhid} onChange={e => setNewToken({ ...newToken, uhid: e.target.value })} placeholder="Search existing patient" /></div>
              <div><label className="text-sm font-medium mb-1 block">Department *</label><select value={newToken.department} onChange={e => setNewToken({ ...newToken, department: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT', 'Ophthalmology', 'Dermatology'].map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label className="text-sm font-medium mb-1 block">Doctor</label><Input value={newToken.doctorName} onChange={e => setNewToken({ ...newToken, doctorName: e.target.value })} placeholder="Doctor name" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Type</label><select value={newToken.type} onChange={e => setNewToken({ ...newToken, type: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option>OPD</option><option>Follow-up</option><option>Emergency</option></select></div>
                <div><label className="text-sm font-medium mb-1 block">Priority</label><select value={newToken.priority} onChange={e => setNewToken({ ...newToken, priority: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"><option>Normal</option><option>Urgent</option><option>Emergency</option><option>FollowUp</option></select></div>
              </div>
              <Button className="w-full" onClick={() => generateMut.mutate(newToken)} disabled={generateMut.isPending || !newToken.patientName}>Generate Token</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
