import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Plus, X, Save, Edit2, CheckCircle, Users, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const staffRoles = ['Receptionist', 'Nurse', 'Lab Technician', 'Pharmacist', 'Accountant', 'Helper'];

export default function ClinicStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Receptionist');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getClinicStaff();
        const list = Array.isArray(res) ? res : res?.staff || [];
        setStaff(list);
      } catch { setStaff([]); }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = { name, email, phone, role };
        await api.updateClinicStaff(editing._id, updated);
        setStaff(staff.map(s => s._id === editing._id ? { ...s, ...updated } : s));
        toast.success('Staff updated');
      } else {
        const res = await api.createClinicStaff({ name, email, phone, role });
        const newMember = res?.staff || res || { _id: `st_${Date.now()}`, name, email, phone, role, status: 'active' };
        setStaff([newMember, ...staff]);
        toast.success('Staff added');
      }
      setShowForm(false);
      setEditing(null);
      setName(''); setEmail(''); setPhone(''); setRole('Receptionist');
    } catch (e) { toast.error(e.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteClinicStaff(id);
      setStaff(staff.filter(s => s._id !== id));
      toast.success('Staff removed');
    } catch (e) { toast.error(e.message || 'Failed to delete'); }
  };

  const openEdit = (member) => {
    setEditing(member);
    setName(member.name);
    setEmail(member.email || '');
    setPhone(member.phone || '');
    setRole(member.role);
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setName(''); setEmail(''); setPhone(''); setRole('Receptionist');
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">{staff.length} staff member(s)</p>
        </div>
        <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Add Staff</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Users className="w-6 h-6 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{staff.length}</p>
          <p className="text-xs text-muted-foreground">Total Staff</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Shield className="w-6 h-6 mx-auto text-info mb-1" />
          <p className="text-2xl font-bold">{staff.filter(s => s.role === 'Receptionist').length}</p>
          <p className="text-xs text-muted-foreground">Receptionists</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <Stethoscope className="w-6 h-6 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold">{staff.filter(s => s.role === 'Nurse').length}</p>
          <p className="text-xs text-muted-foreground">Nurses</p>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-4 text-center">
          <User className="w-6 h-6 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold">{staff.filter(s => s.role === 'Lab Technician').length}</p>
          <p className="text-xs text-muted-foreground">Lab Techs</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No staff members yet</p>
          <p className="text-sm text-muted-foreground/70">Add your clinic staff (receptionist, nurse, etc.)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member, i) => (
            <motion.div key={member._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{member.name}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs">{member.role}</Badge>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(member)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(member._id)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {(member.email || member.phone) && (
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {member.email && <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {member.email}</div>}
                  {member.phone && <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {member.phone}</div>}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editing ? 'Edit Staff' : 'Add Staff Member'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  {staffRoles.map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${role === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!name || saving}>
                <Save className="w-4 h-4" /> {editing ? 'Update' : 'Add Staff'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
