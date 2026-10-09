import { useEffect, useState } from 'react';
import { MapPin, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/** File 13 §13.6: locations tree, ward types, reason codes, patient flags. */
export default function OpsMasters() {
  const [locations, setLocations] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [locForm, setLocForm] = useState({ kind: 'room', name: '', code: '', parentId: '' });
  const [flagForm, setFlagForm] = useState({ patient: '', kind: 'allergy', note: '' });

  const load = async () => {
    try {
      const [l, w, c]: any[] = await Promise.all([api.listLocations(), api.listWardTypes(), api.listReasonCodes('')]);
      setLocations(l?.locations || []);
      setWards(w?.wardTypes || []);
      setCodes(c?.reasonCodes || []);
    } catch { toast.error('Failed to load masters'); }
  };
  useEffect(() => { load(); }, []);

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLocation({ ...locForm, parentId: locForm.parentId || null });
      setLocForm({ kind: 'room', name: '', code: '', parentId: '' });
      toast.success('Location added');
      load();
    } catch { toast.error('Save failed'); }
  };

  const addFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPatientFlag({ ...flagForm });
      setFlagForm({ patient: '', kind: 'allergy', note: '' });
      toast.success('Flag set — banner appears on clinical surfaces');
    } catch (err: any) { toast.error(err?.message || 'Save failed'); }
  };

  const depth = (l: any): number => {
    const order: Record<string, number> = { campus: 0, block: 1, floor: 2, wing: 3, room: 4 };
    return order[l.kind] ?? 4;
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1 text-sm"><MapPin size={14} /> Locations ({locations.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {[...locations].sort((a, b) => depth(a) - depth(b)).map((l) => (
            <p key={l._id} className="rounded border px-2 py-1 text-xs" style={{ marginLeft: depth(l) * 14 }}>
              <span className="font-mono text-muted-foreground">[{l.kind}]</span> {l.name} {l.code ? `(${l.code})` : ''}
            </p>
          ))}
          <form onSubmit={addLocation} className="flex flex-wrap gap-1 border-t pt-2">
            <select className="rounded-md border px-2 py-1.5 text-xs" value={locForm.kind} onChange={(e) => setLocForm({ ...locForm, kind: e.target.value })}>
              <option>campus</option><option>block</option><option>floor</option><option>wing</option><option>room</option>
            </select>
            <Input className="h-8 w-36 text-xs" placeholder="name" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} required />
            <Input className="h-8 w-24 text-xs" placeholder="code" value={locForm.code} onChange={(e) => setLocForm({ ...locForm, code: e.target.value })} />
            <Button size="sm" type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Ward types ({wards.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {wards.map((w) => <span key={w._id} className="rounded border px-2 py-1 text-xs">{w.name} · ₹{w.defaultRate}</span>)}
            {wards.length === 0 ? <p className="text-xs text-muted-foreground">None yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Reason codes ({codes.length})</CardTitle></CardHeader>
          <CardContent className="flex max-h-40 flex-wrap gap-1 overflow-auto">
            {codes.map((c) => <span key={c._id} className="rounded border px-2 py-1 font-mono text-[11px]">{c.module}:{c.code}</span>)}
            {codes.length === 0 ? <p className="text-xs text-muted-foreground">None yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Flag size={14} /> Set patient flag</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addFlag} className="flex flex-wrap gap-1">
              <Input className="h-8 w-44 text-xs" placeholder="patient id" value={flagForm.patient} onChange={(e) => setFlagForm({ ...flagForm, patient: e.target.value })} required />
              <select className="rounded-md border px-2 py-1.5 text-xs" value={flagForm.kind} onChange={(e) => setFlagForm({ ...flagForm, kind: e.target.value })}>
                <option>allergy</option><option>vip</option><option>fall-risk</option><option>isolation</option>
                <option>difficult-vein</option><option>blacklisted</option><option>deceased</option><option>mlc</option><option>other</option>
              </select>
              <Input className="h-8 w-40 text-xs" placeholder="note" value={flagForm.note} onChange={(e) => setFlagForm({ ...flagForm, note: e.target.value })} />
              <Button size="sm" type="submit">Set</Button>
            </form>
            <p className="mt-1 text-[11px] text-red-700">blacklisted / deceased block billing + booking server-side.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
