import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, X, Save, Gift, Percent, Beaker, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export default function LabPackages() {
  const [packages, setPackages] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pkgRes, testRes] = await Promise.all([
          api.getLabPackages({}),
          api.getLabTests(),
        ]);
        setPackages(pkgRes.packages || []);
        setTests(testRes.tests || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const totalOriginal = selectedTests.reduce((sum, tid) => {
    const t = tests.find(tt => tt._id === tid);
    return sum + (t?.price || 0);
  }, 0);

  const handleSave = async () => {
    if (!name || selectedTests.length === 0 || !price) return;
    setSaving(true);
    try {
      const pkg = { name, description, tests: selectedTests, discount: Number(discount), price: Number(price) };
      if (editing) {
        const updated = await api.updateLabPackage(editing._id, pkg);
        setPackages(prev => prev.map(p => p._id === editing._id ? updated : p));
      } else {
        const created = await api.createLabPackage(pkg);
        setPackages(prev => [created, ...prev]);
      }
      setShowForm(false);
      setEditing(null);
      setName(''); setDescription(''); setSelectedTests([]); setDiscount(0); setPrice('');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    setName(pkg.name); setDescription(pkg.description || ''); setSelectedTests(pkg.tests); setDiscount(pkg.discount); setPrice(String(pkg.price));
    setShowForm(true);
  };

  const toggleTest = (tid) => {
    setSelectedTests(prev => prev.includes(tid) ? prev.filter(t => t !== tid) : [...prev, tid]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Health Packages</h1>
          <p className="text-muted-foreground">{packages.length} package(s)</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(null); setName(''); setDescription(''); setSelectedTests([]); setDiscount(0); setPrice(''); setShowForm(true); }}><Plus className="w-4 h-4" /> Create Package</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, i) => {
          const orig = pkg.tests.reduce((s, tid) => { const t = tests.find(tt => tt._id === tid); return s + (t?.price || 0); }, 0);
          return (
            <motion.div key={pkg._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-6 hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary/10 px-3 py-1 rounded-bl-2xl">
                <span className="text-xs font-bold text-primary">{pkg.discount}% OFF</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center mb-4">
                <Gift className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground">{pkg.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Beaker className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{pkg.tests.length} test(s)</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm line-through text-muted-foreground">Rs {orig.toLocaleString()}</span>
                <span className="text-xl font-bold text-foreground">Rs {pkg.price.toLocaleString()}</span>
              </div>
              <div className="flex gap-1 mt-4 flex-wrap">
                {pkg.tests.map(tid => {
                  const t = tests.find(tt => tt._id === tid);
                  return t ? <Badge key={tid} variant="outline" className="text-xs">{t.name}</Badge> : null;
                })}
              </div>
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(pkg)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">{editing ? 'Edit Package' : 'Create Package'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Package Name *</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Full Body Checkup" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Tests * ({selectedTests.length} selected)</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {tests.map(t => (
                    <button key={t._id} onClick={() => toggleTest(t._id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${selectedTests.includes(t._id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      <Beaker className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t.name}</span>
                      <span className="ml-auto text-xs opacity-70">Rs {t.price}</span>
                    </button>
                  ))}
                </div>
              </div>
              {totalOriginal > 0 && (
                <p className="text-sm text-muted-foreground">Original total: Rs {totalOriginal.toLocaleString()}</p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> Discount %</label>
                  <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min={0} max={100} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Package Price *</label>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2999" min={0} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={!name || selectedTests.length === 0 || !price || saving}>
                <Save className="w-4 h-4" /> {editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
