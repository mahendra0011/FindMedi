import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 11 §5 P0 — my OPD queue: waiting tokens for me, call-next, skip,
 * no-show. Fixes D10.
 */
export default function DoctorQueue() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [duty, setDuty] = useState('On duty');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<any[]>([]);
  const [oncall, setOncall] = useState<any[]>([]);
  const [cme, setCme] = useState<any>(null);

  const load = async () => {
    try {
      const r: any = await (api as any).getDoctorDashboard();
      setTokens(r?.data?.queue || []);
      setCme(r?.data?.cme || null);
      const o: any = await (api as any).getOnCall().catch(() => null);
      if (o) setOncall(o?.entries || []);
    } catch { toast.error('Failed to load queue'); }
  };
  useEffect(() => { load(); }, []);

  const setDutyStatus = async (status: string) => {
    try {
      await (api as any).setDutyStatus({ status });
      setDuty(status);
      toast.success(`Duty: ${status}`);
    } catch { toast.error('Failed to update duty'); }
  };

  const searchPatient = async () => {
    if (!q.trim()) return;
    try {
      const r: any = await (api as any).getPatients({ search: q, limit: 5 });
      const list = r?.data || r?.patients || [];
      const withEnc = await Promise.all(list.map(async (p: any) => {
        try {
          const e: any = await (api as any).getLatestEncounter(p._id || p.id);
          return { ...p, encounterId: e?.id || null };
        } catch { return { ...p, encounterId: null }; }
      }));
      setFound(withEnc);
    } catch { setFound([]); }
  };

  const act = async (fn: () => Promise<any>, label: string) => {
    try { await fn(); toast.success(label); load(); }
    catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-heading font-bold mr-auto">My OPD Queue ({tokens.length})</h1>
        {['On duty', 'On call', 'Off'].map((s) => (
          <Button key={s} size="sm" variant={duty === s ? 'default' : 'outline'} onClick={() => setDutyStatus(s)}>{s}</Button>
        ))}
        <Button onClick={() => act(() => (api as any).callNextToken({}), 'Next token called')}>Call next</Button>
      </div>
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Search patient (UHID / name / phone)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPatient()} />
            <Button variant="outline" onClick={searchPatient}>Search</Button>
          </div>
          {found.map((p: any) => (
            <div key={p._id || p.id} className="flex items-center gap-2 text-sm">
              <span className="font-medium">{p.name}</span>
              {p.encounterId && <Link to={`/doctor/workspace/${p.encounterId}`}><Button size="sm" variant="outline">Open workspace</Button></Link>}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="space-y-2">
        {tokens.map((t: any) => (
          <Card key={t._id || t.tokenNumber}>
            <CardContent className="p-3 flex items-center gap-2 text-sm">
              <span className="text-lg font-black">{t.tokenNumber}</span>
              <span className="text-muted-foreground">#{t.queuePosition}</span>
              <span className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => act(() => (api as any).callToken(t._id), 'Called')}>Call</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => (api as any).skipToken(t._id), 'Skipped')}>Skip</Button>
              <Button size="sm" variant="outline" onClick={() => act(() => (api as any).noShowToken(t._id), 'Marked no-show')}>No-show</Button>
            </CardContent>
          </Card>
        ))}
        {tokens.length === 0 && <p className="text-sm text-muted-foreground">Queue empty.</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div>
              <p className="text-xs text-muted-foreground">CME credits</p>
              <p className="text-lg font-bold">{cme ? `${cme.credits} (${cme.entries})` : '—'}</p>
            </div>
            <span className="flex-1" />
            <Link to="/doctor/earnings/statement"><Button size="sm" variant="outline">Earnings statement</Button></Link>
          </CardContent>
        </Card>
        {oncall.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">On-call (this month)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {oncall.map((e: any, i: number) => (
              <p key={i}>{e.date} · {e.shift} {e.onCall ? '(on-call)' : ''}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
