import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, CheckCircle, X, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const insApi = {
  getAll: (p = {}) => api.dispatch(() => Promise.resolve({ claims: [] }), '/insurance?' + new URLSearchParams(p)),
  create: (b) => api.dispatch(() => Promise.resolve({}), '/insurance', { method: 'POST', body: JSON.stringify(b) }),
  update: (id, b) => api.dispatch(() => Promise.resolve({}), `/insurance/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  preAuth: (id, b) => api.dispatch(() => Promise.resolve({}), `/insurance/${id}/pre-auth`, { method: 'PUT', body: JSON.stringify(b) }),
  fileClaim: (id, b) => api.dispatch(() => Promise.resolve({}), `/insurance/${id}/file-claim`, { method: 'PUT', body: JSON.stringify(b) }),
  settle: (id, b) => api.dispatch(() => Promise.resolve({}), `/insurance/${id}/settle`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: () => api.dispatch(() => Promise.resolve({ total: 0, pending: 0, approved: 0, filed: 0, settled: 0, cashless: 0 }), '/insurance/stats/main'),
};

const statusColors = {
  'Not Filed': 'bg-muted text-muted-foreground',
  Filed: 'bg-info/10 text-info',
  Processing: 'bg-warning/10 text-warning',
  Settled: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
};

const preAuthColors = {
  'Not Required': 'bg-muted text-muted-foreground',
  Pending: 'bg-warning/10 text-warning',
  Approved: 'bg-success/10 text-success',
  'Partially Approved': 'bg-orange-500/10 text-orange-600',
  Rejected: 'bg-destructive/10 text-destructive',
};

export default function Insurance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newClaim, setNewClaim] = useState({
    patientName: '', patientId: '', insuranceProvider: '', policyNumber: '',
    insuranceId: '', tpaName: '', tpaContact: '', coverageType: 'Cashless',
    diagnosis: '', treatmentPlan: '', estimatedCost: '',
  });

  const { data } = useQuery({ queryKey: ['insurance', search], queryFn: () => insApi.getAll({ search }) });
  const { data: stats } = useQuery({ queryKey: ['insurance-stats'], queryFn: insApi.getStats });
  const claims = data?.claims || [];

  const createMut = useMutation({ mutationFn: insApi.create, onSuccess: () => { qc.invalidateQueries(['insurance', 'insurance-stats']); setShowCreate(false); } });
  const preAuthMut = useMutation({ mutationFn: ({ id, ...b }) => insApi.preAuth(id, b), onSuccess: () => qc.invalidateQueries(['insurance']) });
  const fileMut = useMutation({ mutationFn: ({ id, ...b }) => insApi.fileClaim(id, b), onSuccess: () => qc.invalidateQueries(['insurance']) });
  const settleMut = useMutation({ mutationFn: ({ id, ...b }) => insApi.settle(id, b), onSuccess: () => qc.invalidateQueries(['insurance']) });

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Insurance / TPA</h1><p className="page-subtitle">{stats?.total || 0} claims · {stats?.pending || 0} pending</p></div>

      <div className="grid grid-cols-6 gap-4 mb-6">
        {[
          { l: 'Total Claims', v: stats?.total || 0, c: 'text-foreground' },
          { l: 'Pre-Auth Pending', v: stats?.pending || 0, c: 'text-warning' },
          { l: 'Pre-Auth Approved', v: stats?.approved || 0, c: 'text-success' },
          { l: 'Claims Filed', v: stats?.filed || 0, c: 'text-info' },
          { l: 'Settled', v: stats?.settled || 0, c: 'text-success' },
          { l: 'Cashless', v: stats?.cashless || 0, c: 'text-primary' },
        ].map(s => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search claims..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Insurance</Button>
      </div>

      <div className="space-y-4">
        {claims.map(claim => {
          const isExpanded = expandedId === claim._id;
          return (
            <div key={claim._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : claim._id)}>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{claim.insuranceProvider} — {claim.patientName}</p>
                    <p className="text-xs text-muted-foreground">{claim.claimId} · {claim.policyNumber}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${preAuthColors[claim.preAuthStatus] || ''}`}>{claim.preAuthStatus}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[claim.claimStatus] || ''}`}>{claim.claimStatus}</span>
                  <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{new Date(claim.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Coverage</span><p className="font-medium">{claim.coverageType}</p></div>
                    <div><span className="text-muted-foreground">TPA</span><p className="font-medium">{claim.tpaName || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Diagnosis</span><p className="font-medium">{claim.diagnosis || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Est. Cost</span><p className="font-medium">₹{claim.estimatedCost || 0}</p></div>
                    {claim.preAuthAmount && <div><span className="text-muted-foreground">Pre-Auth Amt</span><p className="font-medium">₹{claim.preAuthAmount}</p></div>}
                    {claim.approvedAmount && <div><span className="text-muted-foreground">Settled Amt</span><p className="font-medium">₹{claim.approvedAmount}</p></div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {claim.preAuthStatus === 'Pending' && (
                      <Button size="sm" variant="outline" onClick={() => { const a = prompt('Approved amount:'); if (a) preAuthMut.mutate({ id: claim._id, preAuthStatus: 'Approved', preAuthAmount: parseInt(a) }); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve Pre-Auth
                      </Button>
                    )}
                    {claim.preAuthStatus === 'Approved' && claim.claimStatus === 'Not Filed' && (
                      <Button size="sm" variant="outline" onClick={() => { const a = prompt('Claim amount:'); if (a) fileMut.mutate({ id: claim._id, claimAmount: parseInt(a) }); }}>
                        <Plus className="w-3 h-3 mr-1" /> File Claim
                      </Button>
                    )}
                    {claim.claimStatus === 'Filed' && (
                      <Button size="sm" variant="outline" onClick={() => { const a = prompt('Settled amount:'); if (a) settleMut.mutate({ id: claim._id, approvedAmount: parseInt(a) }); }}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Settle Claim
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {claims.length === 0 && <div className="text-center py-20"><Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No insurance claims</p></div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6"><h2 className="font-heading text-xl font-bold">New Insurance Claim</h2><button onClick={() => setShowCreate(false)}><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Patient Name *</label><Input value={newClaim.patientName} onChange={e => setNewClaim({ ...newClaim, patientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1 block">Insurance Provider *</label><Input value={newClaim.insuranceProvider} onChange={e => setNewClaim({ ...newClaim, insuranceProvider: e.target.value })} placeholder="e.g. Star Health" /></div>
                <div><label className="text-sm font-medium mb-1 block">Policy Number *</label><Input value={newClaim.policyNumber} onChange={e => setNewClaim({ ...newClaim, policyNumber: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Insurance ID</label><Input value={newClaim.insuranceId} onChange={e => setNewClaim({ ...newClaim, insuranceId: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Coverage Type</label><select value={newClaim.coverageType} onChange={e => setNewClaim({ ...newClaim, coverageType: e.target.value })} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">{['Cashless', 'Reimbursement'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-sm font-medium mb-1 block">TPA Name</label><Input value={newClaim.tpaName} onChange={e => setNewClaim({ ...newClaim, tpaName: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">TPA Contact</label><Input value={newClaim.tpaContact} onChange={e => setNewClaim({ ...newClaim, tpaContact: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Diagnosis</label><Input value={newClaim.diagnosis} onChange={e => setNewClaim({ ...newClaim, diagnosis: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-1 block">Estimated Cost (₹)</label><Input type="number" value={newClaim.estimatedCost} onChange={e => setNewClaim({ ...newClaim, estimatedCost: e.target.value })} /></div>
              <Button className="w-full" onClick={() => createMut.mutate(newClaim)} disabled={createMut.isPending || !newClaim.patientName || !newClaim.insuranceProvider || !newClaim.policyNumber}>Create Claim</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}