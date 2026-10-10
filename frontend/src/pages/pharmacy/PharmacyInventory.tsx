import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pill, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataGrid } from '@/components/ui/System';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PharmacyInventory() {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name:'', genericName:'', manufacturer:'', category:'', price:'', currentStock:'', reorderLevel:'', expiryDate:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.getPharmacyMedicines({ search }); setMedicines(res.medicines || []); }
    catch (e) { toast.error(e.message); }
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm({ name:'', genericName:'', manufacturer:'', category:'', price:'', currentStock:'', reorderLevel:'', expiryDate:'' }); setShowModal(true); };
  const openEdit = (m) => { setEditItem(m); setForm({ name:m.name, genericName:m.genericName||'', manufacturer:m.manufacturer||'', category:m.category||'', price:m.price||'', currentStock:m.currentStock||'', reorderLevel:m.reorderLevel||'', expiryDate:m.expiryDate?.split('T')[0]||'' }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.updatePharmacyMedicine(editItem._id, form);
        toast.success('Medicine updated');
      } else {
        await api.createPharmacyMedicine(form);
        toast.success('Medicine added');
      }
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this medicine?')) return;
    try { await api.deletePharmacyMedicine(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (v, m) => (
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{v}</span>
          {m.expiryDate && new Date(m.expiryDate) <= new Date(Date.now() + 90 * 86400000) && <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600"><AlertTriangle className="w-3 h-3 mr-0.5" />Expiring</Badge>}
          {(m.currentStock ?? 0) <= (m.reorderLevel ?? 0) && <Badge variant="destructive" className="text-[10px] px-1.5 py-0"><AlertTriangle className="w-3 h-3" /></Badge>}
        </div>
      ),
    },
    { key: 'genericName', label: 'Generic', render: (v) => v || '—' },
    { key: 'manufacturer', label: 'Manufacturer', render: (v) => v || '—' },
    { key: 'price', label: 'Price', render: (v) => <span className="font-medium text-foreground">₹{v || 0}</span> },
    {
      key: 'currentStock', label: 'Stock',
      render: (v, m) => (
        <>
          <span className={v <= (m.reorderLevel ?? 0) ? 'text-destructive font-semibold' : 'text-foreground'}>{v ?? 0}</span>
          <span className="text-xs text-muted-foreground ml-1">/ {m.reorderLevel ?? 0}</span>
        </>
      ),
    },
    {
      key: '_actions', label: 'Actions', sortable: false,
      render: (_v, m) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" aria-label={`Edit ${m.name}`} onClick={() => openEdit(m)}><Edit2 className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" aria-label={`Delete ${m.name}`} onClick={() => handleDelete(m._id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Medicine Inventory</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..." aria-label="Search medicines" className="pl-9" />
          </div>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
      </div>

      <DataGrid
        columns={columns}
        rows={medicines}
        rowKey="_id"
        empty={loading ? 'Loading…' : 'No medicines found'}
        showSearch={false}
        manualPagination
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-foreground">{editItem ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Medicine name" value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Generic name" value={form.genericName} onChange={e => setForm(p => ({...p, genericName:e.target.value}))} />
                <Input placeholder="Manufacturer" value={form.manufacturer} onChange={e => setForm(p => ({...p, manufacturer:e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Category" value={form.category} onChange={e => setForm(p => ({...p, category:e.target.value}))} />
                <Input type="number" placeholder="Price" value={form.price} onChange={e => setForm(p => ({...p, price:e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Current stock" value={form.currentStock} onChange={e => setForm(p => ({...p, currentStock:e.target.value}))} />
                <Input type="number" placeholder="Reorder level" value={form.reorderLevel} onChange={e => setForm(p => ({...p, reorderLevel:e.target.value}))} />
              </div>
              <Input type="date" placeholder="Expiry date" value={form.expiryDate} onChange={e => setForm(p => ({...p, expiryDate:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editItem ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
