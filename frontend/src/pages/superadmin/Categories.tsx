import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Tags, AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const FALLBACK_TYPES = ['test', 'medicine', 'department', 'service'];
const EMPTY_FORM = {
  name: '',
  type: 'test',
  code: '',
  aliases: '',
  description: '',
  displayOrder: 0,
  tier: 'T1',
  adClaimsRestricted: false,
  isSensitive: false,
};

type CategoryRow = {
  _id: string;
  name: string;
  type: string;
  code?: string;
  aliases?: string[];
  description?: string;
  displayOrder?: number;
  tier?: string;
  adClaimsRestricted?: boolean;
  isSensitive?: boolean;
  isActive?: boolean;
};

function CategoriesTab() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('test');
  const [types, setTypes] = useState(FALLBACK_TYPES);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicCategories()
      .then(res => { if (Array.isArray(res?.types) && res.types.length) setTypes(res.types); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCategories({ type: typeFilter });
      setCategories(res.categories || []);
    } catch { toast.error('Failed to load categories'); }
    setLoading(false);
  }, [typeFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [typeFilter]);

  // Duplicate detection for taxonomy hygiene (§17)
  const duplicateAlerts = React.useMemo(() => {
    const nameMap = new Map<string, number>();
    categories.forEach((c) => {
      const n = (c.name || '').trim().toLowerCase();
      if (n) nameMap.set(n, (nameMap.get(n) || 0) + 1);
    });
    return Array.from(nameMap.entries()).filter(([_, count]) => count > 1).map(([name]) => name);
  }, [categories]);

  const buildPayload = () => {
    const payload: {
      name: string; type: string; description: string; displayOrder: number;
      aliases: string[]; tier: string; adClaimsRestricted: boolean; isSensitive: boolean; code?: string;
    } = {
      name: form.name,
      type: form.type,
      description: form.description,
      displayOrder: Number(form.displayOrder) || 0,
      aliases: form.aliases.split(',').map(a => a.trim()).filter(Boolean),
      tier: form.tier || 'T1',
      adClaimsRestricted: Boolean(form.adClaimsRestricted),
      isSensitive: Boolean(form.isSensitive),
    };
    if (!editId && form.code.trim()) payload.code = form.code.trim();
    return payload;
  };

  const handleSave = async () => {
    if (!form.name) return;
    try {
      if (editId) await api.updateCategory(editId, buildPayload());
      else await api.createCategory(buildPayload());
      setShowForm(false);
      setForm({ ...EMPTY_FORM, type: typeFilter });
      setEditId(null);
      load();
    } catch { toast.error(editId ? 'Failed to update category' : 'Failed to create category'); }
  };

  const handleEdit = (cat: CategoryRow) => {
    setForm({
      name: cat.name,
      type: cat.type,
      code: cat.code || '',
      aliases: (cat.aliases || []).join(', '),
      description: cat.description || '',
      displayOrder: cat.displayOrder || 0,
      tier: cat.tier || 'T1',
      adClaimsRestricted: Boolean(cat.adClaimsRestricted),
      isSensitive: Boolean(cat.isSensitive),
    });
    setEditId(cat._id);
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1 overflow-x-auto max-w-[70%]">
          {types.map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setForm({ ...EMPTY_FORM, type: t }); }} data-active={typeFilter === t}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${typeFilter === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>{t.replace(/_/g, ' ')}</button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ ...EMPTY_FORM, type: typeFilter }); }}>{showForm ? 'Cancel' : 'Add Category'}</Button>
      </div>

      {duplicateAlerts.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Taxonomy Hygiene: Potential duplicate category names found: <strong>{duplicateAlerts.join(', ')}</strong></span>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl border border-border/60 p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Category name" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Aliases (comma separated)</label>
            <Input value={form.aliases} onChange={e => setForm({ ...form, aliases: e.target.value })} placeholder="e.g. Paediatrics, Pediatrics" />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground mb-1 block">Code {editId && '(immutable)'}</label>
            <Input value={form.code} disabled={!!editId} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="SPEC.CARDIO" />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground mb-1 block">Tier</label>
            <select
              value={form.tier}
              onChange={e => setForm({ ...form, tier: e.target.value })}
              className="w-full text-xs h-9 rounded-md border border-input bg-background px-2"
            >
              <option value="T1">T1 (Clinical)</option>
              <option value="T2">T2 (Allied)</option>
              <option value="T3">T3 (Wellness)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Description</label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
          </div>
          <div className="w-20">
            <label className="text-xs text-muted-foreground mb-1 block">Order</label>
            <Input type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.adClaimsRestricted}
                onChange={e => setForm({ ...form, adClaimsRestricted: e.target.checked })}
                className="rounded"
              />
              <span className="text-muted-foreground">adClaimsRestricted</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSensitive}
                onChange={e => setForm({ ...form, isSensitive: e.target.checked })}
                className="rounded"
              />
              <span className="text-muted-foreground">Sensitive 🔒</span>
            </label>
          </div>
          <Button onClick={handleSave} className="shrink-0">{editId ? 'Update' : 'Create'}</Button>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories..." className="pl-10" />
      </div>
      {categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-dashed">
          <Tags className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No categories found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card rounded-xl border border-border/60 p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground text-sm">{c.name}</h4>
                <div className="flex items-center gap-1">
                  {c.tier && <Badge variant="secondary" className="text-[10px]">{c.tier}</Badge>}
                  <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                </div>
              </div>
              {c.code && <p className="text-[11px] font-mono text-primary/80 mb-1">{c.code}</p>}
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              {Array.isArray(c.aliases) && c.aliases.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-1">Also: {c.aliases.join(', ')}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {c.adClaimsRestricted && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] border-amber-500/30">
                    Claims Restricted
                  </Badge>
                )}
                {c.isSensitive && (
                  <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] border-purple-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Sensitive 🔒
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>Order: {c.displayOrder || 0}</span>
                <span className={c.isActive ? 'text-success' : 'text-destructive'}>{c.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleEdit(c)}>Edit</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={async () => { if (!confirm('Delete this category?')) return; try { await api.deleteCategory(c._id); load(); } catch { toast.error('Failed to delete'); } }}>Delete</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoriesTab;
