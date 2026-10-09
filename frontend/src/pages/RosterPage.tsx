import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.8 — duty roster: month grid is kept deliberately simple
 * (entries list + publish). Published rosters are read-only snapshots.
 */
export default function RosterPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<any[]>([]);
  const [entry, setEntry] = useState({ staffId: '', date: '', shift: 'Morning' });

  const load = async () => {
    try {
      const r: any = await (api as any).getRosters({ month });
      setRows(r?.rosters || []);
    } catch { toast.error('Failed to load roster'); }
  };
  useEffect(() => { load(); }, [month]);

  const save = async (publish: boolean) => {
    try {
      const existing = rows[0];
      const entries = [...(existing?.entries || [])];
      if (entry.staffId && entry.date) entries.push({ ...entry, onCall: false });
      const r: any = await (api as any).saveRoster({ month, entries });
      if (publish) await (api as any).publishRoster(r.id);
      toast.success(publish ? 'Roster published' : 'Draft saved');
      setEntry({ staffId: '', date: '', shift: 'Morning' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const current = rows[0];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">Duty Roster</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Month</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <span className="text-xs self-center text-muted-foreground">
            {current ? `${current.entries?.length || 0} entries · ${current.status}` : 'no roster yet'}
          </span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Add entry</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="Staff ID" value={entry.staffId} onChange={(e) => setEntry({ ...entry, staffId: e.target.value })} />
          <Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
          <select aria-label="Shift" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={entry.shift} onChange={(e) => setEntry({ ...entry, shift: e.target.value })}>
            {['Morning', 'Evening', 'Night', 'Off', 'OnCall'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save(false)}>Save draft</Button>
            <Button onClick={() => save(true)}>Publish</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Entries ({current?.entries?.length || 0})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-96 overflow-auto">
          {(current?.entries || []).slice(0, 100).map((e: any, i: number) => (
            <div key={i} className="flex gap-2 text-xs rounded-md border border-border/40 p-2">
              <span className="font-mono">{e.date}</span>
              <span className="font-bold">{e.shift}</span>
              <span className="text-muted-foreground truncate">{e.staffId}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
