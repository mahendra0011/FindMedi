import { useEffect, useState } from 'react';
import { Award, Hammer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-30: NABH chapters + assessments, CAPA board, registers. */
export default function QualityBoard() {
  const [tab, setTab] = useState<'nabh' | 'capa' | 'registers'>('nabh');
  const [chapters, setChapters] = useState<any[]>([]);
  const [kpis, setKpis] = useState<Record<string, any>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [capas, setCapas] = useState<any[]>([]);
  const [finding, setFinding] = useState('');
  const [mtp, setMtp] = useState<any[]>([]);
  const [mtpForm, setMtpForm] = useState({ patientName: '', gestationalAgeWeeks: '', indication: 'other' });

  const load = async () => {
    try {
      const [c, k, cp, m]: any[] = await Promise.all([
        api.nabhChapters(), api.kpiCompute(), api.capaList({}), api.mtpList(),
      ]);
      setChapters(c?.chapters || []);
      setKpis(k?.kpis || {});
      setCapas(cp?.capa || []);
      setMtp(m?.entries || []);
    } catch { toast.error('Failed to load quality board'); }
  };
  useEffect(() => { load(); }, []);

  const seed = async () => {
    try { await api.seedNabh(); toast.success('Chapters seeded'); load(); }
    catch { toast.error('Seed failed'); }
  };

  const assess = async (code: string) => {
    try {
      const r: any = await api.nabhAssess({ chapter: code, scores });
      toast.success(`Scored ${r?.scorePct}%`);
      setScores({});
      load();
    } catch (e: any) { toast.error(e?.message || 'Assess failed'); }
  };

  const addCapa = async () => {
    if (!finding.trim()) return;
    try { await api.capaCreate({ finding }); setFinding(''); toast.success('CAPA opened'); load(); }
    catch { toast.error('Create failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Award size={18} /> Quality board</h1>
      <div className="flex gap-1">
        {([['nabh', 'NABH', Award], ['capa', 'CAPA', Hammer], ['registers', 'Registers', FileText]] as const).map(([k, label, Icon]) => (
          <Button key={k} size="sm" variant={tab === k ? 'default' : 'outline'} onClick={() => setTab(k)}><Icon size={14} /> {label}</Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={seed}>Seed chapters</Button>
      </div>

      {tab === 'nabh' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {chapters.map((c) => (
            <Card key={c.code}>
              <CardHeader><CardTitle className="text-sm">{c.code} — {c.title}</CardTitle></CardHeader>
              <CardContent className="space-y-1.5">
                {(c.objectives || []).map((o: any) => (
                  <div key={o.code} className="flex items-center justify-between gap-2 rounded border px-2 py-1 text-xs">
                    <span><b className="font-mono">{o.code}</b> {o.label}</span>
                    <span className="flex items-center gap-1">
                      {o.autoKpi ? <span className="rounded bg-muted px-1.5 py-0.5 font-mono">auto: {kpis[o.autoKpi] ?? '—'}</span> : null}
                      <select aria-label={o.code} className="rounded border px-1 py-0.5 text-xs"
                        value={scores[o.code] || ''} onChange={(e) => setScores({ ...scores, [o.code]: e.target.value })}>
                        <option value="">—</option>
                        <option>compliant</option><option>partial</option><option>non_compliant</option><option>na</option>
                      </select>
                    </span>
                  </div>
                ))}
                <Button size="sm" onClick={() => assess(c.code)}>Save assessment</Button>
              </CardContent>
            </Card>
          ))}
          {chapters.length === 0 ? <EmptyState title="No chapters" hint="Seed the 8 NABH chapters first." /> : null}
        </div>
      ) : null}

      {tab === 'capa' ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">CAPA ({capas.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-1">
              <Input className="h-8 text-xs" placeholder="Finding…" value={finding} onChange={(e) => setFinding(e.target.value)} />
              <Button size="sm" onClick={addCapa}>Open</Button>
            </div>
            {capas.map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
                <span className="truncate"><b>{c.source}</b> · {c.finding}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <StatusPill status={c.status} />
                  {c.status !== 'Closed' ? (
                    <Button size="sm" variant="outline" onClick={async () => {
                      const eff = window.prompt('Effectiveness review (required to close):');
                      if (!eff) return;
                      await api.capaPatch(c._id, { status: 'Closed', effectiveness: eff });
                      load();
                    }}>Close</Button>
                  ) : null}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === 'registers' ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">MTP register ({mtp.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Input className="h-8 w-40 text-xs" placeholder="Patient name" value={mtpForm.patientName} onChange={(e) => setMtpForm({ ...mtpForm, patientName: e.target.value })} />
                <Input className="h-8 w-24 text-xs" placeholder="Weeks" value={mtpForm.gestationalAgeWeeks} onChange={(e) => setMtpForm({ ...mtpForm, gestationalAgeWeeks: e.target.value })} />
                <select aria-label="Indication" className="rounded-md border px-2 text-xs" value={mtpForm.indication} onChange={(e) => setMtpForm({ ...mtpForm, indication: e.target.value })}>
                  <option>A</option><option>B</option><option>C</option><option>failure-contraception</option><option>other</option>
                </select>
                <Button size="sm" onClick={async () => {
                  try {
                    await api.mtpCreate({ ...mtpForm, gestationalAgeWeeks: Number(mtpForm.gestationalAgeWeeks), consentTaken: true });
                    toast.success('Registered (consent recorded)');
                    setMtpForm({ patientName: '', gestationalAgeWeeks: '', indication: 'other' });
                    load();
                  } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
                }}>Register + consent</Button>
              </div>
              {mtp.slice(0, 20).map((m: any) => (
                <p key={m._id} className="rounded border px-2 py-1 text-xs">{m.patientName} · {m.gestationalAgeWeeks}w · {m.indication}</p>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">PCPNDT Form F</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Filed from the radiology desk via <span className="font-mono">POST /api/quality/pcpndt</span> (patient + declaration). Entries are tenant-scoped and audited.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
