import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Edit, Save, X, FlaskConical, Home, Eye, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const DEPARTMENTS = ['Pathology', 'Radiology', 'Cardiology', 'Health Packages'];
const CATEGORIES = ['Blood Test', 'Urine/Stool', 'Hormone', 'Vitamin', 'Cardiac Basic', 'Basic Imaging', 'Advanced Imaging', 'Health Package', 'Other'];
const REPORT_TIMES = ['30 mins', '1 hr', '2 hrs', '6 hrs', '12 hrs', '24 hrs', '48 hrs', '72 hrs'];

export default function AdminTestCatalog() {
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState({ total: 0, popular: 0, homeCollection: 0, prescriptionReq: 0, categories: 0 });
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'Blood Test', department: 'Pathology', price: '', mrp: '',
    reportTime: '24 hrs', prescriptionReq: false, homeCollection: false,
    homeCollectionFee: '', popular: false, nablAccredited: false, description: '', preparation: '',
  });

  const loadTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (deptFilter) params.department = deptFilter;
      if (catFilter) params.category = catFilter;
      if (search) params.search = search;
      const [data, statsData] = await Promise.all([
        api.getTests(params),
        api.getTestStats(),
      ]);
      setTests(data);
      setStats(statsData);
    } catch { toast.error('Failed to load tests'); }
    setLoading(false);
  }, [deptFilter, catFilter, search]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTests(); }, [deptFilter, catFilter, search]);

  const resetForm = () => {
    setForm({
      name: '', category: 'Blood Test', department: 'Pathology', price: '', mrp: '',
      reportTime: '24 hrs', prescriptionReq: false, homeCollection: false,
      homeCollectionFee: '', popular: false, nablAccredited: false, description: '', preparation: '',
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    try {
      const body = {
        ...form,
        price: Number(form.price), mrp: Number(form.mrp),
        homeCollectionFee: Number(form.homeCollectionFee) || 0,
        discount: form.mrp && form.price ? Math.round((1 - form.price / form.mrp) * 100) : 0,
      };
      if (editId) {
        await api.updateTest(editId, body);
      } else {
        await api.createTest(body);
      }
      resetForm();
      loadTests();
    } catch { toast.error(editId ? 'Failed to update test' : 'Failed to create test'); }
  };

  const handleEdit = (test) => {
    setForm({
      name: test.name, category: test.category, department: test.department || 'Pathology',
      price: test.price?.toString() || '', mrp: test.mrp?.toString() || '',
      reportTime: test.reportTime || '24 hrs',
      prescriptionReq: test.prescriptionReq || false,
      homeCollection: test.homeCollection || false,
      homeCollectionFee: test.homeCollectionFee != null ? test.homeCollectionFee.toString() : '',
      popular: test.popular || false,
      nablAccredited: test.nablAccredited || false,
      description: test.description || '', preparation: test.preparation || '',
    });
    setEditId(test._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this test?')) return;
    try { await api.deleteTest(id); loadTests(); } catch { toast.error('Failed to delete test'); }
  };

  const calcDiscount = (mrp, price) => {
    if (!mrp || !price) return 0;
    return Math.round((1 - price / mrp) * 100);
  };

  const filtered = tests.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Test & Service Catalog</h1>
          <p className="text-muted-foreground">Manage test names, pricing, and availability</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4" /> Add Test</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Tests', value: stats.total },
          { label: 'Popular', value: stats.popular },
          { label: 'Home Collection', value: stats.homeCollection },
          { label: 'Prescription Req.', value: stats.prescriptionReq },
          { label: 'Categories', value: stats.categories },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold text-foreground mb-1">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="pl-10" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tests found. Add a test to get started.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((test, i) => (
            <motion.div key={test._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-foreground truncate">{test.name}</h3>
                      <p className="text-xs text-muted-foreground">{test.category} &middot; {test.department}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {test.prescriptionReq && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Rx</span>
                      )}
                      {test.popular && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded"><TrendingUp className="w-2.5 h-2.5" /> Popular</span>
                      )}
                      {test.nablAccredited && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">NABL</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Report: {test.reportTime}</span>
                    {test.homeCollection && (
                      <span className="flex items-center gap-1 text-primary"><Home className="w-3 h-3" /> Home Collection</span>
                    )}
                    <span>MRP: ₹{test.mrp}</span>
                    <span className="text-foreground font-semibold">₹{test.price}</span>
                    {calcDiscount(test.mrp, test.price) > 0 && (
                      <span className="text-emerald-600 font-medium">{calcDiscount(test.mrp, test.price)}% off</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(test)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(test._id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl border border-border/60 p-6 w-full max-w-lg shadow-xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-bold text-foreground">{editId ? 'Edit Test' : 'Add New Test'}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Test Name *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Complete Blood Count" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">MRP (₹) *</label>
                  <Input value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="e.g. 499" type="number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Selling Price (₹) *</label>
                  <Input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 299" type="number" />
                </div>
              </div>
              {form.mrp && form.price && Number(form.mrp) > 0 && (
                <div className="text-xs text-emerald-600 font-medium text-center bg-emerald-500/10 rounded-xl py-1.5">
                  Discount: {calcDiscount(Number(form.mrp), Number(form.price))}% off
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Report Time</label>
                  <select value={form.reportTime} onChange={e => setForm({ ...form, reportTime: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {REPORT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Home Collection Fee (₹)</label>
                  <Input value={form.homeCollectionFee} onChange={e => setForm({ ...form, homeCollectionFee: e.target.value })} placeholder="e.g. 50" type="number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'popular', label: 'Mark as Popular' },
                  { key: 'homeCollection', label: 'Home Collection Available' },
                  { key: 'prescriptionReq', label: 'Prescription Required (Rx)' },
                  { key: 'nablAccredited', label: 'NABL Accredited' },
                ].map(toggle => (
                  <label key={toggle.key} className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-border/40 hover:bg-muted/30">
                    <input type="checkbox" checked={form[toggle.key]} onChange={e => setForm({ ...form, [toggle.key]: e.target.checked })} className="rounded border-border/60" />
                    <span className="text-sm text-foreground">{toggle.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" placeholder="Brief description of the test..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Preparation Instructions</label>
                <textarea value={form.preparation} onChange={e => setForm({ ...form, preparation: e.target.value })} rows={2}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" placeholder="e.g. Fasting required for 8 hours..." />
              </div>
              <Button className="w-full gap-2" onClick={handleSave} disabled={!form.name || !form.price || !form.mrp}>
                <Save className="w-4 h-4" /> {editId ? 'Update Test' : 'Add Test'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

