import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TestTube, Plus, X, Save, Search, Edit2, FlaskConical, Activity, Heart, Home, Eye, Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const testCategories = ['Basic', 'Lab', 'Imaging', 'Cardiac', 'Other'];
const DEPARTMENTS = ['Pathology', 'Radiology', 'Cardiology', 'Health Packages'];
const REPORT_TIMES = ['30 mins', '1 hr', '2 hrs', '6 hrs', '12 hrs', '24 hrs', '48 hrs', '72 hrs'];

const defaultTests = [
  { _id: 't1', name: 'Blood Pressure Check', price: 100, mrp: 150, category: 'Basic', department: 'Pathology', reportTime: '30 mins' },
  { _id: 't2', name: 'Blood Sugar Test', price: 150, mrp: 200, category: 'Lab', department: 'Pathology', reportTime: '1 hr' },
  { _id: 't3', name: 'Full Blood Count', price: 300, mrp: 400, category: 'Lab', department: 'Pathology', reportTime: '6 hrs' },
  { _id: 't4', name: 'X-Ray Scan', price: 500, mrp: 700, category: 'Imaging', department: 'Radiology', reportTime: '24 hrs' },
  { _id: 't5', name: 'ECG Test', price: 400, mrp: 500, category: 'Cardiac', department: 'Cardiology', reportTime: '30 mins' },
  { _id: 't6', name: 'Urine Test', price: 150, mrp: 200, category: 'Lab', department: 'Pathology', reportTime: '2 hrs' },
  { _id: 't7', name: 'Lipid Profile', price: 450, mrp: 600, category: 'Lab', department: 'Pathology', reportTime: '12 hrs' },
  { _id: 't8', name: 'Thyroid Panel', price: 500, mrp: 650, category: 'Lab', department: 'Pathology', reportTime: '24 hrs' },
];

const categoryIcons = {
  Basic: Heart, Lab: FlaskConical, Imaging: Activity, Cardiac: Activity, Other: TestTube,
};

export default function ClinicTests() {
  const [tests, setTests] = useState(defaultTests);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'Lab', department: 'Pathology', price: '', mrp: '',
    reportTime: '24 hrs', prescriptionReq: false, homeCollection: false,
    homeCollectionFee: '', popular: false, nablAccredited: false, description: '', preparation: '',
  });

  const loadTests = useCallback(async () => {
    try {
      const res = await api.getTests({});
      const list = Array.isArray(res) ? res : res?.tests || [];
      if (list.length > 0) {
        setTests(list.map(t => ({
          _id: t._id,
          name: t.name,
          price: t.price,
          mrp: t.mrp || t.price,
          category: t.category || t.department || 'Lab',
          department: t.department || 'Pathology',
          reportTime: t.reportTime || '24 hrs',
          prescriptionReq: t.prescriptionReq || false,
          homeCollection: t.homeCollection || false,
          homeCollectionFee: t.homeCollectionFee || 0,
          popular: t.popular || false,
          nablAccredited: t.nablAccredited || false,
          description: t.description || '',
          preparation: t.preparation || '',
        })));
      }
    } catch { console.warn('Failed to load tests'); }
  }, []);

  useEffect(() => { loadTests(); }, [loadTests]);

  const filtered = tests.filter(t => {
    const m = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const c = categoryFilter === 'All' || t.category === categoryFilter;
    const d = !deptFilter || t.department === deptFilter;
    return m && c && d;
  });

  const stats = {
    total: tests.length,
    popular: tests.filter(t => t.popular).length,
    homeCollection: tests.filter(t => t.homeCollection).length,
    prescriptionReq: tests.filter(t => t.prescriptionReq).length,
    categories: new Set(tests.map(t => t.category)).size,
  };

  const resetForm = () => {
    setForm({
      name: '', category: 'Lab', department: 'Pathology', price: '', mrp: '',
      reportTime: '24 hrs', prescriptionReq: false, homeCollection: false,
      homeCollectionFee: '', popular: false, nablAccredited: false, description: '', preparation: '',
    });
    setEditTest(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      const testData = {
        name: form.name,
        price: Number(form.price),
        mrp: Number(form.mrp) || Number(form.price),
        category: form.category,
        department: form.department,
        reportTime: form.reportTime,
        prescriptionReq: form.prescriptionReq,
        homeCollection: form.homeCollection,
        homeCollectionFee: Number(form.homeCollectionFee) || 0,
        popular: form.popular,
        nablAccredited: form.nablAccredited,
        description: form.description,
        preparation: form.preparation,
        discount: form.mrp && form.price ? Math.round((1 - Number(form.price) / Number(form.mrp)) * 100) : 0,
      };
      if (editTest) {
        await api.updateTest(editTest._id, testData);
        setTests(prev => prev.map(t => t._id === editTest._id ? { ...t, ...testData } : t));
        toast.success('Test updated');
      } else {
        const res = await api.createTest(testData);
        const newTest = res || { _id: `ct_${crypto.randomUUID()}`, ...testData };
        setTests(prev => [newTest, ...prev]);
        toast.success('Test added');
      }
      resetForm();
    } catch (e) { toast.error(e.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleEdit = (test) => {
    setEditTest(test);
    setForm({
      name: test.name,
      category: test.category,
      department: test.department || 'Pathology',
      price: String(test.price || ''),
      mrp: String(test.mrp || ''),
      reportTime: test.reportTime || '24 hrs',
      prescriptionReq: test.prescriptionReq || false,
      homeCollection: test.homeCollection || false,
      homeCollectionFee: test.homeCollectionFee != null ? String(test.homeCollectionFee) : '',
      popular: test.popular || false,
      nablAccredited: test.nablAccredited || false,
      description: test.description || '',
      preparation: test.preparation || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this test?')) return;
    try {
      await api.deleteTest(id);
      setTests(prev => prev.filter(t => t._id !== id));
      toast.success('Test deleted');
    } catch (e) { toast.error(e.message || 'Failed to delete'); }
  };

  const calcDiscount = (mrp, price) => {
    if (!mrp || !price) return 0;
    return Math.round((1 - price / mrp) * 100);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clinic Test Management</h1>
          <p className="text-muted-foreground">Manage tests patients can directly book</p>
        </div>
        <Button className="gap-2" onClick={openNewForm}><Plus className="w-4 h-4" /> Add Test</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Tests', value: stats.total },
          { label: 'Popular', value: stats.popular },
          { label: 'Home Collection', value: stats.homeCollection },
          { label: 'Prescription Req.', value: stats.prescriptionReq },
          { label: 'Categories', value: stats.categories },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold text-foreground mb-1">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...testCategories].map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${categoryFilter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {c}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <TestTube className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No tests found</p>
          <p className="text-sm text-muted-foreground/70">Add your first clinic test</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((test, i) => {
            const Icon = categoryIcons[test.category] || TestTube;
            const discount = calcDiscount(test.mrp, test.price);
            return (
              <motion.div key={test._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{test.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">{test.category}</span>
                        {test.department && <span className="text-[10px] text-muted-foreground">{test.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(test)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDelete(test._id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {test.prescriptionReq && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded"><Lock className="w-2.5 h-2.5" /> Rx</span>
                  )}
                  {test.popular && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded"><TrendingUp className="w-2.5 h-2.5" /> Popular</span>
                  )}
                  {test.nablAccredited && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">NABL</span>
                  )}
                  {test.homeCollection && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded"><Home className="w-2.5 h-2.5" /> Home</span>
                  )}
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary">₹{test.price}</p>
                      {test.mrp > test.price && (
                        <p className="text-xs text-muted-foreground line-through">₹{test.mrp}</p>
                      )}
                    </div>
                    {discount > 0 && (
                      <p className="text-xs text-success font-medium">{discount}% off</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="flex items-center gap-1 justify-end"><Eye className="w-3 h-3" /> {test.reportTime || 'N/A'}</p>
                    {test.homeCollectionFee > 0 && <p className="text-primary">+₹{test.homeCollectionFee} home</p>}
                  </div>
                </div>

                {test.description && (
                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{test.description}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-foreground">{editTest ? 'Edit Test' : 'Add New Test'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Test Name *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Blood Pressure Check" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Department</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {testCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">MRP (Rs) *</label>
                  <Input type="number" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="e.g. 500" min={0} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Selling Price (Rs) *</label>
                  <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 350" min={0} />
                </div>
              </div>
              {form.mrp && form.price && Number(form.mrp) > 0 && Number(form.price) > 0 && (
                <div className="text-xs text-emerald-600 font-medium text-center bg-emerald-500/10 rounded-xl py-1.5">
                  Discount: {calcDiscount(Number(form.mrp), Number(form.price))}% off
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Report Time</label>
                  <select value={form.reportTime} onChange={e => setForm({ ...form, reportTime: e.target.value })} className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm">
                    {REPORT_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Home Collection Fee (Rs)</label>
                  <Input type="number" value={form.homeCollectionFee} onChange={e => setForm({ ...form, homeCollectionFee: e.target.value })} placeholder="e.g. 50" min={0} />
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
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" placeholder="Brief description of the test..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Preparation Instructions</label>
                <textarea value={form.preparation} onChange={e => setForm({ ...form, preparation: e.target.value })} rows={2}
                  className="w-full bg-card border border-border/60 rounded-xl px-3 py-2 text-sm resize-none" placeholder="e.g. Fasting required for 8 hours..." />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={resetForm}>Cancel</Button>
                <Button className="flex-1 gap-2" onClick={handleSave} disabled={!form.name || !form.price || saving}>
                  <Save className="w-4 h-4" /> {editTest ? 'Update' : 'Add Test'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}