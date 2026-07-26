import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPinned, Plus, Edit, Trash2, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function patientRequest(path, opts = {}) {
  return api.dispatch(null, path, opts);
}
const patientApi = {
  getAddresses:  ()        => patientRequest('/patient/addresses'),
  createAddress: (b)       => patientRequest('/patient/addresses', { method:'POST', body: JSON.stringify(b) }),
  updateAddress: (id,b)    => patientRequest(`/patient/addresses/${id}`, { method:'PUT', body: JSON.stringify(b) }),
  deleteAddress: (id)      => patientRequest(`/patient/addresses/${id}`, { method:'DELETE' }),
};

export default function PatientAddresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ label: 'Home', address: '', city: '', state: '', pincode: '', phone: user?.phone || '', isDefault: false });

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getAddresses();
      setAddresses(res?.addresses || []);
    } catch { toast.error('Failed to load addresses'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ label: 'Home', address: '', city: '', state: '', pincode: '', phone: user?.phone || '', isDefault: false });
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditId(a._id);
    setForm({ label: a.label, address: a.address, city: a.city, state: a.state, pincode: a.pincode, phone: a.phone, isDefault: a.isDefault });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.address) return toast.error('Address is required');
    try {
      if (editId) {
        await patientApi.updateAddress(editId, form);
        setAddresses(ads => ads.map(a => a._id === editId ? { ...a, ...form } : a));
        toast.success('Address updated');
      } else {
        const res = await patientApi.createAddress(form);
        setAddresses(ads => [...ads, { ...form, _id: res?._id || `ad${crypto.randomUUID()}` }]);
        toast.success('Address added');
      }
      setShowModal(false);
    } catch { toast.error('Failed to save address'); }
  };

  const handleDelete = async (id) => {
    try {
      await patientApi.deleteAddress(id);
      setAddresses(ads => ads.filter(a => a._id !== id));
      toast.success('Address deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Saved Addresses</h1>
          <p className="text-muted-foreground">For home collection and medicine delivery</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Address</Button>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold">{editId ? 'Edit Address' : 'Add Address'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1 block">Label</label>
                <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                  {['Home', 'Office', 'Other'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Address</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium mb-1 block">City</label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">State</label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                <div><label className="text-sm font-medium mb-1 block">Pincode</label><Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1 block">Phone</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                Set as default address
              </label>
              <Button className="w-full" onClick={handleSave} disabled={!form.address}>{editId ? 'Update Address' : 'Add Address'}</Button>
            </div>
          </motion.div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPinned className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p>No saved addresses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((a, i) => (
            <motion.div key={a._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPinned className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{a.label}</p>
                      {a.isDefault && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{a.address}</p>
                    <p className="text-xs text-muted-foreground">{a.city}, {a.state} - {a.pincode}<br /><Phone className="w-3 h-3 inline mr-1" />{a.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(a._id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
