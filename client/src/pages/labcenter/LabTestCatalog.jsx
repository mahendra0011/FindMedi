import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TestTube, Search, FlaskConical, Heart, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const categories = ['Blood', 'Urine', 'Imaging', 'Cardiac', 'Other'];

const categoryIcons = { Blood: FlaskConical, Urine: TestTube, Imaging: Activity, Cardiac: Heart, Other: TestTube };

export default function LabTestCatalog() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getLabTests();
        setTests(res.tests || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = tests.filter(t => {
    const ms = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === 'All' || t.category === catFilter;
    return ms && mc;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="font-heading text-2xl font-bold text-foreground">Test Catalog</h1>
          <p className="text-muted-foreground">{filtered.length} tests</p></div>
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
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-lg font-bold text-foreground">₹{test.price}</p>
                    {test.discount > 0 && <p className="text-xs text-success">{test.discount}% off • ₹{test.price - (test.price * test.discount / 100)}</p>}
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
    </div>
  );
}
