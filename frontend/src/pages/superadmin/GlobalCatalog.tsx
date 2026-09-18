import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, FlaskConical, Pill, AlertTriangle, CheckCircle, X, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const TABS = [
  { id: 'tests', label: 'Tests', icon: FlaskConical },
  { id: 'medicines', label: 'Medicines', icon: Pill },
  { id: 'categories', label: 'Categories', icon: Layers },
];

export default function GlobalCatalog() {
  const [tab, setTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dupTests, setDupTests] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, mRes, cRes] = await Promise.all([
        api.getTests({}).catch(() => ({ tests: [] })),
        api.getMedicines({ limit: 200 }).catch(() => ({ data: [] })),
        api.getCategories({}).catch(() => ({ categories: [] })),
      ]);
      const testList = tRes.tests || [];
      const medList = mRes.data || [];
      const catList = cRes.categories || [];
      setTests(testList);
      setMedicines(medList);
      setCategories(catList);

      const seen = {};
      const dups = [];
      testList.forEach(t => {
        const key = t.name?.toLowerCase().trim();
        if (seen[key]) { dups.push({ a: seen[key], b: t }); }
        else seen[key] = t;
      });
      setDupTests(dups);
    } catch { toast.error('Failed to load catalog'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredTests = tests.filter(t =>
    !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMeds = medicines.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCats = categories.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Global Catalog Oversight</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tests, medicines & categories across the platform</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === 'tests' && (
        <>
          {dupTests.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  {dupTests.length} potential duplicate test(s) found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dupTests.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm">
                    <div>
                      <span className="font-medium text-foreground">{d.a.name}</span>
                      <span className="text-muted-foreground mx-2">↔</span>
                      <span className="font-medium text-foreground">{d.b.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">(₹{d.a.price} / ₹{d.b.price})</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Category: {d.a.category || 'N/A'}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">All Tests ({filteredTests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Price</th>
                      <th className="pb-2 font-medium">MRP</th>
                      <th className="pb-2 font-medium">Popular</th>
                      <th className="pb-2 font-medium">Home Collection</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((t, i) => (
                      <tr key={t._id || i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 font-medium text-foreground">{t.name}</td>
                        <td className="py-2.5"><Badge variant="outline" className="text-xs">{t.category || 'N/A'}</Badge></td>
                        <td className="py-2.5">₹{t.price?.toLocaleString() || '—'}</td>
                        <td className="py-2.5">₹{t.mrp?.toLocaleString() || '—'}</td>
                        <td className="py-2.5">{t.popular ? <CheckCircle className="w-4 h-4 text-success" /> : '—'}</td>
                        <td className="py-2.5">{t.homeCollection ? <CheckCircle className="w-4 h-4 text-success" /> : '—'}</td>
                      </tr>
                    ))}
                    {filteredTests.length === 0 && (
                      <tr><td colSpan="6" className="py-8 text-center text-muted-foreground">No tests found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'medicines' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">All Medicines ({filteredMeds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Stock</th>
                    <th className="pb-2 font-medium">Prescription Required</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeds.map((m, i) => (
                    <tr key={m._id || i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 font-medium text-foreground">{m.name}</td>
                      <td className="py-2.5"><Badge variant="outline" className="text-xs">{m.category || 'N/A'}</Badge></td>
                      <td className="py-2.5">₹{(m.price || m.sellingPrice || 0).toLocaleString()}</td>
                      <td className="py-2.5">
                        <Badge className={`text-xs ${(m.stock || 0) > 10 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                          {m.stock || 0} units
                        </Badge>
                      </td>
                      <td className="py-2.5">{m.prescriptionRequired ? <CheckCircle className="w-4 h-4 text-success" /> : '—'}</td>
                    </tr>
                  ))}
                  {filteredMeds.length === 0 && (
                    <tr><td colSpan="5" className="py-8 text-center text-muted-foreground">No medicines found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCats.map((c, i) => (
            <Card key={c._id || i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{c.type || 'General'}</Badge>
                  </div>
                  {c.isActive === false && (
                    <Badge className="bg-destructive/10 text-destructive text-xs">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCats.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">No categories found</div>
          )}
        </div>
      )}
    </div>
  );
}
