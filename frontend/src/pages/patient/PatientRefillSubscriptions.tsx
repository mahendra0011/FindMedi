import { useEffect, useState } from 'react';
import { Pill, Pause, Play, XCircle, RotateCcw, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

const STATUS: Unmodelled = {
  active: { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  paused: { label: 'Paused', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const blank = {
  medicineName: '', dosage: '', frequency: '', quantityPerRefill: '1',
  intervalDays: '30', reminderDaysBefore: '2', deliveryAddress: '', prescriptionId: '', autoOrder: false, notes: '',
};

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function PatientRefillSubscriptions() {
  const [subs, setSubs] = useState<ApiRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [res, rx] = await Promise.all([
        api.getRefillSubscriptions({}),
        api.getPharmacyPrescriptions({}).catch(() => ({ prescriptions: [] })),
      ]);
      setSubs(res.subscriptions || []);
      setPrescriptions(rx.prescriptions || []);
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to load refills'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const rxById = (id: string) => prescriptions.find((r) => String(r._id) === String(id || ''));

  const create = async () => {
    setBusy('create'); setError('');
    try {
      const body: Unmodelled = {
        medicineName: form.medicineName.trim(),
        dosage: form.dosage.trim(), frequency: form.frequency.trim(),
        quantityPerRefill: Number(form.quantityPerRefill) || 1,
        intervalDays: Number(form.intervalDays) || 30,
        reminderDaysBefore: Number(form.reminderDaysBefore) || 0,
        deliveryAddress: form.deliveryAddress.trim(), autoOrder: form.autoOrder, notes: form.notes.trim(),
      };
      if (form.prescriptionId.trim()) body.prescriptionId = form.prescriptionId.trim();
      await api.createRefillSubscription(body);
      setForm(blank);
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to create refill plan'));
    } finally {
      setBusy('');
    }
  };

  const act = async (id: string, fn: (id: string) => Promise<never>, label: string) => {
    setBusy(label + id); setError('');
    try {
      await fn(id);
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, `Failed: ${label}`));
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Medicine Refills</h1>
        <p className="text-muted-foreground text-sm">Auto-reorder plans with reminders — paused/cancelled any time.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="bg-card rounded-2xl border border-border/60 p-5 space-y-3">
        <h2 className="font-semibold">New refill plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Medicine name *" value={form.medicineName} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} />
          <Input placeholder="Dosage (e.g. 500mg)" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
          <Input placeholder="Frequency (e.g. 1-0-1)" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          <Input type="number" placeholder="Qty per refill" value={form.quantityPerRefill} onChange={(e) => setForm({ ...form, quantityPerRefill: e.target.value })} />
          <Input type="number" placeholder="Every (days)" value={form.intervalDays} onChange={(e) => setForm({ ...form, intervalDays: e.target.value })} />
          <Input type="number" placeholder="Remind (days before)" value={form.reminderDaysBefore} onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })} />
        </div>
        <Input placeholder="Delivery address" value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
        <select
          className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
          value={form.prescriptionId}
          onChange={(e) => setForm({ ...form, prescriptionId: e.target.value })}
        >
          <option value="">No prescription linked</option>
          {prescriptions.map((r: ApiRow) => (
            <option key={String(r._id)} value={String(r._id)}>
              {r.doctorName || 'Prescription'} — {r.prescriptionId || String(r._id)} ({r.status || ''})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.autoOrder} onChange={(e) => setForm({ ...form, autoOrder: e.target.checked })} />
          Auto-order when due
        </label>
        <Button disabled={!form.medicineName.trim() || busy === 'create'} onClick={create}>
          {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create plan
        </Button>
      </section>

      <section className="space-y-3">
        {subs.length === 0 && <p className="text-sm text-muted-foreground">No refill plans yet.</p>}
        {subs.map((s: ApiRow) => {
          const rx = s.prescriptionId ? rxById(String(s.prescriptionId)) : null;
          const cfg = STATUS[String(s.status)] || STATUS.active;
          return (
            <article key={String(s._id)} className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{s.medicineName}</h3>
                    <Badge className={cfg.cls}>{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.dosage || ''} · {s.frequency || ''} · qty {s.quantityPerRefill} · every {s.intervalDays}d
                    {s.nextRefillAt ? ` · next ${new Date(s.nextRefillAt).toLocaleDateString()}` : ''}
                    {s.autoOrder ? ' · auto-order on' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rx
                      ? `Rx: ${rx.status || ''}${rx.verificationStatus ? ` · ${rx.verificationStatus}` : ''}${rx.revokedAt ? ' · revoked' : ''}`
                      : s.prescriptionId ? 'Rx linked — validity unknown' : 'No Rx linked — doctor verification still required at dispense'}
                  </p>
                  {s.lastReminderAt && <p className="text-xs text-muted-foreground">Last reminder {new Date(s.lastReminderAt).toLocaleDateString()} · refills {s.refillCount || 0}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {s.status === 'active' && (
                    <>
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(String(s._id), (id) => api.pauseRefillSubscription(id) as never, 'pause')}>
                        <Pause className="w-3.5 h-3.5" /> Pause
                      </Button>
                      <Button size="sm" disabled={!!busy} onClick={() => act(String(s._id), (id) => api.refillNow(id, { early: true }) as never, 'refill')}>
                        <RotateCcw className="w-3.5 h-3.5" /> Refill now
                      </Button>
                    </>
                  )}
                  {s.status === 'paused' && (
                    <Button size="sm" disabled={!!busy} onClick={() => act(String(s._id), (id) => api.resumeRefillSubscription(id) as never, 'resume')}>
                      <Play className="w-3.5 h-3.5" /> Resume
                    </Button>
                  )}
                  {s.status !== 'cancelled' && (
                    <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => act(String(s._id), (id) => api.cancelRefillSubscription(id) as never, 'cancel')}>
                      <XCircle className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
              {s.history?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {s.history.slice(-4).map((h: Unmodelled) => `${String(h.action)} ${new Date(h.at).toLocaleDateString()}`).join(' → ')}
                </p>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
