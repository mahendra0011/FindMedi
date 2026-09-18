/**
 * Medicine Inventory — ported from client/src/pages/pharmacy/PharmacyInventory.jsx (Phase 4).
 * Medicine catalog with stock levels, add/edit/delete.
 */
'use client';

import { useState } from 'react';
import { Search, Plus, Pill, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMedicineInventory, useCreateMedicine, useUpdateMedicine, useDeleteMedicine } from '@/features/pharmacy-orders/hooks';

interface MedicineItem {
  _id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  category?: string;
  price?: number;
  currentStock?: number;
  reorderLevel?: number;
  expiryDate?: string;
}

const emptyForm = { name: '', genericName: '', manufacturer: '', category: '', price: '', currentStock: '', reorderLevel: '', expiryDate: '' };

const onError = (e: Error) => toast.error(e.message);

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<MedicineItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: medicinesData, isLoading: loading } = useMedicineInventory(search);
  const createMut = useCreateMedicine();
  const updateMut = useUpdateMedicine();
  const deleteMut = useDeleteMedicine();

  const medicines = ((Array.isArray(medicinesData) ? medicinesData : []) as unknown as MedicineItem[]).filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (m: MedicineItem) => {
    setEditItem(m);
    setForm({
      name: m.name,
      genericName: m.genericName || '',
      manufacturer: m.manufacturer || '',
      category: m.category || '',
      price: m.price !== undefined ? String(m.price) : '',
      currentStock: m.currentStock !== undefined ? String(m.currentStock) : '',
      reorderLevel: m.reorderLevel !== undefined ? String(m.reorderLevel) : '',
      expiryDate: m.expiryDate?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editItem) {
      updateMut.mutate(
        { id: editItem._id, ...form },
        { onSuccess: () => {
          toast.success('Medicine updated');
          setShowModal(false);
        }, onError },
      );
    } else {
      createMut.mutate(
        { ...form },
        { onSuccess: () => {
          toast.success('Medicine added');
          setShowModal(false);
        }, onError },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this medicine?')) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-bold text-foreground">Medicine Inventory</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines..." className="pl-9" />
          </div>
          <Button onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Generic</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Manufacturer</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Price</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Stock</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Loading medicines…
                </td>
              </tr>
            ) : (
              medicines.map((m) => (
                <tr key={m._id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{m.name}</span>
                      {m.expiryDate && new Date(m.expiryDate).getTime() <= new Date().getTime() + 90 * 86400000 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          Expiring
                        </Badge>
                      )}
                      {(m.currentStock ?? 0) <= (m.reorderLevel ?? 0) && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <AlertTriangle className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{m.genericName || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{m.manufacturer || '—'}</td>
                  <td className="py-3 px-4 text-right font-medium text-foreground">₹{m.price || 0}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={(m.currentStock ?? 0) <= (m.reorderLevel ?? 0) ? 'text-destructive font-semibold' : 'text-foreground'}>
                      {m.currentStock ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">/ {m.reorderLevel ?? 0}</span>
                  </td>
                  <td className="py-3 px-4 text-right hidden md:table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(m)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(m._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && medicines.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No medicines found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editItem ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Medicine name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Generic name"
                  value={form.genericName}
                  onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))}
                />
                <Input
                  placeholder="Manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => setForm((p) => ({ ...p, manufacturer: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Category"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Current stock"
                  value={form.currentStock}
                  onChange={(e) => setForm((p) => ({ ...p, currentStock: e.target.value }))}
                />
                <Input
                  type="number"
                  placeholder="Reorder level"
                  value={form.reorderLevel}
                  onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
                />
              </div>
              <Input
                type="date"
                placeholder="Expiry date"
                value={form.expiryDate}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editItem ? 'Update' : 'Add'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
