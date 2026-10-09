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
  const [swaps, setSwaps] = useState<any[]>([]);
  const [swap, setSwap] = useState({ fromStaffId: '', toStaffId: '', shiftDate: '', shift: 'Morning' });

  const load = async () => {
    try {
      const r: any = await (api as any).getRosters({ month });
      setRows(r?.rosters || []);
    } catch { toast.error('Failed to load roster'); }
    try {
      const s: any = await api.shiftSwaps({});
      setSwaps(s?.swaps || []);
    } catch { /* swaps optional */ }
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
      {/* File 22 P0-6: shift swaps (decider must differ from requester) */}
      <Card>
        <CardHeader><CardTitle className="text-base">Shift swaps ({swaps.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid sm:grid-cols-5 gap-2">
            <Input placeholder="From staff ID" value={swap.fromStaffId} onChange={(e) => setSwap({ ...swap, fromStaffId: e.target.value })} />
            <Input placeholder="To staff ID" value={swap.toStaffId} onChange={(e) => setSwap({ ...swap, toStaffId: e.target.value })} />
            <Input type="date" value={swap.shiftDate} onChange={(e) => setSwap({ ...swap, shiftDate: e.target.value })} />
            <select aria-label="Shift" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={swap.shift} onChange={(e) => setSwap({ ...swap, shift: e.target.value })}>
              {['Morning', 'Evening', 'Night', 'Rotating'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Button onClick={async () => {
              try { await api.createSwap(swap); toast.success('Swap requested'); setSwap({ fromStaffId: '', toStaffId: '', shiftDate: '', shift: 'Morning' }); load(); }
              catch (err: any) { toast.error(err?.response?.data?.message || 'Request failed'); }
            }}>Request</Button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {swaps.map((s: any) => (
              <div key={s._id} className="flex items-center justify-between gap-2 text-xs rounded-md border border-border/40 p-2">
                <span className="font-mono">{s.shiftDate}</span>
                <span>{String(s.fromStaffId).slice(-6)} → {String(s.toStaffId).slice(-6)} · {s.shift} · {s.status}</span>
                {s.status === 'Pending' ? (
                  <span className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={async () => {
                      try { await api.decideSwap(s._id, 'Approved'); toast.success('Approved'); load(); }
                      catch (err: any) { toast.error(err?.response?.data?.message || 'Approve failed'); }
                    }}>Approve</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try { await api.decideSwap(s._id, 'Rejected'); toast.success('Rejected'); load(); }
                      catch { toast.error('Reject failed'); }
                    }}>Reject</Button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
