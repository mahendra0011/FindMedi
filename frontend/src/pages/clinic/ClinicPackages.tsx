import { useEffect, useState } from 'react';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-39: clinic treatment packages. */
export default function ClinicPackages() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', category: '', price: '', mrp: '', description: '', validDays: '30', includedServices: '' });

  const load = async () => {
    try {
      const r: any = await api.get('/clinic-packages');
      setRows(r.packages || []);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clinic-packages', {
        ...form,
        price: Number(form.price) || 0,
        mrp: Number(form.mrp) || 0,
        validDays: Number(form.validDays) || 30,
        includedServices: form.includedServices.split(',').map((s: string) => s.trim()).filter(Boolean),
      });
      toast.success('Package added');
      setForm({ name: '', category: '', price: '', mrp: '', description: '', validDays: '30', includedServices: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/clinic-packages/${id}`); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Package size={18} /> Clinic packages</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Create package</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input placeholder="Package name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input type="number" placeholder="MRP" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            <Input placeholder="Valid days" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: e.target.value })} />
            <Input placeholder="Services (comma-sep)" value={form.includedServices} onChange={(e) => setForm({ ...form, includedServices: e.target.value })} />
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Packages ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {rows.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded border p-2 text-xs">
              <span><b>{r.name}</b> · {r.category || '—'} · ₹{r.price} {r.mrp ? `(MRP ₹${r.mrp})` : ''} · {r.validDays}d</span>
              <span className="flex gap-1">
                <StatusPill status={r.active ? 'active' : 'inactive'} />
                <Button size="sm" variant="ghost" onClick={() => remove(r._id)}><Trash2 size={12} /></Button>
              </span>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No packages" hint="Create your first treatment package." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
