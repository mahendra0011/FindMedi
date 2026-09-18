import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Phone, Mail, Clock, Image, Plus, X, Save, CheckCircle, Upload, Globe, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ClinicManagement() {
  const { user } = useAuth();
  const [clinicProfile, setClinicProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newFacility, setNewFacility] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getClinicProfile();
        const fac = res?.facility || null;
        if (fac) {
          setClinicProfile({ ...fac, _id: fac._id || 'clinic_1' });
        } else {
          setClinicProfile(null);
        }
      } catch {
        setClinicProfile(null);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone,
        description: form.description,
      };
      await api.updateClinicProfile(payload);
      setClinicProfile(prev => ({ ...prev, ...payload }));
      setShowForm(false);
      setSaved(true);
      toast.success('Clinic settings updated successfully');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { toast.error(e.message || 'Failed to save'); }
    setSaving(false);
  };

  const addFacility = () => {
    if (newFacility.trim()) {
      const updated = { ...form, facilities: [...(form.facilities || []), newFacility.trim()] };
      setForm(updated);
      setNewFacility('');
    }
  };

  const openEdit = (clinic) => {
    setEditing(clinic);
    setForm({ ...clinic });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      name: `${user?.name}'s Clinic`,
      address: '',
      city: '',
      phone: '',
      email: user?.email || '',
      timings: { weekday: '09:00 - 17:00', weekend: '10:00 - 14:00' },
      photos: [],
      facilities: [],
      description: '',
      status: 'active',
    });
    setShowForm(true);
  };

  const clinics = clinicProfile ? [clinicProfile] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clinic Management</h1>
          <p className="text-muted-foreground">{clinics.length} clinic(s) / branch(es)</p>
        </div>
        <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Add Branch</Button>
      </div>

      {clinics.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Building2 className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No clinics registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {clinics.map((clinic, i) => (
            <motion.div key={clinic._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 overflow-hidden">
              <div className="relative h-40 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
                {clinic.photos?.[0] ? (
                  <img src={clinic.photos[0]} alt={clinic.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-16 h-16 text-primary/30" />
                )}
                <button onClick={() => openEdit(clinic)}
                  className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur rounded-lg flex items-center justify-center hover:bg-background transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-foreground text-lg">{clinic.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {clinic.address}, {clinic.city}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clinic.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {clinic.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {clinic.phone}</div>
                  <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {clinic.email}</div>
                  <div className="flex items-center gap-1 text-muted-foreground col-span-2"><Clock className="w-3.5 h-3.5" /> Weekday: {clinic.timings?.weekday} | Weekend: {clinic.timings?.weekend}</div>
                </div>
                {clinic.description && <p className="text-sm text-muted-foreground">{clinic.description}</p>}
                {clinic.facilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.facilities.map((f, j) => (
                      <span key={j} className="px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editing ? 'Edit Clinic' : 'Add New Branch'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-1.5 block">Clinic Name *</label>
                  <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Clinic name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Address</label>
                  <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">City</label>
                  <Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone</label>
                  <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Weekday Timings</label>
                  <Input value={form.timings?.weekday || ''} onChange={e => setForm({ ...form, timings: { ...form.timings, weekday: e.target.value } })} placeholder="09:00 - 17:00" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Weekend Timings</label>
                  <Input value={form.timings?.weekend || ''} onChange={e => setForm({ ...form, timings: { ...form.timings, weekend: e.target.value } })} placeholder="10:00 - 14:00" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="About your clinic..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none h-20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Facilities</label>
                <div className="flex gap-2 mb-2">
                  <Input value={newFacility} onChange={e => setNewFacility(e.target.value)} placeholder="e.g. Parking" className="flex-1" />
                  <Button size="sm" onClick={addFacility} disabled={!newFacility.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
                {form.facilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.facilities.map((f, idx) => (
                      <span key={idx} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted">
                        {f}
                        <button onClick={() => {
                          setForm({ ...form, facilities: form.facilities.filter((_, i) => i !== idx) });
                        }} className="text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!form.name || saving}>
                <Save className="w-4 h-4" /> {editing ? 'Update' : 'Add Clinic'}
                {saved && <CheckCircle className="w-4 h-4 text-green-300" />}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
