// TODO: Add dedicated API endpoint - currently using localStorage fallback (data will not persist across sessions)
import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Shield, Plus, X, Save, Edit2, Users, Stethoscope, Microscope, Eye, Syringe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_STAFF = [
  { id: 1, name: 'Priya Sharma', role: 'Lab Technician', email: 'priya@medicore.com', phone: '9876543210', status: 'Active', department: 'Pathology', joinDate: '2024-01-15', qualification: 'B.Sc MLT' },
  { id: 2, name: 'Rahul Verma', role: 'Phlebotomist', email: 'rahul@medicore.com', phone: '9876543211', status: 'Active', department: 'Sample Collection', joinDate: '2024-03-01', qualification: 'DMLT' },
  { id: 3, name: 'Anita Patel', role: 'Radiographer', email: 'anita@medicore.com', phone: '9876543212', status: 'Active', department: 'Radiology', joinDate: '2023-11-20', qualification: 'B.Sc Radiography' },
  { id: 4, name: 'Suresh Kumar', role: 'Lab Assistant', email: 'suresh@medicore.com', phone: '9876543213', status: 'On Leave', department: 'Pathology', joinDate: '2024-06-01', qualification: 'DMLT' },
  { id: 5, name: 'Neha Singh', role: 'Quality Analyst', email: 'neha@medicore.com', phone: '9876543214', status: 'Active', department: 'Quality Control', joinDate: '2024-02-10', qualification: 'M.Sc Biochemistry' },
];

export default function LabStaff() {
  const [staffList, setStaffList] = useState(() => {
    try {
      const saved = localStorage.getItem('labStaff');
      return saved ? JSON.parse(saved) : DEFAULT_STAFF;
    } catch { return DEFAULT_STAFF; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'', role:'', email:'', phone:'', department:'', qualification:'', status:'Active', joinDate:'' });

  const saveList = (list) => {
    setStaffList(list);
    localStorage.setItem('labStaff', JSON.stringify(list));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.role) { toast.error('Name and Role are required'); return; }
    if (editId) {
      saveList(staffList.map(s => s.id === editId ? { ...s, ...form } : s));
      toast.success('Staff updated');
    } else {
      saveList([...staffList, { ...form, id: Date.now() }]);
      toast.success('Staff added');
    }
    setShowForm(false); setEditId(null); setForm({ name:'', role:'', email:'', phone:'', department:'', qualification:'', status:'Active', joinDate:'' });
  };

  const handleEdit = (staff) => { setForm(staff); setEditId(staff.id); setShowForm(true); };

  const handleDelete = (id) => {
    if (!window.confirm('Remove this staff member?')) return;
    saveList(staffList.filter(s => s.id !== id));
    toast.success('Staff removed');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground mt-1">{staffList.length} team members</p>
        </div>
        <Button onClick={() => { setEditId(null); setForm({ name:'', role:'', email:'', phone:'', department:'', qualification:'', status:'Active', joinDate:'' }); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Staff
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6">
            <h2 className="font-heading font-bold text-lg mb-4">{editId ? 'Edit Staff' : 'Add New Staff'}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[ {key:'name', label:'Full Name'}, {key:'role', label:'Role'}, {key:'email', label:'Email', type:'email'}, {key:'phone', label:'Phone'}, {key:'department', label:'Department'}, {key:'qualification', label:'Qualification'}, {key:'joinDate', label:'Join Date', type:'date'} ].map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium mb-1 block">{f.label}</label>
                  <Input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} required={f.key === 'name' || f.key === 'role'} />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">{['Active', 'On Leave', 'Inactive'].map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-2">
                <Button type="submit"><Save className="w-4 h-4 mr-1" /> {editId ? 'Update' : 'Add'} Staff</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map(staff => (
          <motion.div key={staff.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-lg transition-all">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                <span className="text-primary-foreground font-bold text-lg">{staff.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{staff.name}</p>
                <p className="text-sm text-primary">{staff.role}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" /> {staff.email}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" /> {staff.phone}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Shield className="w-3.5 h-3.5" /> {staff.department}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><User className="w-3.5 h-3.5" /> {staff.qualification}</div>
              <div className="flex items-center justify-between pt-3 border-t">
                <Badge variant="outline" className={staff.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : staff.status === 'On Leave' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-muted text-muted-foreground'}>{staff.status}</Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(staff)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(staff.id)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}