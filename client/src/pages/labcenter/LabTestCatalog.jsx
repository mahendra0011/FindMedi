import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TestTube, Plus, X, Save, Search, Edit2, FlaskConical, Heart, Activity, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const categories = ['Blood', 'Urine', 'Imaging', 'Cardiac', 'Other'];

const defaultTests = [
  { _id: 't1', name: 'Complete Blood Count (CBC)', category: 'Blood', price: 300, discount: 0, reportTime: '6 hrs', prescriptionReq: false, homeCollection: true },
  { _id: 't2', name: 'Blood Sugar (Fasting)', category: 'Blood', price: 150, discount: 0, reportTime: '4 hrs', prescriptionReq: false, homeCollection: true },
  { _id: 't3', name: 'Lipid Profile', category: 'Blood', price: 450, discount: 10, reportTime: '8 hrs', prescriptionReq: false, homeCollection: true },
  { _id: 't4', name: 'Thyroid Panel (T3,T4,TSH)', category: 'Blood', price: 500, discount: 0, reportTime: '12 hrs', prescriptionReq: false, homeCollection: true },
  { _id: 't5', name: 'Urine Routine & Microscopy', category: 'Urine', price: 200, discount: 0, reportTime: '4 hrs', prescriptionReq: false, homeCollection: true },
  { _id: 't6', name: 'X-Ray Chest PA View', category: 'Imaging', price: 500, discount: 0, reportTime: '2 hrs', prescriptionReq: true, homeCollection: false },
  { _id: 't7', name: 'ECG (12 Lead)', category: 'Cardiac', price: 400, discount: 15, reportTime: '30 min', prescriptionReq: false, homeCollection: false },
  { _id: 't8', name: 'MRI Brain (Plain)', category: 'Imaging', price: 3500, discount: 0, reportTime: '24 hrs', prescriptionReq: true, homeCollection: false },
  { _id: 't9', name: 'CT Abdomen (Contrast)', category: 'Imaging', price: 2500, discount: 5, reportTime: '12 hrs', prescriptionReq: true, homeCollection: false },
  { _id: 't10', name: 'Liver Function Test (LFT)', category: 'Blood', price: 350, discount: 0, reportTime: '8 hrs', prescriptionReq: false, homeCollection: true },
];

const categoryIcons = { Blood: FlaskConical, Urine: TestTube, Imaging: Activity, Cardiac: Heart, Other: TestTube };

export default function LabTestCatalog() {
  const [tests, setTests] = useState(() => {
    const stored = localStorage.getItem('medicore_labcenter_tests');
    return stored ? JSON.parse(stored) : defaultTests;
  });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editTest, setEditTest] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Blood');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [reportTime, setReportTime] = useState('');
  const [prescriptionReq, setPrescriptionReq] = useState(false);
  const [homeCollection, setHomeCollection] = useState(true);

  useEffect(() => { localStorage.setItem('medicore_labcenter_tests', JSON.stringify(tests)); }, [tests]);

  const filtered = tests.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === 'All' || t.category === catFilter;
    return ms && mc;
  });

  const handleSave = () => {
    if (!name || !price) return;
    if (editTest) {
      setTests(prev => prev.map(t => t._id === editTest._id ? { ...t, name, category, price: Number(price), discount: Number(discount) || 0, reportTime, prescriptionReq, homeCollection } : t));
    } else {
      setTests(prev => [{ _id: `tc_${Date.now()}`, name, category, price: Number(price), discount: Number(discount) || 0, reportTime, prescriptionReq, homeCollection }, ...prev]);
    }
    setShowForm(false);
    setEditTest(null);
    setName(''); setPrice(''); setDiscount(''); setReportTime(''); setCategory('Blood');
  };

  const openEdit = (t) => {
    setEditTest(t); setName(t.name); setCategory(t.category); setPrice(String(t.price));
    setDiscount(String(t.discount || 0)); setReportTime(t.reportTime || ''); setPrescriptionReq(t.prescriptionReq || false);
    setHomeCollection(t.homeCollection !== false); setShowForm(true);
  };

  const openNew = () => {
    setEditTest(null); setName(''); setPrice(''); setDiscount(''); setReportTime('');
    setCategory('Blood'); setPrescriptionReq(false); setHomeCollection(true); setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="font-heading text-2xl font-bold text-foreground">Test Catalog</h1>
          <p className="text-muted-foreground">{filtered.length} tests</p></div>
        <Button className="gap-2" onClick={openNew}><Plus className="w-4 h-4" /> Add Test</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map(c => (
          <div key={c} className="bg-card rounded-xl border border-border/60 p-4 text-center">
            <p className="text-2xl font-bold">{tests.filter(t => t.category === c).length}</p>
            <p className="text-xs text-muted-foreground">{c} Tests</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests..." className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...categories].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${catFilter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{c}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
          <TestTube className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-lg">No tests found</p>
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
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="w-6 h-6 text-primary" /></div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">{test.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{test.category}</Badge>
                        {test.homeCollection && <Badge variant="outline" className="text-[10px] text-success">Home</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(test)}><Edit2 className="w-4 h-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-lg font-bold text-foreground">Rs {test.price}</p>
                    {test.discount > 0 && <p className="text-xs text-success">{test.discount}% off • Rs {test.price - (test.price * test.discount / 100)}</p>}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{test.reportTime || 'N/A'}</p>
                    {test.prescriptionReq && <p className="text-warning">Rx required</p>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editTest ? 'Edit Test' : 'Add New Test'}</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block">Test Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Complete Blood Count" /></div>
              <div><label className="text-sm font-medium mb-1.5 block">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${category === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium mb-1.5 block">Price (Rs) *</label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="300" min={0} /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Discount %</label>
                  <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" min={0} max={100} /></div>
              </div>
              <div><label className="text-sm font-medium mb-1.5 block">Report Time</label>
                <Input value={reportTime} onChange={e => setReportTime(e.target.value)} placeholder="e.g. 6 hrs" /></div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prescriptionReq} onChange={e => setPrescriptionReq(e.target.checked)} className="rounded border-border" />
                  Prescription Required
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={homeCollection} onChange={e => setHomeCollection(e.target.checked)} className="rounded border-border" />
                  Home Collection Available
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!name || !price}><Save className="w-4 h-4" /> {editTest ? 'Update' : 'Add Test'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
