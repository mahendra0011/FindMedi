import { useState, useEffect } from 'react';
import { Plus, Tag, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PharmacyOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', discountType:'percentage', discountValue:'', validFrom:'', validUntil:'', minPurchase:'', isActive:true });

  const load = async () => {
    setLoading(true);
    try { const res = await api.getPharmacyOffers(); setOffers(res.offers || []); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditItem(null); setForm({ title:'', description:'', discountType:'percentage', discountValue:'', validFrom:'', validUntil:'', minPurchase:'', isActive:true }); setShowModal(true); };
  const openEdit = (o) => { setEditItem(o); setForm({ title:o.title, description:o.description||'', discountType:o.discountType, discountValue:o.discountValue, validFrom:o.validFrom?.split('T')[0]||'', validUntil:o.validUntil?.split('T')[0]||'', minPurchase:o.minPurchase||'', isActive:o.isActive }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editItem) { await api.updatePharmacyOffer(editItem._id, form); toast.success('Offer updated'); }
      else { await api.createPharmacyOffer(form); toast.success('Offer created'); }
      setShowModal(false); load();
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    try { await api.deletePharmacyOffer(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-xl font-bold text-foreground">Offers & Discounts</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> New Offer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map(o => (
          <div key={o._id} className={`bg-card rounded-xl border p-5 shadow-sm ${!o.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-semibold text-foreground">{o.title}</p>
                  <Badge variant={o.discountType === 'percentage' ? 'default' : 'secondary'} className="text-[10px]">{o.discountType === 'percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}</Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(o)}><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(o._id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            {o.description && <p className="text-xs text-muted-foreground mt-2">{o.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {o.minPurchase > 0 && <span>Min: ₹{o.minPurchase}</span>}
              {o.validUntil && <span>Valid till: {new Date(o.validUntil).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
        {offers.length === 0 && !loading && <div className="col-span-full py-12 text-center text-muted-foreground">No offers yet</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl border p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-foreground">{editItem ? 'Edit Offer' : 'New Offer'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <Input placeholder="Offer title" value={form.title} onChange={e => setForm(p => ({...p, title:e.target.value}))} />
              <Input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({...p, description:e.target.value}))} />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.discountType} onChange={e => setForm(p => ({...p, discountType:e.target.value}))} className="h-10 rounded-lg border border-border bg-background text-sm px-3">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed (Rs)</option>
                </select>
                <Input type="number" placeholder="Discount value" value={form.discountValue} onChange={e => setForm(p => ({...p, discountValue:e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" placeholder="Valid from" value={form.validFrom} onChange={e => setForm(p => ({...p, validFrom:e.target.value}))} />
                <Input type="date" placeholder="Valid until" value={form.validUntil} onChange={e => setForm(p => ({...p, validUntil:e.target.value}))} />
              </div>
              <Input type="number" placeholder="Minimum purchase (0 = no minimum)" value={form.minPurchase} onChange={e => setForm(p => ({...p, minPurchase:e.target.value}))} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
