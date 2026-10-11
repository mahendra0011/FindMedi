import { useEffect, useState } from 'react';
import { BedDouble } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BedTile } from '@/components/clinical/StatusAtoms';

/** File 13 §13.6 + File 19 §19.5: ward bed board (filter + occupancy). */
const STATUSES = ['Available', 'Occupied', 'Under Cleaning', 'Maintenance', 'Reserved', 'Blocked', 'Isolation'];

export default function BedBoard() {
  const [beds, setBeds] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const canEdit = ['superadmin', 'hospital_admin'].includes(user?.role || '');

  const load = async () => {
    try {
      const res: any = await api.get('/beds');
      const list = res?.beds || (Array.isArray(res) ? res : []);
      setBeds(list);
    } catch { toast.error('Failed to load beds'); }
  };
  useEffect(() => { load(); }, []);

  const saveStatus = async () => {
    if (!selected || !nextStatus || nextStatus === selected.status) return;
    setSaving(true);
    try {
      await api.updateBed(selected._id, { status: nextStatus });
      toast.success(`${selected.bedNumber} → ${nextStatus}`);
      setSelected(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally { setSaving(false); }
  };

  const filtered = beds.filter((b) =>
    (!status || b.status === status)
    && (!q || `${b.bedNumber} ${b.ward} ${b.currentPatientName || ''}`.toLowerCase().includes(q.toLowerCase())));

  const byWard: Record<string, any[]> = {};
  for (const b of filtered) {
    const w = b.ward || 'General';
    byWard[w] = byWard[w] || [];
    byWard[w].push(b);
  }
  const occ = beds.length ? Math.round((beds.filter((b) => b.status === 'Occupied').length / beds.length) * 100) : 0;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold"><BedDouble size={18} /> Bed board</h1>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{occ}% occupied · {beds.length} beds</span>
        <div className="flex-1" />
        <Input className="w-52" placeholder="Search bed / ward / patient…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {canEdit && selected && (
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{selected.bedNumber}</span>
            <span className="text-muted-foreground">({selected.status} →)</span>
            <select
              className="rounded-md border px-2 py-1.5 text-sm"
              value={nextStatus || selected.status}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <Button size="sm" onClick={saveStatus} disabled={saving || !nextStatus || nextStatus === selected.status}>
              {saving ? 'Saving…' : 'Set status'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelected(null); setNextStatus(''); }}>Cancel</Button>
            <span className="text-xs text-muted-foreground">Reserved = planned admission · Blocked = out of service · Isolation = precaution</span>
          </CardContent>
        </Card>
      )}
      {Object.entries(byWard).map(([ward, list]) => (
        <Card key={ward}>
          <CardHeader><CardTitle className="text-sm">{ward} ({list.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {list.map((b) => (
              <BedTile
                key={b._id || b.bedNumber}
                bed={b}
                selected={selected?._id === b._id}
                onClick={canEdit ? () => { setSelected(selected?._id === b._id ? null : b); setNextStatus(''); } : undefined}
              />
            ))}
          </CardContent>
        </Card>
      ))}
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No beds match.</p> : null}
    </div>
  );
}
