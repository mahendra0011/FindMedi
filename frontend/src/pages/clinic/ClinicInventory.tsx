import { useEffect, useState } from 'react';
import { Package, Plus, AlertTriangle, Search, Check } from 'lucide-react';
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
  const [form, setForm] = useState({ itemName: '', category: '', currentStock: '', minStockLevel: '', unitPrice: '' });
  const [scanCode, setScanCode] = useState('');
  const [match, setMatch] = useState<any>(null);
  const [barcodeDrafts, setBarcodeDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const inv: any = await api.get('/inventory/items');
      setRows(inv?.items || []);
    } catch { setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory/items', {
        ...form,
        currentStock: Number(form.currentStock) || 0,
        minStockLevel: Number(form.minStockLevel) || 0,
        unitPrice: Number(form.unitPrice) || 0,
      });
      toast.success('Item added');
      setForm({ itemName: '', category: '', currentStock: '', minStockLevel: '', unitPrice: '' });
      load();
    } catch (err: any) { toast.error(err?.response?.data?.message || 'Save failed'); }
  };

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    try {
      const r: any = await api.get(`/inventory/barcode/${encodeURIComponent(code)}`);
      setMatch(r?.item || null);
      if (!r?.item) toast.error('No item found for that barcode');
    } catch (err: any) {
      setMatch(null);
      toast.error(err?.response?.data?.message || 'No item found for that barcode');
    }
  };

  const saveBarcode = async (id: string) => {
    const barcode = (barcodeDrafts[id] || '').trim();
    if (!barcode) return;
    try {
      await api.post(`/inventory/items/${id}/barcode`, { barcode });
      toast.success('Barcode saved');
      setBarcodeDrafts({ ...barcodeDrafts, [id]: '' });
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
            <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <Input type="number" placeholder="Stock" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
            <Input type="number" placeholder="Min level" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
            <Input type="number" placeholder="Unit price" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
            <Button size="sm" type="submit"><Plus size={14} /> Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Barcode lookup</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <form onSubmit={lookup} className="flex flex-wrap gap-2">
            <Input placeholder="Scan or type barcode" value={scanCode} onChange={(e) => setScanCode(e.target.value)} />
            <Button size="sm" type="submit"><Search size={14} /> Lookup</Button>
          </form>
          {match ? (
            <div className="rounded border p-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <b>{match.itemName}</b>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{match.barcode}</span>
              </div>
              <div className="mt-1 text-slate-600">
                {match.currentStock} units · ₹{match.unitPrice}
                {match.batchNumber ? ` · Batch ${match.batchNumber}` : ''}
                {match.expiryDate ? ` · Exp ${new Date(match.expiryDate).toLocaleDateString()}` : ''}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Stock ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {rows.map((r) => (
            <div key={r._id} className="space-y-1.5 rounded border p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <b>{r.itemName}</b> · {r.currentStock} units · ₹{r.unitPrice}
                  {r.barcode ? <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{r.barcode}</span> : null}
                </span>
                {r.currentStock <= r.minStockLevel ? <StatusPill status="low" /> : <StatusPill status="ok" />}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  className="h-7 flex-1 text-xs"
                  placeholder={r.barcode ? 'Replace barcode' : 'Set barcode'}
                  value={barcodeDrafts[r._id] || ''}
                  onChange={(e) => setBarcodeDrafts({ ...barcodeDrafts, [r._id]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveBarcode(r._id); } }}
                />
                <Button size="sm" className="h-7 px-2" onClick={() => saveBarcode(r._id)}><Check size={12} /> Save</Button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? <EmptyState title="No inventory items" hint="Add your first item above." /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
