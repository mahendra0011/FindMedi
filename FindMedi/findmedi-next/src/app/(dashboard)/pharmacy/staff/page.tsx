/**
 * Staff — ported from client/src/pages/pharmacy/PharmacyStaff.jsx (Phase 4).
 * Store team directory with add/edit/remove.
 */
'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usePharmacyStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from '@/features/pharmacy-orders/hooks';

interface StaffMember {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  joinedAt?: string;
}

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  joinedAt: string;
}

const emptyForm: StaffForm = { name: '', email: '', phone: '', role: 'pharmacist', joinedAt: '' };

const onError = (e: Error) => toast.error(e.message);

export default function StaffPage() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);

  const { data: staffData, isLoading: loading } = usePharmacyStaff();
  const createMut = useCreateStaff();
  const updateMut = useUpdateStaff();
  const deleteMut = useDeleteStaff();

  const staff = ((Array.isArray(staffData) ? staffData : []) as unknown as StaffMember[]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditItem(s);
    setForm({
      name: s.name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      role: s.role ?? 'pharmacist',
      joinedAt: s.joinedAt?.split('T')[0] ?? '',
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editItem) {
      updateMut.mutate(
        { id: editItem._id, ...form },
        { onSuccess: () => {
          toast.success('Staff updated');
          setShowModal(false);
        }, onError },
      );
    } else {
      createMut.mutate(
        { ...form },
        { onSuccess: () => {
          toast.success('Staff added');
          setShowModal(false);
        }, onError },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this staff member?')) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Removed'),
      onError: () => toast.error('Failed to remove'),
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Staff</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Staff
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading staff…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <div key={s._id} className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {s.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{s.name}</p>
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {s.role}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(s)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(s._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {(s.email || s.phone) && (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {s.email && <p>{s.email}</p>}
                  {s.phone && <p>{s.phone}</p>}
                </div>
              )}
            </div>
          ))}
          {staff.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">No staff members</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editItem ? 'Edit Staff' : 'Add Staff'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full h-10 rounded-lg border border-border bg-background text-sm px-3"
              >
                <option value="pharmacist">Pharmacist</option>
                <option value="pharmacy_technician">Pharmacy Technician</option>
                <option value="pharmacy_manager">Pharmacy Manager</option>
              </select>
              <Input
                type="date"
                placeholder="Joined date"
                value={form.joinedAt}
                onChange={(e) => setForm((p) => ({ ...p, joinedAt: e.target.value }))}
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
