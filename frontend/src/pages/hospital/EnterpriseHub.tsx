import { useEffect, useState } from 'react';
import { Building2, FileSignature, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';

/** File 16 §16.4/§16.5/§16.6: corporates, contracts, vendor scorecards. */
export default function EnterpriseHub() {
  const [tab, setTab] = useState<'corp' | 'contracts' | 'vendors'>('corp');
  const [corps, setCorps] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [corpForm, setCorpForm] = useState({ name: '', creditLimit: '' });
  const [elig, setElig] = useState<any | null>(null);
  const [eligQ, setEligQ] = useState({ id: '', employeeId: '', amount: '' });
  const [ctForm, setCtForm] = useState({ kind: 'rate', counterparty: '', value: '', startDate: '', endDate: '' });
  const [scoreQ, setScoreQ] = useState({ supplierId: '', period: '' });

  const load = async () => {
    try {
      const [c, k, s]: any[] = await Promise.all([api.listCorporates(), api.listContracts({}), api.vendorScorecards({})]);
      setCorps(c?.corporates || []);
      setContracts(k?.contracts || []);
      setScores(s?.scorecards || []);
    } catch { toast.error('Failed to load enterprise data'); }
  };
  useEffect(() => { load(); }, []);

  const addCorp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCorporate({ name: corpForm.name, creditLimit: Number(corpForm.creditLimit) || 0 });
      setCorpForm({ name: '', creditLimit: '' });
      toast.success('Corporate added');
      load();
    } catch { toast.error('Save failed'); }
  };

  const checkElig = async () => {
    try {
      const r: any = await api.corporateEligibility(eligQ.id, { employeeId: eligQ.employeeId, amount: eligQ.amount });
      setElig(r);
    } catch (e: any) { toast.error(e?.message || 'Check failed'); }
  };

  const addContract = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createContract({ ...ctForm, value: Number(ctForm.value) || 0 });
      toast.success('Contract saved');
      load();
    } catch { toast.error('Save failed'); }
  };

  const compute = async () => {
    try {
      const r: any = await api.computeScorecard(scoreQ.supplierId, scoreQ.period);
      toast.success(`Score: ${r?.score ?? 'n/a (no POs in period)'}`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Compute failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-1">
        {([['corp', 'Corporates', Building2], ['contracts', 'Contracts', FileSignature], ['vendors', 'Vendors', Star]] as const).map(([k, label, Icon]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k)}><Icon size={14} /> {label}</Button>
        ))}
      </div>

      {tab === 'corp' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="text-sm">Corporates ({corps.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {corps.map((c) => (
                <div key={c._id} className="flex items-center justify-between rounded border p-2 text-xs">
                  <span><b>{c.name}</b> · limit ₹{(c.creditLimit || 0).toLocaleString('en-IN')} · used ₹{(c.creditUsed || 0).toLocaleString('en-IN')}</span>
                  <StatusPill status={c.active ? 'active' : 'inactive'} />
                </div>
              ))}
              <form onSubmit={addCorp} className="flex gap-1 border-t pt-2">
                <Input className="h-8 text-xs" placeholder="name" value={corpForm.name} onChange={(e) => setCorpForm({ ...corpForm, name: e.target.value })} required />
                <Input className="h-8 w-32 text-xs" placeholder="credit limit" value={corpForm.creditLimit} onChange={(e) => setCorpForm({ ...corpForm, creditLimit: e.target.value })} />
                <Button size="sm" type="submit">Add</Button>
              </form>
            </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Eligibility check</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <Input className="h-8 text-xs" placeholder="corporate id" value={eligQ.id} onChange={(e) => setEligQ({ ...eligQ, id: e.target.value })} />
              <div className="flex gap-1">
                <Input className="h-8 text-xs" placeholder="employee id" value={eligQ.employeeId} onChange={(e) => setEligQ({ ...eligQ, employeeId: e.target.value })} />
                <Input className="h-8 text-xs" placeholder="amount" value={eligQ.amount} onChange={(e) => setEligQ({ ...eligQ, amount: e.target.value })} />
              </div>
              <Button size="sm" onClick={checkElig}>Check</Button>
              {elig ? <p className="text-sm">Eligible: <b>{elig.eligible ? 'YES' : 'NO'}</b> · headroom ₹{(elig.headroom || 0).toLocaleString('en-IN')}</p> : null}
            </CardContent></Card>
        </div>
      ) : null}

      {tab === 'contracts' ? (
        <Card><CardHeader><CardTitle className="text-sm">Contracts ({contracts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {contracts.map((c) => (
              <div key={c._id} className="flex items-center justify-between rounded border p-2 text-xs">
                <span><b>{c.kind}</b> · {c.counterparty} · ₹{(c.value || 0).toLocaleString('en-IN')} · ends {String(c.endDate).slice(0, 10)}</span>
                <StatusPill status={c.status} />
              </div>
            ))}
            <form onSubmit={addContract} className="flex flex-wrap gap-1 border-t pt-2">
              <select className="rounded-md border px-2 py-1.5 text-xs" value={ctForm.kind} onChange={(e) => setCtForm({ ...ctForm, kind: e.target.value })}>
                <option>rate</option><option>amc</option><option>service</option><option>lease</option>
              </select>
              <Input className="h-8 w-40 text-xs" placeholder="counterparty" value={ctForm.counterparty} onChange={(e) => setCtForm({ ...ctForm, counterparty: e.target.value })} required />
              <Input className="h-8 w-28 text-xs" placeholder="value" value={ctForm.value} onChange={(e) => setCtForm({ ...ctForm, value: e.target.value })} />
              <Input className="h-8 w-36 text-xs" type="date" value={ctForm.startDate} onChange={(e) => setCtForm({ ...ctForm, startDate: e.target.value })} required />
              <Input className="h-8 w-36 text-xs" type="date" value={ctForm.endDate} onChange={(e) => setCtForm({ ...ctForm, endDate: e.target.value })} required />
              <Button size="sm" type="submit">Save</Button>
            </form>
          </CardContent></Card>
      ) : null}

      {tab === 'vendors' ? (
        <Card><CardHeader><CardTitle className="text-sm">Vendor scorecards ({scores.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {scores.map((s) => (
              <p key={s._id} className="rounded border p-2 text-xs">supplier {String(s.supplierId).slice(-6)} · {s.period} · on-time {s.onTimePct ?? '—'}% · fill {s.fillRatePct ?? '—'}% · <b>score {s.score ?? '—'}</b></p>
            ))}
            <div className="flex gap-1 border-t pt-2">
              <Input className="h-8 text-xs" placeholder="supplier id" value={scoreQ.supplierId} onChange={(e) => setScoreQ({ ...scoreQ, supplierId: e.target.value })} />
              <Input className="h-8 w-32 text-xs" placeholder="YYYY-MM" value={scoreQ.period} onChange={(e) => setScoreQ({ ...scoreQ, period: e.target.value })} />
              <Button size="sm" onClick={compute}>Compute</Button>
            </div>
          </CardContent></Card>
      ) : null}
    </div>
  );
}
