import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Plus, Trash2, Save, Edit, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', head: '', active: true, fees_structure: 0 });

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadDepartments(); }, []);

  const resetForm = () => { setForm({ name: '', description: '', head: '', active: true, fees_structure: 0 }); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.updateDepartment(editId, form);
      } else {
        await api.createDepartment(form);
      }
      resetForm();
      loadDepartments();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (dept) => {
    setForm({ name: dept.name, description: dept.description, head: dept.head, active: dept.active, fees_structure: dept.fees_structure });
    setEditId(dept._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.deleteDepartment(id); loadDepartments(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Manage Departments</h1>
          <p className="text-muted-foreground">Add, edit, or remove hospital departments and set fees structure</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Department</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No departments found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => (
            <motion.div key={dept._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{dept.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dept.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {dept.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{dept.description}</p>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                {dept.head && <div className="flex items-center gap-2"><span>Head: {dept.head}</span></div>}
                <div className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5" /><span>Fees: Rs {dept.fees_structure}</span></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleEdit(dept)}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(dept._id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={resetForm}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editId ? 'Edit Department' : 'Add New Department'}</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Department Name</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cardiology" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Department description..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Department Head</label>
                <Input value={form.head} onChange={e => setForm({ ...form, head: e.target.value })} placeholder="Dr. Name" />
              </div>
              <div><label className="text-sm font-medium text-foreground mb-1.5 block">Fees Structure (Rs)</label>
                <Input type="number" value={form.fees_structure} onChange={e => setForm({ ...form, fees_structure: Number(e.target.value) })} placeholder="500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="rounded" />
                <label htmlFor="active" className="text-sm text-foreground">Active</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!form.name}>
                <Save className="w-4 h-4" /> {editId ? 'Update' : 'Add'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}