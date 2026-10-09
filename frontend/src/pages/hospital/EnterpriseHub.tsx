import { useEffect, useState } from 'react';
import { Building2, FileSignature, Star, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api, downloadGstr } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';

/** File 16 §16.4/§16.5/§16.6: corporates, contracts, vendor scorecards. */
export default function EnterpriseHub() {
  const [tab, setTab] = useState<'corp' | 'contracts' | 'vendors' | 'accounts'>('corp');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vbills, setVbills] = useState<any[]>([]);
  const [vbForm, setVbForm] = useState({ supplierId: '', billNo: '', item: '', poQty: '', grnQty: '', billQty: '', rate: '', gstRate: '' });
  const [gstrMonth, setGstrMonth] = useState(new Date().toISOString().slice(0, 7));
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
      const [c, k, s, a, v]: any[] = await Promise.all([
        api.listCorporates(), api.listContracts({}), api.vendorScorecards({}),
        api.coa(), api.vendorBills(),
      ]);
      setCorps(c?.corporates || []);
      setContracts(k?.contracts || []);
      setScores(s?.scorecards || []);
      setAccounts(a?.accounts || []);
      setVbills(v?.bills || []);
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
        {([['corp', 'Corporates', Building2], ['contracts', 'Contracts', FileSignature], ['vendors', 'Vendors', Star], ['accounts', 'Accounts', Landmark]] as const).map(([k, label, Icon]) => (
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

      {tab === 'accounts' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm">Chart of accounts ({accounts.length})
            <Button size="sm" variant="outline" onClick={async () => { await api.seedCoa(); load(); }}>Seed</Button>
          </CardTitle></CardHeader>
            <CardContent className="max-h-72 space-y-1 overflow-auto">
              {accounts.map((a) => (
                <p key={a._id} className="flex justify-between rounded border px-2 py-1 font-mono text-[11px]">
                  <span>{a.code} · {a.name}</span><span className="text-muted-foreground">{a.group}</span>
                </p>
              ))}
            </CardContent></Card>
          <div className="space-y-3">
            <Card><CardHeader><CardTitle className="text-sm">Vendor bills ({vbills.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {vbills.slice(0, 10).map((b) => (
                  <div key={b._id} className="flex items-center justify-between rounded border p-2 text-xs">
                    <span><b>{b.billNo}</b> · ₹{(b.grandTotal || 0).toLocaleString('en-IN')} · <StatusPill status={b.matchStatus} /> · {b.status}</span>
                    {b.status === 'Draft' && b.matchStatus !== 'Unmatched' ? (
                      <Button size="sm" variant="outline" onClick={async () => { await api.postVendorBill(b._id); load(); }}>Post</Button>
                    ) : null}
                  </div>
                ))}
                <div className="grid grid-cols-4 gap-1 border-t pt-2">
                  <Input className="h-8 text-xs" placeholder="supplier id" value={vbForm.supplierId} onChange={(e) => setVbForm({ ...vbForm, supplierId: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="bill no" value={vbForm.billNo} onChange={(e) => setVbForm({ ...vbForm, billNo: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="item" value={vbForm.item} onChange={(e) => setVbForm({ ...vbForm, item: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="rate" value={vbForm.rate} onChange={(e) => setVbForm({ ...vbForm, rate: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="po qty" value={vbForm.poQty} onChange={(e) => setVbForm({ ...vbForm, poQty: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="grn qty" value={vbForm.grnQty} onChange={(e) => setVbForm({ ...vbForm, grnQty: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="bill qty" value={vbForm.billQty} onChange={(e) => setVbForm({ ...vbForm, billQty: e.target.value })} />
                  <Input className="h-8 text-xs" placeholder="gst %" value={vbForm.gstRate} onChange={(e) => setVbForm({ ...vbForm, gstRate: e.target.value })} />
                </div>
                <Button size="sm" onClick={async () => {
                  try {
                    await api.createVendorBill({
                      supplierId: vbForm.supplierId, billNo: vbForm.billNo,
                      lines: [{ item: vbForm.item, poQty: Number(vbForm.poQty), grnQty: Number(vbForm.grnQty), billQty: Number(vbForm.billQty), rate: Number(vbForm.rate), gstRate: Number(vbForm.gstRate) }],
                    });
                    toast.success('Vendor bill booked (3-way matched)');
                    load();
                  } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
                }}>Book bill</Button>
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">GSTR export</CardTitle></CardHeader>
              <CardContent className="flex gap-1">
                <Input className="h-8 w-32 text-xs" value={gstrMonth} onChange={(e) => setGstrMonth(e.target.value)} />
                <Button size="sm" variant="outline" onClick={async () => {
                  try { await downloadGstr(gstrMonth); }
                  catch { toast.error('Export failed'); }
                }}>Download CSV</Button>
              </CardContent></Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
