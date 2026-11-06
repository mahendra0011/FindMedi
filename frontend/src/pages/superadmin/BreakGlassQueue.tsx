import { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/**
 * File 23 §4.2/§8 — Break-glass requests queue.
 * Request (reason + ticket + subject + ≤60 min) → a DIFFERENT approver decides
 * (mental-health/legal need two). Self-approval is rejected server-side.
 * Request/decide calls need a fresh step-up (phi:breakglass) or they 403.
 */
const REASONS = ['patient_support_consent', 'safety_incident', 'legal_order', 'fraud_investigation', 'data_repair'];
const SUBJECTS = ['patient', 'record', 'booking', 'mental_health'];

export default function BreakGlassQueue() {
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const userRole = user?.role;
  const [form, setForm] = useState({ subjectType: 'patient', subjectId: '', reasonCode: 'patient_support_consent', ticketId: '', reasonNote: '', durationMin: 30 });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.getBreakGlass({});
      setGrants(res?.grants || []);
      if (userRole === 'dpo') {
        const reviews: any = await api.getBreakGlassReviewQueue();
        setReviewQueue(reviews?.grants || []);
      }
    } catch { toast.error('Failed to load break-glass queue'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [userRole]);

  const submitReview = async (id: string) => {
    const note = (reviewNotes[id] || '').trim();
    if (note.length < 10) return toast.error('DPO review note must contain at least 10 characters');
    try {
      await api.reviewBreakGlass(id, { note });
      toast.success('Post-access review recorded');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Could not record review'); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.requestBreakGlass({ ...form, durationMin: Number(form.durationMin) });
      toast.success('Break-glass requested — a different approver must decide');
      setForm({ subjectType: 'patient', subjectId: '', reasonCode: 'patient_support_consent', ticketId: '', reasonNote: '', durationMin: 30 });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Request failed (step-up may be required)');
    }
  };

  const decide = async (id: string, action: 'approve' | 'deny') => {
    try {
      const res: any = await api.decideBreakGlass(id, { action });
      if (res?.need === 2) toast.success('First approval recorded — second approver needed');
      else toast.success(action === 'approve' ? 'Grant approved (time-boxed)' : 'Grant denied');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Decision failed (self-approval is blocked)');
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.revokeBreakGlass(id);
      toast.success('Grant revoked');
      load();
    } catch { toast.error('Revoke failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-destructive" />
        <div>
          <h1 className="text-2xl font-heading font-bold">Break-glass Requests</h1>
          <p className="text-sm text-muted-foreground">Time-boxed PHI access — reason, ticket, single subject, audit. Self-approval impossible.</p>
        </div>
      </div>

      {['superadmin', 'super_admin', 'clinical_safety'].includes(userRole || '') && <Card>
        <CardHeader><CardTitle className="text-base">New request</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
            <select aria-label="Subject type" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.subjectType} onChange={(e) => setForm({ ...form, subjectType: e.target.value })}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Input placeholder="Subject ID (24-hex)" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required />
            <select aria-label="Reason" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.reasonCode} onChange={(e) => setForm({ ...form, reasonCode: e.target.value })}>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <Input placeholder="Ticket / incident ID" value={form.ticketId} onChange={(e) => setForm({ ...form, ticketId: e.target.value })} />
            <Input placeholder="Reason note" value={form.reasonNote} onChange={(e) => setForm({ ...form, reasonNote: e.target.value })} />
            <Input type="number" min={5} max={60} aria-label="Duration minutes" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
            <div className="sm:col-span-3"><Button type="submit">Request access</Button></div>
          </form>
        </CardContent>
      </Card>}

      {userRole !== 'auditor' && <Card>
        <CardHeader><CardTitle className="text-base">Queue {loading ? '' : `(${grants.length})`}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {grants.map((g) => (
            <div key={g.id || g._id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 p-3 text-sm">
              <span className="font-mono text-xs">{g.subject?.type}:{String(g.subject?.id).slice(-6)}</span>
              <span className="text-xs text-muted-foreground">{g.reasonCode}{g.ticketId ? ` · ${g.ticketId}` : ''}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${g.status === 'approved' ? 'bg-success/10 text-success' : g.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{g.status}</span>
              {typeof g.accessLog === 'number' && <span className="text-[11px] text-muted-foreground">{g.accessLog} reads</span>}
              {Array.isArray(g.accessLog) && <span className="text-[11px] text-muted-foreground">{g.accessLog.length} reads</span>}
              <span className="flex-1" />
              {g.status === 'pending' && userRole !== 'support_l2' && userRole !== 'clinical_safety' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => decide(g.id || g._id, 'approve')}><CheckCircle className="w-3.5 h-3.5 mr-1" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide(g.id || g._id, 'deny')}><XCircle className="w-3.5 h-3.5 mr-1" />Deny</Button>
                </>
              )}
              {g.status === 'approved' && userRole !== 'support_l2' && userRole !== 'clinical_safety' && (
                <Button size="sm" variant="outline" onClick={() => revoke(g.id || g._id)}><Ban className="w-3.5 h-3.5 mr-1" />Revoke</Button>
              )}
            </div>
          ))}
          {!loading && grants.length === 0 && <p className="text-sm text-muted-foreground">No requests.</p>}
        </CardContent>
      </Card>}
      {userRole === 'dpo' && <Card>
        <CardHeader><CardTitle className="text-base">Post-access DPO review ({reviewQueue.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {reviewQueue.map((g) => <div key={g.id} className="rounded-xl border p-3 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2"><span>{g.subjectType}:{String(g.subjectId).slice(-6)}</span><span>{g.reasonCode}</span><span>{g.status}</span><span>{g.accesses?.length || 0} access event(s)</span><span>{g.patientNotifiedAt ? 'Patient notice recorded' : g.notificationPending ? 'Patient notice retry pending' : 'Patient notice status unavailable'}</span></div>
            <p className="text-xs text-muted-foreground">Ticket {g.ticketId} · {g.reasonNote}</p>
            <p className="text-xs text-muted-foreground">Approvers: {(g.approverIds || []).join(', ') || 'none'} · requester {g.requesterId}</p>
            {g.dpoReviewedAt ? <p className="text-xs text-success">Reviewed: {new Date(g.dpoReviewedAt).toLocaleString()} — {g.dpoReviewNote}</p> : <><Input value={reviewNotes[g.id] || ''} onChange={(e) => setReviewNotes((prev) => ({ ...prev, [g.id]: e.target.value }))} placeholder="Post-access review note (10+ chars)" /><Button size="sm" onClick={() => submitReview(g.id)}>Record review</Button></>}
          </div>)}
          {!reviewQueue.length && <p className="text-sm text-muted-foreground">No completed access grants need review.</p>}
        </CardContent>
      </Card>}
    </div>
  );
}
