import { useEffect, useState } from 'react';
import { ShieldAlert, FileWarning, Siren, Pill, Trash2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/**
 * File 22 P0-5: safety & compliance desk — visitor passes, MLC cases,
 * incidents (+RCA), ADR reports, BMW logs, credentials (+expiry watch).
 */
const TABS = [
  { key: 'visitor-passes', label: 'Visitors', icon: BadgeCheck, coll: 'visitorpasses' },
  { key: 'mlc', label: 'MLC', icon: FileWarning, coll: 'mlccases' },
  { key: 'incidents', label: 'Incidents', icon: Siren, coll: 'incidents' },
  { key: 'adr', label: 'ADR', icon: Pill, coll: 'adrreports' },
  { key: 'bmw', label: 'BMW', icon: Trash2, coll: 'bmwlogs' },
  { key: 'credentials', label: 'Credentials', icon: ShieldAlert, coll: 'credentials' },
] as const;

export default function SafetyDesk() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('incidents');
  const [rows, setRows] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [form, setForm] = useState('');

  const coll = TABS.find((t) => t.key === tab)!.coll;

  const load = async () => {
    try {
      const r: any = await (api as any).get('/safety/' + tab);
      setRows(r?.[coll] || []);
      if (tab === 'credentials') {
        const e: any = await (api as any).get('/safety/credentials/expiring?days=60');
        setExpiring(e?.expiring || []);
      }
    } catch { toast.error('Failed to load ' + tab); }
  };
  useEffect(() => { load(); setForm(''); }, [tab]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    let body: any = {};
    try { body = JSON.parse(form || '{}'); }
    catch { toast.error('Body must be JSON'); return; }
    try {
      await (api as any).post('/safety/' + tab, body);
      toast.success('Recorded');
      setForm('');
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || err?.message || 'Save failed'); }
  };

  const close = async (id: string) => {
    try {
      await (api as any).patch('/safety/' + tab + '/' + id, { status: 'Closed', closedAt: new Date().toISOString() });
      toast.success('Closed');
      load();
    } catch { toast.error('Close failed'); }
  };

  const titleOf = (r: any) => r.visitorName || r.mlcNo || `${r.type || ''} · ${r.severity || ''}`.trim() || r.drug || r.date || `${r.type || ''} ${r.number || ''}`.trim() || r._id;

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><ShieldAlert size={18} /> Safety & compliance desk</h1>
      <div className="flex flex-wrap gap-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Button key={key} size="sm" variant={tab === key ? 'default' : 'outline'} onClick={() => setTab(key)}>
            <Icon size={14} /> {label}
          </Button>
        ))}
      </div>
      {tab === 'credentials' && expiring.length > 0 ? (
        <Card className="border-amber-300">
          <CardHeader><CardTitle className="text-sm text-amber-800">Expiring within 60 days ({expiring.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {expiring.map((c) => (
              <span key={c._id} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs">
                {c.type} · {c.number} · till {String(c.validTill).slice(0, 10)}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader><CardTitle className="text-sm">{tab} ({rows.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[520px] space-y-1.5 overflow-auto">
            {rows.map((r) => (
              <div key={r._id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
                <span className="truncate"><b>{titleOf(r)}</b> <span className="text-muted-foreground">{r.description || r.history || r.reaction || r.manifestNo || ''}</span></span>
                <span className="flex shrink-0 items-center gap-1">
                  {r.status ? <StatusPill status={r.status} /> : null}
                  {r.status && r.status !== 'Closed' ? <Button size="sm" variant="outline" onClick={() => close(r._id)}>Close</Button> : null}
                </span>
              </div>
            ))}
            {rows.length === 0 ? <EmptyState title="No records" hint="File the first record with the JSON form on the right." /> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">New {tab} (JSON)</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-2">
              <textarea
                className="h-44 w-full rounded-md border p-2 font-mono text-xs"
                placeholder='{"visitorName":"…","phone":"…"}'
                value={form}
                onChange={(e) => setForm(e.target.value)}
              />
              <Button size="sm" type="submit">Save record</Button>
              <p className="text-[11px] text-muted-foreground">
                Keys: visitors — visitorName/phone/relation/admissionId · MLC — mlcNo/patientId/injuryType/history ·
                incidents — type/severity/location/description · ADR — patientId/drug/reaction/severity ·
                BMW — date/wardId/yellowKg/redKg/whiteKg/blueKg/manifestNo · credentials — staffId/type/number/validTill.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
