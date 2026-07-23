import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bed, Plus, Search, Trash2, Edit, Save, X, Eye, Wifi, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const WARDS = ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'];
const BED_TYPES = ['General', 'Semi-Private', 'Private', 'ICU', 'NICU', 'PICU'];

export default function AdminBedManagement() {
  const [beds, setBeds] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0, maintenance: 0 });
  const [search, setSearch] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ bedNumber: '', ward: 'General', bedType: 'General', dailyRate: '', floor: '', isAC: false });

  const loadBeds = async () => {
    setLoading(true);
    try {
      const params = {};
      if (wardFilter) params.ward = wardFilter;
      if (statusFilter) params.status = statusFilter;
      const [data, statsData] = await Promise.all([
        api.getBeds(params),
        api.getBedStats(),
      ]);
      setBeds(data);
      setStats(statsData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadBeds(); }, [wardFilter, statusFilter]);

  const resetForm = () => {
    setForm({ bedNumber: '', ward: 'General', bedType: 'General', dailyRate: '', floor: '', isAC: false });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.updateBed(editId, form);
      } else {
        await api.createBed(form);
      }
      resetForm();
      loadBeds();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (bed) => {
    setForm({
      bedNumber: bed.bedNumber,
      ward: bed.ward,
      bedType: bed.bedType,
      dailyRate: bed.dailyRate?.toString() || '',
      floor: bed.floor || '',
      isAC: bed.isAC || false,
    });
    setEditId(bed._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try { await api.deleteBed(id); loadBeds(); } catch (e) { console.error(e); }
  };

  const filtered = beds.filter(b => !search || b.bedNumber.toLowerCase().includes(search.toLowerCase()) || b.ward.toLowerCase().includes(search.toLowerCase()));

  const statusColor = { Available: 'bg-emerald-500/10 text-emerald-600', Occupied: 'bg-red-500/10 text-red-600', 'Under Cleaning': 'bg-amber-500/10 text-amber-600', Maintenance: 'bg-gray-500/10 text-gray-600' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Bed & Ward Management</h1>
          <p className="text-muted-foreground">Manage hospital beds, wards and availability</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Bed</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Beds', value: stats.total, color: 'text-foreground' },
          { label: 'Available', value: stats.available, color: 'text-emerald-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold mb-1">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bed number or ward..." className="pl-10" />
        </div>
        <select value={wardFilter} onChange={e => setWardFilter(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
          <option value="">All Wards</option>
          {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
          <option value="">All Status</option>
          {['Available', 'Occupied', 'Under Cleaning', 'Maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No beds found. Add a bed to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((bed, i) => (
            <motion.div key={bed._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bed className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{bed.bedNumber}</h3>
                    <p className="text-xs text-muted-foreground">{bed.ward} - {bed.bedType}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[bed.status] || 'bg-gray-500/10 text-gray-600'}`}>
                  {bed.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                <div className="flex justify-between">
                  <span>Daily Rate</span>
                  <span className="font-semibold text-foreground">₹{bed.dailyRate}</span>
                </div>
                {bed.floor && (
                  <div className="flex justify-between">
                    <span>Floor</span>
                    <span className="font-semibold text-foreground">{bed.floor}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>AC</span>
                  <span className="font-semibold text-foreground">{bed.isAC ? 'Yes' : 'No'}</span>
                </div>
                {bed.currentPatientName && (
                  <div className="flex justify-between">
                    <span>Patient</span>
                    <span className="font-semibold text-foreground truncate ml-2">{bed.currentPatientName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/30">
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-8" onClick={() => handleEdit(bed)}>
                  <Edit className="w-3 h-3" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs h-8 text-destructive hover:text-destructive" onClick={() => handleDelete(bed._id)}>
                  <Trash2 className="w-3 h-3" /> Remove
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border/60 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold text-foreground">{editId ? 'Edit Bed' : 'Add New Bed'}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bed Number *</label>
                <Input value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} placeholder="e.g. G-01, ICU-03" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Ward *</label>
                  <select value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Bed Type *</label>
                  <select value={form.bedType} onChange={e => setForm({ ...form, bedType: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {BED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Daily Rate (₹) *</label>
                  <Input value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} placeholder="e.g. 1500" type="number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Floor</label>
                  <Input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="e.g. 2nd Floor" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isAC} onChange={e => setForm({ ...form, isAC: e.target.checked })} className="rounded border-border/60" />
                <span className="text-sm text-foreground">AC Room</span>
                <Snowflake className="w-3.5 h-3.5 text-blue-500" />
              </label>
              <Button className="w-full gap-2" onClick={handleSave} disabled={!form.bedNumber || !form.dailyRate}>
                <Save className="w-4 h-4" /> {editId ? 'Update Bed' : 'Add Bed'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
