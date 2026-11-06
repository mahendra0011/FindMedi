import { useEffect, useState } from 'react';
import { Snowflake, PackageCheck, Truck, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiRow, Unmodelled } from '@/lib/apiTypes';

const STATUSES = ['Pending Assignment', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Failed', 'Cancelled'];
const NEXT: Unmodelled = {
  Assigned: ['Picked Up', 'Cancelled'],
  'Picked Up': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Failed'],
};

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function SampleCourierDesk() {
  const [tasks, setTasks] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ pickupAddress: '', dropAddress: '', patientName: '', patientPhone: '', notes: '', coldChain: false });
  const [assign, setAssign] = useState<Unmodelled>({});
  const [otp, setOtp] = useState<Unmodelled>({});
  const [proof, setProof] = useState<Unmodelled>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getSampleCourierTasks({});
      setTasks(res.tasks || []);
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to load courier tasks'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy('create'); setError('');
    try {
      const res = await api.createSampleCourierTask({ ...form, coldChain: form.coldChain });
      const handed = res?.handoverOtp ? ` · OTP ${res.handoverOtp}` : '';
      setForm({ pickupAddress: '', dropAddress: '', patientName: '', patientPhone: '', notes: '', coldChain: false });
      await load();
      setError(handed ? `Created${handed}` : '');
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to create courier task'));
    } finally {
      setBusy('');
    }
  };

  const doAssign = async (id: string) => {
    const partnerId = String(assign[id] || '').trim();
    if (!partnerId) return setError('Enter delivery partner id to assign');
    setBusy('assign' + id); setError('');
    try {
      await api.assignSampleCourierTask(id, { deliveryPartnerId: partnerId });
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to assign'));
    } finally {
      setBusy('');
    }
  };

  const doStatus = async (id: string, status: string) => {
    setBusy('status' + id + status); setError('');
    try {
      const body: Unmodelled = { status };
      if (otp[id]) body.otp = String(otp[id]);
      if (proof[id]) body.proofPhoto = String(proof[id]);
      await api.updateSampleCourierStatus(id, body);
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to update status'));
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Sample Courier</h1>
        <p className="text-muted-foreground text-sm">Lab sample pickup → handover with OTP + proof. Staff create/assign; riders update status.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="bg-card rounded-2xl border border-border/60 p-5 space-y-3">
        <h2 className="font-semibold">New courier task</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Pickup address (lab) *" value={form.pickupAddress} onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
          <Input placeholder="Drop address (patient/home) *" value={form.dropAddress} onChange={(e) => setForm({ ...form, dropAddress: e.target.value })} />
          <Input placeholder="Patient name" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} />
          <Input placeholder="Patient phone" value={form.patientPhone} onChange={(e) => setForm({ ...form, patientPhone: e.target.value })} />
        </div>
        <Input placeholder="Notes (sample type, kit id)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.coldChain} onChange={(e) => setForm({ ...form, coldChain: e.target.checked })} />
          <Snowflake className="w-4 h-4 text-sky-600" /> Cold-chain transport required
        </label>
        <Button disabled={!form.pickupAddress.trim() || !form.dropAddress.trim() || busy === 'create'} onClick={create}>
          {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create task
        </Button>
      </section>

      <section className="space-y-3">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No courier tasks.</p>}
        {tasks.map((t: ApiRow) => {
          const id = String(t._id);
          const nexts: string[] = NEXT[String(t.status)] || [];
          return (
            <article key={id} className="bg-card rounded-2xl border border-border/60 p-5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{t.orderId || id}</h3>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{String(t.status)}</Badge>
                    {t.coldChain && <Badge className="bg-sky-500/10 text-sky-700 border-sky-500/20"><Snowflake className="w-3 h-3 mr-1" /> Cold-chain</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.pickupAddress} → {t.dropAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.patientName || ''}{t.patientPhone ? ` · ${t.patientPhone}` : ''}{t.deliveryPartnerId ? ` · partner ${String(t.deliveryPartnerId).slice(-6)}` : ''}
                    {t.labBookingId ? ` · booking ${String(t.labBookingId).slice(-6)}` : ''}
                  </p>
                </div>
              </div>

              {String(t.status) === 'Pending Assignment' && (
                <div className="flex flex-wrap gap-2">
                  <Input className="max-w-xs" placeholder="Delivery partner id" value={assign[id] || ''} onChange={(e) => setAssign({ ...assign, [id]: e.target.value })} />
                  <Button size="sm" disabled={!!busy} onClick={() => doAssign(id)}>Assign</Button>
                </div>
              )}

              {nexts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="max-w-32" placeholder="OTP" value={otp[id] || ''} onChange={(e) => setOtp({ ...otp, [id]: e.target.value })} />
                  <Input className="max-w-64" placeholder="Proof photo URL" value={proof[id] || ''} onChange={(e) => setProof({ ...proof, [id]: e.target.value })} />
                  {nexts.map((s) => (
                    <Button key={s} size="sm" variant={s === 'Cancelled' || s === 'Failed' ? 'destructive' : 'default'} disabled={!!busy} onClick={() => doStatus(id, s)}>
                      {busy === 'status' + id + s ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />} {s}
                    </Button>
                  ))}
                </div>
              )}

              {t.deliveryProofPhoto && <p className="text-xs text-muted-foreground">Proof: {String(t.deliveryProofPhoto).slice(0, 80)}</p>}
              {t.notes && <p className="text-xs text-muted-foreground">{String(t.notes)}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
