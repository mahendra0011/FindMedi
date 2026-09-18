import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, User, Plus, Trash2, CalendarDays, Phone, Heart, UserPlus, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

function patientRequest(path, opts = {}) {
  return api.dispatch(null, path, opts);
}
const patientApi = {
  getFamily:     ()        => patientRequest('/patient/family'),
  createFamily:  (b)       => patientRequest('/patient/family',    { method:'POST', body: JSON.stringify(b) }),
  deleteFamily:  (id)      => patientRequest(`/patient/family/${id}`, { method:'DELETE' }),
};

const relationColors = {
  Spouse: 'text-rose-500 bg-rose-500/10',
  Child: 'text-blue-500 bg-blue-500/10',
  Parent: 'text-amber-500 bg-amber-500/10',
  Sibling: 'text-purple-500 bg-purple-500/10',
  Grandparent: 'text-emerald-500 bg-emerald-500/10',
  Other: 'text-muted-foreground bg-muted/30',
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Family</h1>
          <p className="text-muted-foreground text-sm">Manage family profiles for bookings & prescriptions</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-xl">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Member
        </Button>
      </div>

      {/* Add Member Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border/50 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Add Family Member</h3>
              <p className="text-xs text-muted-foreground">Add a dependent to manage their bookings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full Name</label>
              <Input value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Enter full name" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone</label>
              <Input value={newMember.phone} onChange={e => setNewMember({ ...newMember, phone: e.target.value })} placeholder="Phone number" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Relation</label>
              <select value={newMember.relation} onChange={e => setNewMember({ ...newMember, relation: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
                {['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gender</label>
              <select value={newMember.gender} onChange={e => setNewMember({ ...newMember, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
                {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Blood Group</label>
              <Input value={newMember.bloodGroup} onChange={e => setNewMember({ ...newMember, bloodGroup: e.target.value })} placeholder="e.g. A+" className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAdd} className="rounded-xl">Save Member</Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Stats + List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : family.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <Users className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-semibold text-foreground">No family members yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Add your family members to easily book appointments on their behalf.</p>
          <Button size="sm" className="mt-4 rounded-xl" onClick={() => setShowForm(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add Your First Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {family.map((m, i) => {
            const relClass = relationColors[m.relation] || relationColors.Other;
            return (
              <motion.div key={m._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-foreground text-sm leading-tight truncate">{m.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${relClass}`}>
                          {m.relation}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                          <Shield className="w-3 h-3" />
                          <span>{m.gender}{m.bloodGroup ? ` · ${m.bloodGroup}` : ''}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                      onClick={() => handleDelete(m._id, m.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {m.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-muted/10 rounded-xl">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <a href={`tel:${m.phone}`} className="text-primary hover:underline">{m.phone}</a>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}