import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import PatientBanner from '@/components/clinical/PatientBanner';

/**
 * Doc 11 §4 — EMR workspace: patient banner (allergies red), timeline,
 * orders, prescriptions, charges, scribe draft. Sign/finalize stays in the
 * prescription flow (e-sign + QR there).
 */
type Tab = 'timeline' | 'orders' | 'prescriptions' | 'billing';

export default function EmrWorkspace() {
  const { encounterId } = useParams();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('timeline');
  const [draft, setDraft] = useState<any>(null);
  const [note, setNote] = useState({ diagnosis: '', diagnosisIcd: '', soap: '' });

  const load = async () => {
    try {
      const r: any = await (api as any).getWorkspace(encounterId);
      setData(r);
    } catch { toast.error('Failed to load workspace'); }
  };
  useEffect(() => { load(); }, [encounterId]);

  const scribe = async () => {
    try {
      const r: any = await (api as any).scribeDraft({ encounterId });
      setDraft(r?.draft || null);
      toast.success('Draft composed — review before signing');
    } catch { toast.error('Scribe failed'); }
  };

  if (!data) return <p className="text-sm text-muted-foreground p-4">Loading workspace…</p>;
  const p = data.patient || {};
  const allergies = (p.allergies || []).map((a: any) => a.allergen || a);

  return (
    <div className="space-y-4">
      {/* Patient banner */}
      <PatientBanner patientId={p._id || p.id || ''} />
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-lg font-bold">{p.name}</span>
          <span className="text-muted-foreground">{p.gender} · UHID {(data.encounter as any)?.uhid || '—'}</span>
          {p.bloodGroup && <span className="font-bold text-red-600">{p.bloodGroup}</span>}
          {allergies.length > 0 && (
            <span className="font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">⚠ Allergy: {allergies.join(', ')}</span>
          )}
          <span className="flex-1" />
          <Link to="/doctor/patients"><Button size="sm" variant="outline">All patients</Button></Link>
          <Button size="sm" variant="outline" onClick={scribe}>Dictate / Scribe draft</Button>
          {(data.encounter as any)?.status === 'Open' && (
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await (api as any).signWorkspace(encounterId);
                  toast.success('Visit signed & closed');
                  load();
                } catch { toast.error('Sign failed'); }
              }}
            >
              Sign & finalize
            </Button>
          )}
        </CardContent>
      </Card>

      {draft && (
        <Card className="border-dashed">
          <CardHeader><CardTitle className="text-base">SOAP draft (review required)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><b>S:</b> {draft.subjective}</p>
            <p><b>O:</b> {draft.objective}</p>
            <p><b>A:</b> {draft.assessment}</p>
            <p><b>P:</b> {draft.plan}</p>
            <p className="text-xs text-muted-foreground">{draft.disclaimer}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {(['timeline', 'orders', 'prescriptions', 'billing'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'timeline' && (
        <div className="space-y-2">
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder="Diagnosis" value={note.diagnosis} onChange={(e) => setNote({ ...note, diagnosis: e.target.value })} />
                <Input placeholder="ICD-10 (e.g. J06.9)" value={note.diagnosisIcd} onChange={(e) => setNote({ ...note, diagnosisIcd: e.target.value })} />
              </div>
              <Input placeholder="SOAP note" value={note.soap} onChange={(e) => setNote({ ...note, soap: e.target.value })} />
              <Button
                size="sm"
                disabled={!note.diagnosis && !note.soap}
                onClick={async () => {
                  try {
                    await (api as any).saveWorkspaceNote(encounterId, note);
                    toast.success('Note filed');
                    setNote({ diagnosis: '', diagnosisIcd: '', soap: '' });
                    load();
                  } catch { toast.error('Save failed'); }
                }}
              >
                File consult note
              </Button>
            </CardContent>
          </Card>
          {(data.timeline || []).map((r: any) => (
            <Card key={r._id}><CardContent className="p-3 text-sm">
              <p className="font-medium">{r.diagnosis || r.type}</p>
              <p className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : ''} · {r.doctor}</p>
            </CardContent></Card>
          ))}
          {!(data.timeline || []).length && <p className="text-sm text-muted-foreground">No prior records.</p>}
        </div>
      )}
      {tab === 'orders' && (
        <div className="space-y-2">
          {(data.orders || []).map((o: any) => (
            <Card key={o._id}><CardContent className="p-3 text-sm flex gap-2">
              <span className="font-bold capitalize">{o.kind}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{o.status}</span>
              <span className="text-muted-foreground">{o.priority}</span>
            </CardContent></Card>
          ))}
          {!(data.orders || []).length && <p className="text-sm text-muted-foreground">No orders in this encounter.</p>}
        </div>
      )}
      {tab === 'prescriptions' && (
        <div className="space-y-2">
          {(data.prescriptions || []).map((x: any) => (
            <Card key={x._id}><CardContent className="p-3 text-sm">
              <p className="font-medium">{(x.medicines || []).map((m: any) => m.medicineName).join(', ')}</p>
              <p className="text-xs text-muted-foreground">{x.diagnosis} {x.diagnosisIcd ? `(${x.diagnosisIcd})` : ''}</p>
            </CardContent></Card>
          ))}
          {!(data.prescriptions || []).length && <p className="text-sm text-muted-foreground">No prescriptions.</p>}
        </div>
      )}
      {tab === 'billing' && (
        <Card><CardContent className="p-3 text-sm space-y-1">
          {(data.charges || []).map((c: any) => (
            <p key={c._id} className="flex justify-between"><span>{c.description}</span><b>₹{c.amount}</b></p>
          ))}
          <p className="flex justify-between font-bold border-t pt-1">
            <span>Total</span><span>₹{(data.charges || []).reduce((s: number, c: any) => s + (c.amount || 0), 0)}</span>
          </p>
        </CardContent></Card>
      )}
    </div>
  );
}
