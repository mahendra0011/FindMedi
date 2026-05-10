import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Search, Trash2, Plus, Star, Phone, Mail, Save, CheckCircle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const specializations = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT'];

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', specialization: 'Cardiology', experience: '', phone: '', email: '', available: true });

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await api.getDoctors({ search, includeAll: 'true' });
      setDoctors(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadDoctors(); }, [search]);

  const resetForm = () => { setForm({ name: '', specialization: 'Cardiology', experience: '', phone: '', email: '', available: true }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.updateDoctor(editId, form);
      } else {
        await api.createDoctor({ ...form, rating: 0, patients: 0, initials: form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() });
      }
      resetForm(); loadDoctors();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (doc) => {
    setForm({ name: doc.name, specialization: doc.specialization, experience: doc.experience, phone: doc.phone, email: doc.email, available: doc.available });
    setEditId(doc._id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.deleteDoctor(id); loadDoctors(); } catch (e) { console.error(e); }
  };

  const handleToggleAvailability = async (doc) => {
    try { await api.updateDoctor(doc._id, { available: !doc.available }); loadDoctors(); } catch (e) { console.error(e); }
  };

  const handleApprove = async (id) => {
    try { await api.approveDoctor(id); loadDoctors(); } catch (e) { console.error(e); }
  };

  const handleReject = async (id) => {
    try { await api.rejectDoctor(id); loadDoctors(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Doctors</h1>
          <p className="text-muted-foreground">Add, edit, or remove doctors from the system</p>
        </div>
        <Button className="gap-2" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Doctor</Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors..." className="pl-10" />
      </div>

      {/* Doctor Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No doctors found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc, i) => (
            <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center text-info font-bold text-lg flex-shrink-0">
                  {doc.initials || doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-foreground truncate">{doc.name}</h3>
                  <p className="text-sm text-info font-medium">{doc.specialization}</p>
                </div>
                <button onClick={() => handleToggleAvailability(doc)}
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {doc.available ? 'Available' : 'Unavailable'}
                </button>
              </div>
              <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-semibold ${doc.approved ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {doc.approved ? 'Admin approved' : 'Pending admin approval'}
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><Stethoscope className="w-3.5 h-3.5" /><span>{doc.experience} experience</span></div>
                <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-warning fill-warning" /><span>{doc.rating} rating ({doc.patients} patients)</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{doc.phone}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /><span>{doc.email}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="flex-1 min-w-[88px]" onClick={() => handleEdit(doc)}>Edit</Button>
                {!doc.approved && (
                  <Button variant="outline" size="sm" className="flex-1 min-w-[88px] gap-1 text-success hover:text-success" onClick={() => handleApprove(doc._id)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                )}
                {doc.approved && (
                  <Button variant="outline" size="sm" className="flex-1 min-w-[88px] gap-1 text-warning hover:text-warning" onClick={() => handleReject(doc._id)}>
                    <Ban className="w-3.5 h-3.5" /> Reject
                  </Button>
                )}
                <Button variant="outline" size="sm" className="flex-1 min-w-[88px] gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(doc._id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={resetForm}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editId ? 'Edit Doctor' : 'Add New Doctor'}</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dr. Full Name" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                <select value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                  {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Experience</label>
                <Input value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })} placeholder="e.g. 10 years" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234-567-8901" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="doctor@email.com" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.available} onChange={e => setForm({ ...form, available: e.target.checked })} className="rounded" />
                <label htmlFor="avail" className="text-sm text-foreground">Available for appointments</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!form.name || !form.email}>
                <Save className="w-4 h-4" /> {editId ? 'Update' : 'Add Doctor'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
