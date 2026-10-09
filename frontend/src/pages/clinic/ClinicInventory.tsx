import { useEffect, useState } from 'react';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/clinical/StatusAtoms';
import { EmptyState } from '@/components/clinical/SharedStates';

/** File 22 P2-39: in-house pharmacy stock for clinics. */
export default function ClinicInventory() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ itemName: '', currentStock: '', minStockLevel: '', unitPrice: '' });

  const load = async () => {
    try {
      const r: any = await api.get('/enterprise/maintenance');
      // Reuse maintenance endpoint pattern; clinic inventory is a separate concern
      // but we keep it simple: fetch from a dedicated endpoint
      const inv: any = await api.get('/clinics/inventory').catch(() => null);
      setRows(inv?.items || []);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clinics/inventory', {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        minStockLevel: Number(form.minStockLevel) || 0,
        unitPrice: Number(form.unitPrice) || 0,
      });
      toast.success('Item added');
      setForm({ itemName: '', currentStock: '', minStockLevel: '', unitPrice: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  const lowStock = rows.filter((r) => r.currentStock <= r.minStockLevel);

  return (
    <div className="space-y-3 p-4">
      <h1 className="flex items-center gap-2 text-lg font-bold"><Package size={18} /> Clinic inventory</h1>
      {lowStock.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={14} className="mr-1 inline" />
          {lowStock.length} item(s) below minimum stock level
        </div>
      ) : null}
      <Card>
        <CardHeader><CardTitle className="text-sm">Add item</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input placeholder="Item name" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required />
            <Input type="number" placeholder="Stock" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
            <Input type="number" placeholder="Min level" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
            <Input type="number" placeholder="Unit price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Stock ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {rows.map((r) => (
            <div key={r._id} className="flex items-center justify-between rounded border p-2 text-xs">
              <span><b>{r.itemName}</b> · {r.currentStock} units · ₹{r.unitPrice}</span>
              {r.currentStock <= r.minStockLevel ? <StatusPill status="low" /> : <StatusPill status="ok" />}
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No inventory items" hint="Add your first item above." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
