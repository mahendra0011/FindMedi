import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.6 — TPA desk: insurers, pre-auth lifecycle, claims settle,
 * pipeline funnel. Document checklist lives on the insurer master.
 */
export default function TpaDesk() {
  const [insurers, setInsurers] = useState<any[]>([]);
  const [preauths, setPreauths] = useState<any[]>([]);
  const [form, setForm] = useState({ admissionId: '', insurerId: '', estimate: '' });
  // File 22 P1-15: claim-side actions by claim id.
  const [claimId, setClaimId] = useState('');
  const [query, setQuery] = useState('');
  const [rent, setRent] = useState({ eligiblePerDay: '', actualPerDay: '', days: '' });
  const [pmjay, setPmjay] = useState<any[]>([]);
  const [pmForm, setPmForm] = useState({ code: '', name: '', rate: '' });

  const load = async () => {
    try {
      const [i, p, m] = await Promise.all([(api as any).getInsurers(), (api as any).getPreAuths({}), api.pmjayList({})]);
      setInsurers(i?.insurers || []);
      setPreauths(p?.preauths || []);
      setPmjay(m?.packages || []);
    } catch { toast.error('Failed to load TPA desk'); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await (api as any).createPreAuth({ ...form, estimate: Number(form.estimate) || 0 });
      toast.success('Pre-auth drafted');
      setForm({ admissionId: '', insurerId: '', estimate: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const move = async (id: string, status: string) => {
    try {
      await (api as any).setPreAuthStatus(id, { status });
      toast.success(`Pre-auth → ${status}`);
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">TPA Desk</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">New pre-auth ({insurers.length} insurers empanelled)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="Admission ID" value={form.admissionId} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} />
          <select aria-label="Insurer" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.insurerId} onChange={(e) => setForm({ ...form, insurerId: e.target.value })}>
            <option value="">Select insurer</option>
            {insurers.map((i: any) => <option key={i._id} value={i._id}>{i.name} ({i.type})</option>)}
          </select>
          <Input placeholder="Estimate ₹" type="number" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} />
          <Button onClick={create} disabled={!form.admissionId || !form.insurerId}>Create</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pre-auth queue ({preauths.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {preauths.map((p: any) => (
            <div key={p._id} className="flex flex-wrap items-center gap-2 text-sm rounded-lg border border-border/50 p-2.5">
              <span className="font-mono text-xs">{String(p._id).slice(-6)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted">{p.status}</span>
              <span className="text-xs text-muted-foreground">est ₹{p.estimate} · approved ₹{p.approvedAmount || 0}</span>
              <span className="flex-1" />
              {['Submitted', 'Approved', 'Rejected'].map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => move(p._id, s)}>{s}</Button>
              ))}
            </div>
          ))}
          {preauths.length === 0 && <p className="text-sm text-muted-foreground">Queue empty.</p>}
        </CardContent>
      </Card>
      {/* File 22 P1-15: claim actions + PM-JAY map */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Claim actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Claim ID" value={claimId} onChange={(e) => setClaimId(e.target.value)} />
            <div className="flex gap-2">
              <Input placeholder="Query text" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button size="sm" variant="outline" disabled={!claimId || !query} onClick={async () => {
                try { await api.tpaQuery(claimId, { text: query }); toast.success('Query posted'); setQuery(''); }
                catch { toast.error('Failed'); }
              }}>Post query</Button>
            </div>
            <div className="flex gap-2">
              <Input className="w-28" placeholder="Eligible/day" value={rent.eligiblePerDay} onChange={(e) => setRent({ ...rent, eligiblePerDay: e.target.value })} />
              <Input className="w-28" placeholder="Actual/day" value={rent.actualPerDay} onChange={(e) => setRent({ ...rent, actualPerDay: e.target.value })} />
              <Input className="w-20" placeholder="Days" value={rent.days} onChange={(e) => setRent({ ...rent, days: e.target.value })} />
              <Button size="sm" variant="outline" disabled={!claimId} onClick={async () => {
                try {
                  const r: any = await api.tpaRoomRent(claimId, { eligiblePerDay: Number(rent.eligiblePerDay), actualPerDay: Number(rent.actualPerDay), days: Number(rent.days) });
                  toast.success(`Deduction ₹${r?.deduction}`);
                } catch { toast.error('Failed'); }
              }}>Room-rent cut</Button>
            </div>
            <Button size="sm" variant="outline" disabled={!claimId} onClick={async () => {
              const grounds = window.prompt('Appeal grounds:');
              if (!grounds) return;
              try { await api.tpaAppeal(claimId, grounds); toast.success('Appeal filed as child claim'); }
              catch (e: any) { toast.error(e?.response?.data?.message || 'Appeal failed'); }
            }}>Appeal (Rejected/Partial only)</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">PM-JAY packages ({pmjay.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Input className="w-24" placeholder="Code" value={pmForm.code} onChange={(e) => setPmForm({ ...pmForm, code: e.target.value })} />
              <Input placeholder="Name" value={pmForm.name} onChange={(e) => setPmForm({ ...pmForm, name: e.target.value })} />
              <Input className="w-28" placeholder="Rate" value={pmForm.rate} onChange={(e) => setPmForm({ ...pmForm, rate: e.target.value })} />
              <Button size="sm" variant="outline" onClick={async () => {
                try { await api.pmjayUpsert({ ...pmForm, rate: Number(pmForm.rate) }); setPmForm({ code: '', name: '', rate: '' }); load(); }
                catch { toast.error('Failed'); }
              }}>Save</Button>
            </div>
            <div className="max-h-48 space-y-1 overflow-auto">
              {pmjay.slice(0, 30).map((p: any) => (
                <p key={p._id} className="flex justify-between rounded border px-2 py-1 font-mono text-[11px]">
                  <span>{p.code} · {p.name}</span><b>₹{(p.rate || 0).toLocaleString('en-IN')}</b>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
