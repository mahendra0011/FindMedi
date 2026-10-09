import { useEffect, useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 13 §13.2: my approvals inbox + delegation manager. */
export default function ApprovalsInbox() {
  const [rows, setRows] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ toUser: '', from: '', to: '' });

  const load = async () => {
    try {
      const r: any = await api.approvalRequests({ mine: '1' });
      setRows(r?.requests || []);
      const d: any = await api.approvalDelegations();
      setDelegations(d?.delegations || []);
    } catch { toast.error('Failed to load approvals'); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      const r: any = await api.approvalDecide(id, { decision, comment });
      toast.success(`Request ${r?.status}`);
      setComment('');
      load();
    } catch (e: any) { toast.error(e?.message || 'Decision failed'); }
  };

  const delegate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDelegation({ ...form });
      toast.success('Delegation saved');
      setForm({ toUser: '', from: '', to: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Save failed'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader><CardTitle className="text-sm">My approvals ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div key={r._id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{r.title} <StatusPill status={r.status} /></p>
                <span className="text-xs text-muted-foreground">₹{r.amount}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {(r.steps || []).map((s: any, i: number) => (
                  <span key={i} className={`rounded border px-1.5 py-0.5 text-[11px] ${s.status === 'approved' ? 'border-green-300 bg-green-50' : s.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-border'}`}>
                    {s.role}: {s.status}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input className="h-8 text-xs" placeholder="comment (required for reject)" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button size="sm" onClick={() => decide(r._id, 'approved')}><Check size={14} /> Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => decide(r._id, 'rejected')}><X size={14} /> Reject</Button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="Inbox zero" hint="Pending requests where you are an eligible approver (delegations honoured) appear here." /> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Clock size={14} /> Delegations</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {delegations.map((d) => (
            <p key={d._id} className="rounded border px-2 py-1 text-xs">{String(d.fromUser).slice(-6)} → {String(d.toUser).slice(-6)} · {String(d.from).slice(0, 10)} → {String(d.to).slice(0, 10)}</p>
          ))}
          <form onSubmit={delegate} className="space-y-2 border-t pt-2">
            <Input placeholder="to user id" value={form.toUser} onChange={(e) => setForm({ ...form, toUser: e.target.value })} required />
            <div className="flex gap-2">
              <Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} required />
              <Input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} required />
            </div>
            <Button size="sm" type="submit">Save delegation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
