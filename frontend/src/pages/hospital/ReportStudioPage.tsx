import { useEffect, useState } from 'react';
import { FileBarChart, Save, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/System';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/** File 17 §17.1: report studio — catalogue, whitelisted runs, views, schedules. */
export default function ReportStudioPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [key, setKey] = useState('unpaid-bills');
  const [out, setOut] = useState<any | null>(null);
  const [views, setViews] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sched, setSched] = useState({ cron: '0 8 * * *', recipients: '' });

  const load = async () => {
    try {
      const [c, v, s]: any[] = await Promise.all([api.studioCatalogue(), api.studioViews(), api.studioSchedules()]);
      setCatalogue(c?.reports || []);
      setViews(v?.views || []);
      setSchedules(s?.schedules || []);
      const first = (c?.reports || []).find((r: any) => r.allowed);
      if (first) setKey(first.key);
    } catch { toast.error('Failed to load studio'); }
  };
  useEffect(() => { load(); }, []);

  const run = async () => {
    try {
      const r: any = await api.runStudioReport(key, {});
      setOut(r);
    } catch (e: any) { toast.error(e?.message || 'Run failed'); }
  };

  // File 22 P2-36: async run with polling (queued → done/failed).
  const [asyncId, setAsyncId] = useState('');
  const [asyncState, setAsyncState] = useState('');
  const runAsync = async () => {
    try {
      const r: any = await api.runStudioAsync(key, {});
      setAsyncId(r?.id || '');
      setAsyncState('queued');
      toast.success('Queued — polling for completion');
      for (let i = 0; i < 20; i += 1) {
        await new Promise((t) => setTimeout(t, 1500));
        const s: any = await api.studioRunStatus(r.id);
        setAsyncState(s?.run?.status || '');
        if (['done', 'failed'].includes(s?.run?.status)) {
          if (s?.run?.status === 'done') {
            setOut({ rows: s.run.result?.rows || [], columns: s.run.result?.columns || [], scanned: s.run.rowCount, ms: s.run.ms });
            toast.success(`Done: ${s.run.rowCount} rows`);
          } else toast.error(s?.run?.error || 'Run failed');
          break;
        }
      }
    } catch (e: any) { toast.error(e?.message || 'Queue failed'); }
  };

  const saveView = async () => {
    const name = window.prompt('View name:');
    if (!name) return;
    try {
      await api.createStudioView({ reportKey: key, name, filters: {}, columns: out?.columns || [] });
      toast.success('View saved');
      load();
    } catch { toast.error('Save failed'); }
  };

  const schedule = async () => {
    try {
      await api.createStudioSchedule({ reportKey: key, cron: sched.cron, recipients: sched.recipients.split(',').map((s) => s.trim()).filter(Boolean) });
      toast.success('Scheduled');
      load();
    } catch (e: any) { toast.error(e?.message || 'Schedule failed (bad cron?)'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[300px_1fr]">
      <div className="space-y-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><FileBarChart size={14} /> Catalogue</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {catalogue.map((r) => (
              <button key={r.key} disabled={!r.allowed} onClick={() => { setKey(r.key); setOut(null); }}
                className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${key === r.key ? 'border-primary' : ''} ${r.allowed ? 'hover:bg-muted' : 'opacity-40'}`}>
                <span className="font-semibold">{r.name}</span> <span className="text-muted-foreground">· {r.category}</span>
              </button>
            ))}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-1 text-sm"><CalendarClock size={14} /> Schedules ({schedules.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {schedules.map((s) => <p key={s._id} className="rounded border px-2 py-1 font-mono text-[11px]">{s.reportKey} · {s.cron}</p>)}
            <div className="flex gap-1 border-t pt-2">
              <Input className="h-8 font-mono text-xs" value={sched.cron} onChange={(e) => setSched({ ...sched, cron: e.target.value })} />
              <Button size="sm" onClick={schedule}>Schedule</Button>
            </div>
          </CardContent></Card>
      </div>
      <Card>
        <CardHeader>        <CardTitle className="flex items-center gap-2 text-sm">{key}
          <Button size="sm" onClick={run}>Run</Button>
          <Button size="sm" variant="outline" onClick={runAsync}>Run async{asyncState ? ` (${asyncState})` : ''}</Button>
          <Button size="sm" variant="outline" onClick={saveView}><Save size={14} /> Save view</Button>
          <span className="text-xs font-normal text-muted-foreground">{out ? `${out.rows?.length} rows (scanned ${out.scanned}, ${out.ms}ms)` : ''}</span>
        </CardTitle></CardHeader>
        <CardContent>
          {out ? (
            <div className="max-h-[560px] overflow-auto rounded-md border">
              {/* Whitelisted report output: dynamic columns, capped at 200 rows. */}
              <DataGrid
                columns={(out.columns || []).map((c: string) => ({
                  key: c,
                  label: c,
                  sortable: false,
                  render: (v) => <span className="block max-w-48 truncate">{String(v ?? '')}</span>,
                }))}
                rows={(out.rows || []).slice(0, 200).map((r: any, i: number) => ({ ...r, __id: `r-${i}` }))}
                rowKey="__id"
                empty="No rows"
                showSearch={false}
                manualPagination
              />
            </div>
          ) : <p className="text-sm text-muted-foreground">Pick a report and Run. Views ({views.length}) reuse saved columns.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
