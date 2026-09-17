/**
 * Offers & Discounts — ported from client/src/pages/pharmacy/PharmacyOffers.jsx (Phase 4).
 * Offer catalog with create/edit/delete.
 */
'use client';

import { useState } from 'react';
import { Plus, Tag, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from '@/features/pharmacy-orders/hooks';

interface OfferItem {
  _id: string;
  title: string;
  description?: string;
  discountType?: string;
  discountValue?: string | number;
  validFrom?: string;
  validUntil?: string;
  minPurchase?: string | number;
  isActive?: boolean;
}

interface OfferForm {
  title: string;
  description: string;
  discountType: string;
  discountValue: string;
  validFrom: string;
  validUntil: string;
  minPurchase: string;
  isActive: boolean;
}

const emptyForm: OfferForm = {
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  validFrom: '',
  validUntil: '',
  minPurchase: '',
  isActive: true,
};

const onError = (e: Error) => toast.error(e.message);

export default function OffersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<OfferItem | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);

  const { data: offersData, isLoading: loading } = useOffers();
  const createMut = useCreateOffer();
  const updateMut = useUpdateOffer();
  const deleteMut = useDeleteOffer();

  const offers = ((Array.isArray(offersData) ? offersData : []) as unknown as OfferItem[]);

  const openAdd = () => {
    setEditItem(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (o: OfferItem) => {
    setEditItem(o);
    setForm({
      title: o.title,
      description: o.description || '',
      discountType: o.discountType || 'percentage',
      discountValue: o.discountValue !== undefined ? String(o.discountValue) : '',
      validFrom: o.validFrom?.split('T')[0] || '',
      validUntil: o.validUntil?.split('T')[0] || '',
      minPurchase: o.minPurchase !== undefined ? String(o.minPurchase) : '',
      isActive: o.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editItem) {
      updateMut.mutate(
        { id: editItem._id, ...form },
        { onSuccess: () => {
          toast.success('Offer updated');
          setShowModal(false);
        }, onError },
      );
    } else {
      createMut.mutate(
        { ...form },
        { onSuccess: () => {
          toast.success('Offer created');
          setShowModal(false);
        }, onError },
      );
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this offer?')) return;
    deleteMut.mutate(id, {
      onSuccess: () => toast.success('Deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Offers & Discounts</h1>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> New Offer
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading offers…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((o) => (
            <div key={o._id} className={`bg-card rounded-xl border p-5 shadow-sm ${!o.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{o.title}</p>
                    <Badge variant={o.discountType === 'percentage' ? 'default' : 'secondary'} className="text-[10px]">
                      {o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(o)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(o._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {o.description && <p className="text-xs text-muted-foreground mt-2">{o.description}</p>}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {Number(o.minPurchase ?? 0) > 0 && <span>Min: ₹{o.minPurchase}</span>}
                {o.validUntil && <span>Valid till: {new Date(o.validUntil).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
          {offers.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">No offers yet</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">{editItem ? 'Edit Offer' : 'New Offer'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Offer title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
                  className="h-10 rounded-lg border border-border bg-background text-sm px-3"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed (Rs)</option>
                </select>
                <Input
                  type="number"
                  placeholder="Discount value"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  placeholder="Valid from"
                  value={form.validFrom}
                  onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="Valid until"
                  value={form.validUntil}
                  onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                />
              </div>
              <Input
                type="number"
                placeholder="Minimum purchase (0 = no minimum)"
                value={form.minPurchase}
                onChange={(e) => setForm((p) => ({ ...p, minPurchase: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
