import { useEffect, useState } from 'react';
import { FlaskConical, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/**
 * File 13 §13.5: rule list + condition builder (DNF) + test-fire/backtest.
 * Actions: alert | task | webhook-log.
 */
const OPS = ['=', '!=', '>', '>=', '<', '<=', 'between', 'in', 'contains', 'is_set', 'is_empty'];

export default function RulesStudio() {
  const [rules, setRules] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ key: '', name: '', dataset: 'bills_unpaid', field: 'balance', op: '>', value: '0', action: 'alert' });
  const [testOut, setTestOut] = useState<any | null>(null);

  const load = async () => {
    try {
      const r: any = await api.listRules();
      setRules(r?.rules || []);
      const d: any = await api.ruleDatasets();
      setDatasets(d?.datasets || {});
    } catch { toast.error('Failed to load rules'); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const num = Number(form.value);
      await api.createRule({
        key: form.key, name: form.name || form.key, dataset: form.dataset,
        groups: [[{ field: form.field, op: form.op, value: Number.isNaN(num) ? form.value : num }]],
        actions: { type: form.action, severity: 'warning', roleQueue: 'receptionist', priority: 'P1' },
      });
      toast.success('Rule created');
      setForm({ ...form, key: '', name: '' });
      load();
    } catch (err: any) { toast.error(err?.message || 'Create failed'); }
  };

  const test = async (id: string) => {
    try {
      const r: any = await api.testRule(id);
      setTestOut(r);
    } catch (e: any) { toast.error(e?.message || 'Test failed'); }
  };

  const toggle = async (r: any) => {
    try {
      await api.patchRule(r._id, { enabled: !r.enabled });
      load();
    } catch { toast.error('Toggle failed'); }
  };

  const seed = async () => {
    try {
      const r: any = await api.seedClinicalRules();
      toast.success(`Seeded: ${(r?.created || []).join(', ') || 'already present'}`);
      load();
    } catch (e: any) { toast.error(e?.message || 'Seed failed'); }
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader><CardTitle className="text-sm">Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" variant="outline" onClick={seed}>Seed clinical rules (lab-critical + triggers)</Button>
          {rules.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
              <div>
                <p className="font-semibold">{r.name} <span className="font-mono text-xs text-muted-foreground">{r.key}</span></p>
                <p className="text-xs text-muted-foreground">{r.dataset} · cooldown {r.cooldownMinutes}m · <StatusPill status={r.enabled ? 'active' : 'disabled'} /></p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => test(r._id)}><FlaskConical size={14} /> Test</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(r)}>{r.enabled ? 'Disable' : 'Enable'}</Button>
              </div>
            </div>
          ))}
          {rules.length === 0 ? <EmptyState title="No rules" hint="Create your first rule — e.g. unpaid bills over ₹10,000 raise an alert." /> : null}
          {testOut ? (
            <div className="rounded-md border bg-muted/40 p-2 text-xs">
              Scanned {testOut.scanned}, matched {testOut.matched}.
              <pre className="mt-1 max-h-40 overflow-auto">{JSON.stringify(testOut.sample, null, 1)}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-1 text-sm"><Play size={14} /> New rule</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-2">
            <Input placeholder="key (e.g. ar-over-10k)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} required />
            <Input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="w-full rounded-md border px-2 py-2 text-sm" value={form.dataset} onChange={(e) => setForm({ ...form, dataset: e.target.value, field: datasets[e.target.value]?.fields?.[0] || '' })}>
              {Object.entries(datasets).map(([k, v]: any) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex gap-1">
              <Input placeholder="field" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
              <select className="rounded-md border px-2 text-sm" value={form.op} onChange={(e) => setForm({ ...form, op: e.target.value })}>
                {OPS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <Input placeholder="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <select className="w-full rounded-md border px-2 py-2 text-sm" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
              <option value="alert">alert</option>
              <option value="task">task</option>
              <option value="webhook-log">webhook-log</option>
            </select>
            <Button size="sm" type="submit">Create rule</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
