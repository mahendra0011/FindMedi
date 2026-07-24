import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, User, Plus, Trash2, CalendarDays, Phone } from 'lucide-react';
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
  getFamily:     ()        => patientRequest('/patient/family'),
  createFamily:  (b)       => patientRequest('/patient/family',    { method:'POST', body: JSON.stringify(b) }),
  deleteFamily:  (id)      => patientRequest(`/patient/family/${id}`, { method:'DELETE' }),
};

export default function PatientFamily() {
  const { user } = useAuth();
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', relation: 'Spouse', gender: 'Male', phone: '', bloodGroup: '' });

  const loadFamily = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getFamily();
      setFamily(res?.members || []);
    } catch { toast.error('Failed to load family members'); }
    setLoading(false);
  };

  useEffect(() => { loadFamily(); }, []);

  const handleAdd = async () => {
    if (!newMember.name) return toast.error('Please enter a name');
    try {
      await patientApi.createFamily(newMember);
      toast.success(newMember.name + ' added');
      setNewMember({ name: '', relation: 'Spouse', gender: 'Male', phone: '', bloodGroup: '' });
      setShowForm(false);
      loadFamily();
    } catch { toast.error('Failed to add member'); }
  };

  const handleDelete = async (id, name) => {
    try {
      await patientApi.deleteFamily(id);
      setFamily(f => f.filter(m => m._id !== id));
      toast.success(name + ' removed');
    } catch { toast.error('Failed to remove member'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Family Members</h1>
          <p className="text-muted-foreground">Add dependent profiles for bookings on their behalf</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Add Member
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border border-border/50">
          <h2 className="font-semibold mb-4">New Family Member</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Full Name</label>
              <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Enter name" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} placeholder="Phone number" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Relation</label>
              <select value={newMember.relation} onChange={e => setNewMember({ ...newMember, relation: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                {['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Gender</label>
              <select value={newMember.gender} onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
                {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Blood Group</label>
              <Input value={newMember.bloodGroup} onChange={e => setNewMember({ ...newMember, bloodGroup: e.target.value })} placeholder="e.g. A+" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAdd}>Save Member</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : family.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No family members added yet</p>
          <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Your First Member
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {family.map(m => (
            <motion.div key={m._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-card border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.relation} · {m.gender}{m.bloodGroup ? ` · ${m.bloodGroup}` : ''}
                    {m.phone ? ` · ${m.phone}` : ''}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(m._id, m.name)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
