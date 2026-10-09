import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * Doc 12 §2/§3 — clinic-as-business overview: visits, collection,
 * outstanding, repeat/no-show %, today's roster, camps hosted.
 */
export default function ClinicOverview() {
  const [ov, setOv] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);
  const [recalls, setRecalls] = useState<any[]>([]);

  const loadRecalls = async () => {
    try {
      const d: any = await (api as any).getRecallDues();
      setRecalls(d?.dues || []);
    } catch { /* optional section */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const [o, r, c] = await Promise.all([
          (api as any).getClinicOverview({}),
          (api as any).getClinicRosterToday().catch(() => null),
          (api as any).getClinicCamps().catch(() => null),
        ]);
        setOv(o);
        if (r) setRoster(r?.roster || []);
        if (c) setCamps(c?.camps || []);
        loadRecalls();
      } catch { toast.error('Failed to load clinic overview'); }
    })();
  }, []);

  const sendAll = async () => {
    try {
      const ids = recalls.map((d: any) => String(d.patientId)).filter(Boolean);
      if (!ids.length) return;
      const r: any = await (api as any).sendRecalls({ patientIds: ids });
      toast.success(`Sent ${r.sent}, opt-out skipped ${r.skippedOptOut}, dupes ${r.skippedDup}`);
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  if (!ov) return <p className="text-sm text-muted-foreground p-4">Loading overview…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Clinic Overview</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Visits', ov.visits], ['Completed', ov.completed],
          [`No-show ${ov.noShowPct}%`, ov.noShow],
          [`Repeat ${ov.repeatPct}%`, `₹${Number(ov.collected || 0).toLocaleString('en-IN')}`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Money</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="flex justify-between"><span>Billed</span><b>₹{Number(ov.billed || 0).toLocaleString('en-IN')}</b></p>
            <p className="flex justify-between"><span>Outstanding</span><b>₹{Number(ov.outstanding || 0).toLocaleString('en-IN')}</b></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Today's roster</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {roster.map((d: any, i: number) => (
              <p key={i} className="flex justify-between"><span>{d.name} · {d.specialization}</span><span>waiting: <b>{d.waiting}</b></span></p>
            ))}
            {roster.length === 0 && <p className="text-muted-foreground">No doctors on roster.</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            Recalls due ({recalls.length})
            <span className="flex-1" />
            {recalls.length > 0 && <Button size="sm" onClick={sendAll}>Message all (deduped)</Button>}
          </CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm max-h-48 overflow-auto">
            {recalls.slice(0, 20).map((d: any, i: number) => (
              <p key={i} className="flex justify-between"><span>{d.name} · {d.kind}</span><span className="text-muted-foreground">{d.dueAt ? new Date(d.dueAt).toLocaleDateString('en-IN') : ''}</span></p>
            ))}
            {recalls.length === 0 && <p className="text-muted-foreground">No recalls due.</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Camps hosted ({camps.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {camps.slice(0, 10).map((c: any) => (
              <p key={c._id} className="flex justify-between"><span>{c.title}</span><span className="text-muted-foreground">{c.status} · regs {c.registrations || 0}</span></p>
            ))}
            {camps.length === 0 && <p className="text-muted-foreground">No camps yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
