import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TestTube, Plus, X, Save, Search, Edit2, CheckCircle, FlaskConical, Activity, Heart, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const testCategories = ['Basic', 'Lab', 'Imaging', 'Cardiac', 'Other'];

const defaultTests = [
  { _id: 't1', name: 'Blood Pressure Check', price: 100, category: 'Basic' },
  { _id: 't2', name: 'Blood Sugar Test', price: 150, category: 'Lab' },
  { _id: 't3', name: 'Full Blood Count', price: 300, category: 'Lab' },
  { _id: 't4', name: 'X-Ray Scan', price: 500, category: 'Imaging' },
  { _id: 't5', name: 'ECG Test', price: 400, category: 'Cardiac' },
  { _id: 't6', name: 'Urine Test', price: 150, category: 'Lab' },
  { _id: 't7', name: 'Lipid Profile', price: 450, category: 'Lab' },
  { _id: 't8', name: 'Thyroid Panel', price: 500, category: 'Lab' },
];

const categoryIcons = {
  Basic: Heart, Lab: FlaskConical, Imaging: Activity, Cardiac: Activity, Other: TestTube,
};

export default function ClinicTests() {
  const { user } = useAuth();
  const [tests, setTests] = useState(() => {
    const stored = localStorage.getItem('medicore_clinic_tests');
    return stored ? JSON.parse(stored) : defaultTests;
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Lab');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem('medicore_clinic_tests', JSON.stringify(tests));
  }, [tests]);

  const filtered = tests.filter(t => {
    const m = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const c = categoryFilter === 'All' || t.category === categoryFilter;
    return m && c;
  });

  const handleSave = async () => {
    if (!name || !price) return;
    setSaving(true);
    try {
      if (editTest) {
        setTests(prev => prev.map(t => t._id === editTest._id ? { ...t, name, price: Number(price), category } : t));
      } else {
        setTests(prev => [{ _id: `ct_${Date.now()}`, name, price: Number(price), category }, ...prev]);
      }
      setShowForm(false);
      setEditTest(null);
      setName('');
      setPrice('');
      setCategory('Lab');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleEdit = (test) => {
    setEditTest(test);
    setName(test.name);
    setPrice(String(test.price));
    setCategory(test.category);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setTests(prev => prev.filter(t => t._id !== id));
  };

  const openNewForm = () => {
    setEditTest(null);
    setName('');
    setPrice('');
    setCategory('Lab');
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {testCategories.map(cat => (
          <div key={cat} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{tests.filter(t => t.category === cat).length}</p>
            <p className="text-xs text-muted-foreground">{cat}</p>
          </div>
        ))}
      </div>

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
                      <p className="text-lg font-bold text-primary mt-1">Rs {test.price}</p>
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
                <div className="mt-3">
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">{test.category}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editTest ? 'Edit Test' : 'Add New Test'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Test Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Blood Pressure Check" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Price (Rs) *</label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 100" min={0} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {testCategories.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!name || !price || saving}>
                <Save className="w-4 h-4" /> {editTest ? 'Update' : 'Add Test'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
