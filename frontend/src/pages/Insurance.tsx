import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, CheckCircle, X, Shield, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

type PreAuthAttempt = {
  attemptNumber?: number;
  requestedAmount?: number;
  status?: string;
  decisionAmount?: number | null;
  denialReason?: string | null;
  requestedAt?: string;
  decidedAt?: string;
};

type Claim = {
  _id: string;
  claimId?: string;
  insuranceProvider?: string;
  patientName?: string;
  policyNumber?: string;
  coverageType?: string;
  tpaName?: string;
  diagnosis?: string;
  estimatedCost?: number;
  claimAmount?: number;
  approvedAmount?: number;
  preAuthStatus?: string;
  preAuthAmount?: number | null;
  preAuthExpiry?: string;
  preAuthDenialReason?: string | null;
  preAuthAttempts?: PreAuthAttempt[];
  claimStatus?: string;
  createdAt?: string;
};

type Stats = {
  total?: number;
  pending?: number;
  approved?: number;
  filed?: number;
  settled?: number;
  cashless?: number;
};

type PreAuthRequest = { requestedAmount?: number };
type Decision = 'Approved' | 'Partially Approved' | 'Rejected';
type PreAuthDecision = { decision: Decision; decisionAmount?: number; denialReason?: string };
type AmountVars = { id: string; requestedAmount?: number };
type DecisionVars = { id: string } & PreAuthDecision;
type FileVars = { id: string; claimAmount?: number };
type SettleVars = { id: string; approvedAmount?: number };

const insApi = {
  getAll: (p: Record<string, string> = {}): Promise<{ claims?: Claim[] }> =>
    api.dispatch(() => Promise.resolve({ claims: [] as Claim[] }), '/insurance?' + new URLSearchParams(p)),
  create: (b: Record<string, unknown>): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), '/insurance', { method: 'POST', body: JSON.stringify(b) }),
  update: (id: string, b: Record<string, unknown>): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  // INS-M-02: the pre-auth is a state machine — request, decide, resubmit.
  requestPreAuth: (id: string, b: PreAuthRequest): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}/pre-auth`, { method: 'POST', body: JSON.stringify(b) }),
  decidePreAuth: (id: string, b: PreAuthDecision): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}/pre-auth`, { method: 'PUT', body: JSON.stringify(b) }),
  resubmitPreAuth: (id: string, b: PreAuthRequest): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}/pre-auth/resubmit`, { method: 'POST', body: JSON.stringify(b) }),
  fileClaim: (id: string, b: { claimAmount?: number }): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}/file-claim`, { method: 'PUT', body: JSON.stringify(b) }),
  settle: (id: string, b: { approvedAmount?: number }): Promise<Claim> =>
    api.dispatch(() => Promise.resolve({}), `/insurance/${id}/settle`, { method: 'PUT', body: JSON.stringify(b) }),
  getStats: (): Promise<Stats> =>
    api.dispatch(() => Promise.resolve({ total: 0, pending: 0, approved: 0, filed: 0, settled: 0, cashless: 0 }), '/insurance/stats/main'),
};

const statusColors: Record<string, string> = {
  'Not Filed': 'bg-muted text-muted-foreground',
  Filed: 'bg-info/10 text-info',
  Processing: 'bg-warning/10 text-warning',
  Settled: 'bg-success/10 text-success',
  Rejected: 'bg-destructive/10 text-destructive',
};

const preAuthColors: Record<string, string> = {
  'Not Required': 'bg-muted text-muted-foreground',
  Pending: 'bg-warning/10 text-warning',
  Approved: 'bg-success/10 text-success',
  'Partially Approved': 'bg-orange-500/10 text-orange-600',
  Rejected: 'bg-destructive/10 text-destructive',
};

// Server errors carry the actionable message in `response.data.message`
// (PRE_AUTH_REQUIRED, AMOUNT_EXCEEDS_REQUEST, ...); axios's own message is
// just "Request failed with status code 409".
const errMsg = (e: unknown, fallback: string): string => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || fallback;
};

const promptAmount = (label: string, suggested?: number | null): number | null => {
  const raw = prompt(label, suggested ? String(suggested) : '');
  if (raw === null) return null;
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (!trimmed || !Number.isFinite(n) || n <= 0) {
    toast.error('Enter a positive amount');
    return null;
  }
  return n;
};

const promptReason = (label: string): string | null => {
  const raw = prompt(label);
  if (raw === null) return null;
  const reason = raw.trim();
  if (reason.length < 5) {
    toast.error('A reason of at least 5 characters is required');
    return null;
  }
  return reason;
};

export default function Insurance() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newClaim, setNewClaim] = useState({
    patientName: '', patientId: '', insuranceProvider: '', policyNumber: '',
    insuranceId: '', tpaName: '', tpaContact: '', coverageType: 'Cashless',
    diagnosis: '', treatmentPlan: '', estimatedCost: '',
  });

  const { data } = useQuery({ queryKey: ['insurance', search], queryFn: () => insApi.getAll({ search }) });
  const { data: stats } = useQuery({ queryKey: ['insurance-stats'], queryFn: insApi.getStats });
  const claims = data?.claims || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['insurance'] });
    qc.invalidateQueries({ queryKey: ['insurance-stats'] });
  };

  const createMut = useMutation({
    mutationFn: (b: Record<string, unknown>) => insApi.create(b),
    onSuccess: () => { invalidate(); setShowCreate(false); },
    onError: (e) => toast.error(errMsg(e, 'Unable to create claim')),
  });
  const requestPreAuthMut = useMutation({
    mutationFn: ({ id, ...b }: AmountVars) => insApi.requestPreAuth(id, b),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, 'Unable to request pre-auth')),
  });
  const decidePreAuthMut = useMutation({
    mutationFn: ({ id, ...b }: DecisionVars) => insApi.decidePreAuth(id, b),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, 'Unable to record the decision')),
  });
  const resubmitPreAuthMut = useMutation({
    mutationFn: ({ id, ...b }: AmountVars) => insApi.resubmitPreAuth(id, b),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, 'Unable to resubmit pre-auth')),
  });
  const fileMut = useMutation({
    mutationFn: ({ id, ...b }: FileVars) => insApi.fileClaim(id, b),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, 'Unable to file the claim')),
  });
  const settleMut = useMutation({
    mutationFn: ({ id, ...b }: SettleVars) => insApi.settle(id, b),
    onSuccess: invalidate,
    onError: (e) => toast.error(errMsg(e, 'Unable to settle the claim')),
  });

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"><h1 className="page-title">Insurance / TPA</h1><p className="page-subtitle">{stats?.total || 0} claims · {stats?.pending || 0} pending</p></div>

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
          const preAuth = claim.preAuthStatus || 'Not Required';
          const claimStatus = claim.claimStatus || 'Not Filed';
          const isCashless = claim.coverageType === 'Cashless';
          const notFiled = claimStatus === 'Not Filed';
          const canFile = notFiled && (!isCashless || preAuth === 'Approved' || preAuth === 'Partially Approved');

          const onRequestPreAuth = () => {
            const amount = promptAmount('Requested pre-auth amount (₹):', claim.estimatedCost ?? null);
            if (amount === null) return;
            requestPreAuthMut.mutate({ id: claim._id, requestedAmount: amount });
          };
          const onApprove = () => {
            const amount = promptAmount('Approved amount (₹, cannot exceed the request):', claim.preAuthAmount ?? null);
            if (amount === null) return;
            decidePreAuthMut.mutate({ id: claim._id, decision: 'Approved', decisionAmount: amount });
          };
          const onPartial = () => {
            const amount = promptAmount('Amount to approve (₹):', claim.preAuthAmount ?? null);
            if (amount === null) return;
            const reason = promptReason('Why is the remaining amount not approved?');
            if (reason === null) return;
            decidePreAuthMut.mutate({ id: claim._id, decision: 'Partially Approved', decisionAmount: amount, denialReason: reason });
          };
          const onReject = () => {
            const reason = promptReason('Rejection reason (recorded against this attempt):');
            if (reason === null) return;
            decidePreAuthMut.mutate({ id: claim._id, decision: 'Rejected', denialReason: reason });
          };
          const onResubmit = () => {
            const prior = claim.preAuthAttempts?.[claim.preAuthAttempts.length - 1];
            const amount = promptAmount('Resubmitted pre-auth amount (₹):', prior?.requestedAmount ?? claim.estimatedCost ?? null);
            if (amount === null) return;
            resubmitPreAuthMut.mutate({ id: claim._id, requestedAmount: amount });
          };
          const onFile = () => {
            const suggested = claim.claimAmount || claim.estimatedCost;
            const raw = prompt('Claim amount (₹, leave empty for the estimate):', suggested ? String(suggested) : '');
            if (raw === null) return;
            const trimmed = raw.trim();
            if (!trimmed) { fileMut.mutate({ id: claim._id }); return; }
            const n = Number(trimmed);
            if (!Number.isFinite(n) || n <= 0) { toast.error('Enter a positive amount'); return; }
            fileMut.mutate({ id: claim._id, claimAmount: n });
          };
          const onSettle = () => {
            const suggested = claim.claimAmount || claim.estimatedCost;
            const raw = prompt('Settled amount (₹, leave empty for the full claimed amount):', suggested ? String(suggested) : '');
            if (raw === null) return;
            const trimmed = raw.trim();
            if (!trimmed) { settleMut.mutate({ id: claim._id }); return; }
            const n = Number(trimmed);
            if (!Number.isFinite(n) || n <= 0) { toast.error('Enter a positive amount'); return; }
            settleMut.mutate({ id: claim._id, approvedAmount: n });
          };

          return (
            <div key={claim._id} className="bg-card rounded-xl border shadow-sm">
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : claim._id)}>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{claim.insuranceProvider} — {claim.patientName}</p>
                    <p className="text-xs text-muted-foreground">{claim.claimId} · {claim.policyNumber}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${preAuthColors[preAuth] || ''}`}>{preAuth}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[claimStatus] || ''}`}>{claimStatus}</span>
                  <span className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />{new Date(claim.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Coverage</span><p className="font-medium">{claim.coverageType}</p></div>
                    <div><span className="text-muted-foreground">TPA</span><p className="font-medium">{claim.tpaName || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Diagnosis</span><p className="font-medium">{claim.diagnosis || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Est. Cost</span><p className="font-medium">₹{claim.estimatedCost || 0}</p></div>
                    {claim.preAuthAmount != null && <div><span className="text-muted-foreground">Pre-Auth Amt</span><p className="font-medium">₹{claim.preAuthAmount}</p></div>}
                    {claim.preAuthExpiry && (preAuth === 'Approved' || preAuth === 'Partially Approved') && (
                      <div><span className="text-muted-foreground">Pre-Auth Expiry</span><p className="font-medium">{new Date(claim.preAuthExpiry).toLocaleDateString()}</p></div>
                    )}
                    {claim.approvedAmount != null && <div><span className="text-muted-foreground">Settled Amt</span><p className="font-medium">₹{claim.approvedAmount}</p></div>}
                  </div>

                  {claim.preAuthDenialReason && (
                    <div className="flex items-start gap-2 text-sm rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-destructive">
                          {preAuth === 'Partially Approved' ? 'Partial approval note: ' : 'Denied: '}
                        </span>
                        {claim.preAuthDenialReason}
                      </div>
                    </div>
                  )}

                  {claim.preAuthAttempts && claim.preAuthAttempts.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Pre-Auth Attempts</p>
                      {claim.preAuthAttempts.map((a, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2 text-xs border rounded-lg px-2 py-1.5">
                          <span className="font-medium">#{a.attemptNumber ?? i + 1}</span>
                          <span className={`px-1.5 py-0.5 rounded-full ${preAuthColors[a.status || ''] || ''}`}>{a.status}</span>
                          <span className="text-muted-foreground">₹{a.requestedAmount ?? 0} requested</span>
                          {a.decisionAmount != null && <span className="text-muted-foreground">₹{a.decisionAmount} decided</span>}
                          {a.denialReason && <span className="text-destructive">“{a.denialReason}”</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {isCashless && notFiled && preAuth === 'Not Required' && (
                      <Button size="sm" variant="outline" onClick={onRequestPreAuth} disabled={requestPreAuthMut.isPending}>
                        <Clock className="w-3 h-3 mr-1" /> Request Pre-Auth
                      </Button>
                    )}
                    {preAuth === 'Pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={onApprove} disabled={decidePreAuthMut.isPending}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve Pre-Auth
                        </Button>
                        <Button size="sm" variant="outline" onClick={onPartial} disabled={decidePreAuthMut.isPending}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Partial Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={onReject} disabled={decidePreAuthMut.isPending}>
                          <X className="w-3 h-3 mr-1" /> Reject Pre-Auth
                        </Button>
                      </>
                    )}
                    {isCashless && notFiled && preAuth === 'Rejected' && (
                      <Button size="sm" variant="outline" onClick={onResubmit} disabled={resubmitPreAuthMut.isPending}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Resubmit Pre-Auth
                      </Button>
                    )}
                    {canFile && (
                      <Button size="sm" variant="outline" onClick={onFile} disabled={fileMut.isPending}>
                        <Plus className="w-3 h-3 mr-1" /> File Claim
                      </Button>
                    )}
                    {claimStatus === 'Filed' && (
                      <Button size="sm" variant="outline" onClick={onSettle} disabled={settleMut.isPending}>
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
