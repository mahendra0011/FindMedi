import { useEffect, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-39: multi-branch clinic management. */
export default function ClinicBranches() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', address: '', city: '', phone: '' });

  const load = async () => {
    try {
      const r: any = await api.get('/clinic-branches');
      setRows(r.branches || []);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clinic-branches', form);
      toast.success('Branch added');
      setForm({ name: '', address: '', city: '', phone: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Building2 size={18} /> Clinic branches</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Add branch</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input placeholder="Branch name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Branches ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {rows.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded border p-2 text-xs">
              <span><b>{r.name}</b> · {r.city || '—'} · {r.phone || '—'}</span>
              <StatusPill status={r.active ? 'active' : 'inactive'} />
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No branches" hint="Add your first clinic branch." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
