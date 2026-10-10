import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, FlaskConical, Pill, AlertTriangle, CheckCircle, X, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataGrid } from '@/components/ui/System';
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
      const testList = Array.isArray(tRes) ? tRes : (tRes?.tests || tRes?.data || []);
      const medList = Array.isArray(mRes) ? mRes : (mRes?.data || mRes?.medicines || []);
      const catList = Array.isArray(cRes) ? cRes : (cRes?.categories || cRes?.data || []);
      setTests(testList);
      setMedicines(medList);
      setCategories(catList);

      const seen = {};
      const dups = [];
      (Array.isArray(testList) ? testList : []).forEach(t => {
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
        <Input placeholder="Search..." aria-label="Search catalog" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* The page's ONE search box spans all three tabs, so the grid's own
          filter is hidden; the rows it is handed are already filtered. */}
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
              <DataGrid
                columns={[
                  { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-foreground">{v}</span> },
                  { key: 'category', label: 'Category', render: (v) => <Badge variant="outline" className="text-xs">{v || 'N/A'}</Badge> },
                  { key: 'price', label: 'Price', render: (v) => <>₹{v?.toLocaleString() || '—'}</> },
                  { key: 'mrp', label: 'MRP', render: (v) => <>₹{v?.toLocaleString() || '—'}</> },
                  { key: 'popular', label: 'Popular', render: (v) => (v ? <CheckCircle className="w-4 h-4 text-success" /> : '—') },
                  { key: 'homeCollection', label: 'Home Collection', render: (v) => (v ? <CheckCircle className="w-4 h-4 text-success" /> : '—') },
                ]}
                rows={filteredTests.map((t, i) => ({ ...t, _id: t._id || `test-${i}` }))}
                rowKey="_id"
                empty="No tests found"
                showSearch={false}
                manualPagination
              />
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
            <DataGrid
              columns={[
                { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-foreground">{v}</span> },
                { key: 'category', label: 'Category', render: (v) => <Badge variant="outline" className="text-xs">{v || 'N/A'}</Badge> },
                { key: 'price', label: 'Price', render: (v, m) => <>₹{(v || m.sellingPrice || 0).toLocaleString()}</> },
                {
                  key: 'stock', label: 'Stock',
                  render: (v) => (
                    <Badge className={`text-xs ${(v || 0) > 10 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {v || 0} units
                    </Badge>
                  ),
                },
                { key: 'prescriptionRequired', label: 'Prescription Required', render: (v) => (v ? <CheckCircle className="w-4 h-4 text-success" /> : '—') },
              ]}
              rows={filteredMeds.map((m, i) => ({ ...m, _id: m._id || `med-${i}` }))}
              rowKey="_id"
              empty="No medicines found"
              showSearch={false}
              manualPagination
            />
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
