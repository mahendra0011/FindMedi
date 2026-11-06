import { useEffect, useState } from 'react';
import { Pill, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ApiRow } from '@/lib/apiTypes';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function PharmacyRefillDesk() {
  const [due, setDue] = useState<ApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getDueRefills({ days: 3 });
      setDue(res.due || []);
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to load due refills'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const refill = async (id: string) => {
    setBusy(id); setError('');
    try {
      await api.refillNow(id, {});
      await load();
    } catch (e: unknown) {
      setError(errMsg(e, 'Failed to confirm refill'));
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
        <h1 className="font-heading text-2xl font-bold text-foreground">Refill Desk</h1>
        <p className="text-muted-foreground text-sm">Due auto-order refills (next 3 days). Confirm to queue the dispense.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        {due.length === 0 && <p className="text-sm text-muted-foreground">Nothing due.</p>}
        {due.map((s: ApiRow) => (
          <article key={String(s._id)} className="bg-card rounded-2xl border border-border/60 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">{s.medicineName}</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Due</Badge>
                  {s.autoOrder && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Auto-order</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {s.dosage || ''} · {s.frequency || ''} · qty {s.quantityPerRefill}
                  {s.nextRefillAt ? ` · due ${new Date(s.nextRefillAt).toLocaleDateString()}` : ''}
                </p>
                {s.deliveryAddress && <p className="text-xs text-muted-foreground">{s.deliveryAddress}</p>}
                <p className="text-xs text-muted-foreground">Patient {String(s.userId)} · refills {s.refillCount || 0}</p>
              </div>
              <Button size="sm" disabled={!!busy} onClick={() => refill(String(s._id))}>
                {busy === String(s._id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm & order
              </Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
