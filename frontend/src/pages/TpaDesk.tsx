import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 09 §9.6 — TPA desk: insurers, pre-auth lifecycle, claims settle,
 * pipeline funnel. Document checklist lives on the insurer master.
 */
export default function TpaDesk() {
  const [insurers, setInsurers] = useState<any[]>([]);
  const [preauths, setPreauths] = useState<any[]>([]);
  const [form, setForm] = useState({ admissionId: '', insurerId: '', estimate: '' });

  const load = async () => {
    try {
      const [i, p] = await Promise.all([(api as any).getInsurers(), (api as any).getPreAuths({})]);
      setInsurers(i?.insurers || []);
      setPreauths(p?.preauths || []);
    } catch { toast.error('Failed to load TPA desk'); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await (api as any).createPreAuth({ ...form, estimate: Number(form.estimate) || 0 });
      toast.success('Pre-auth drafted');
      setForm({ admissionId: '', insurerId: '', estimate: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  const move = async (id: string, status: string) => {
    try {
      await (api as any).setPreAuthStatus(id, { status });
      toast.success(`Pre-auth → ${status}`);
      load();
    } catch (err: any) { toast.error(err?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-heading font-bold">TPA Desk</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">New pre-auth ({insurers.length} insurers empanelled)</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-2">
          <Input placeholder="Admission ID" value={form.admissionId} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} />
          <select aria-label="Insurer" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.insurerId} onChange={(e) => setForm({ ...form, insurerId: e.target.value })}>
            <option value="">Select insurer</option>
            {insurers.map((i: any) => <option key={i._id} value={i._id}>{i.name} ({i.type})</option>)}
          </select>
          <Input placeholder="Estimate ₹" type="number" value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} />
          <Button onClick={create} disabled={!form.admissionId || !form.insurerId}>Create</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pre-auth queue ({preauths.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {preauths.map((p: any) => (
            <div key={p._id} className="flex flex-wrap items-center gap-2 text-sm rounded-lg border border-border/50 p-2.5">
              <span className="font-mono text-xs">{String(p._id).slice(-6)}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted">{p.status}</span>
              <span className="text-xs text-muted-foreground">est ₹{p.estimate} · approved ₹{p.approvedAmount || 0}</span>
              <span className="flex-1" />
              {['Submitted', 'Approved', 'Rejected'].map((s) => (
                <Button key={s} size="sm" variant="outline" onClick={() => move(p._id, s)}>{s}</Button>
              ))}
            </div>
          ))}
          {preauths.length === 0 && <p className="text-sm text-muted-foreground">Queue empty.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
