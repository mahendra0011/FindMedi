import React, { useEffect, useState } from 'react';
import {
  BookOpen, Plus, RefreshCw, Search, Trash2, Pencil, FileText, Send, Eye
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Playbook {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  tags: string[];
  audience: string[];
  status: 'draft' | 'published';
  version: number;
  updatedAt?: string;
}

const CATEGORIES = ['sop', 'script', 'template', 'training', 'policy', 'faq'] as const;

const CATEGORY_META: Record<string, { label: string; tone: string }> = {
  sop: { label: 'SOP', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  script: { label: 'Script', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  template: { label: 'Template', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  training: { label: 'Training', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  policy: { label: 'Policy', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  faq: { label: 'FAQ', tone: 'bg-slate-100 text-slate-700 border-slate-300' },
};

const emptyForm = {
  title: '',
  category: 'sop',
  summary: '',
  body: '',
  tags: '',
  audience: '',
  status: 'draft',
};

export default function Playbooks() {
  const [items, setItems] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewing, setViewing] = useState<Playbook | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      const res = await apiClient.get(`/crm/playbooks?${params.toString()}`);
      setItems(res.data.playbooks || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load playbooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchItems, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, category, status]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  };

  const openEdit = (p: Playbook) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      category: p.category,
      summary: p.summary || '',
      body: p.body,
      tags: (p.tags || []).join(', '),
      audience: (p.audience || []).join(', '),
      status: p.status,
    });
    setIsFormOpen(true);
  };

  const savePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || form.body.trim().length < 10) {
      toast.error('Title and body (min 10 chars) are required');
      return;
    }
    const payload = {
      title: form.title.trim(),
      category: form.category,
      summary: form.summary.trim(),
      body: form.body,
      tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
      audience: form.audience.split(',').map((s) => s.trim()).filter(Boolean),
      status: form.status,
    };
    try {
      if (editId) {
        await apiClient.patch(`/crm/playbooks/${editId}`, payload);
        toast.success('Playbook updated');
      } else {
        await apiClient.post('/crm/playbooks', payload);
        toast.success('Playbook created');
      }
      setIsFormOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save playbook');
    }
  };

  const deletePlaybook = async (p: Playbook) => {
    try {
      await apiClient.delete(`/crm/playbooks/${p.id}`);
      setItems(items.filter((x) => x.id !== p.id));
      toast.success('Playbook deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete playbook');
    }
  };

  const togglePublish = async (p: Playbook) => {
    try {
      await apiClient.patch(`/crm/playbooks/${p.id}`, {
        status: p.status === 'published' ? 'draft' : 'published',
      });
      toast.success(p.status === 'published' ? 'Moved to draft' : 'Published');
      fetchItems();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change status');
    }
  };

  const viewPlaybook = (p: Playbook) => {
    setViewing(p);
    setIsViewOpen(true);
  };

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <Badge variant="outline" className="text-xs uppercase bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200">
            File 24 §4.11 — Playbooks & Knowledge
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <BookOpen className="h-6 w-6 text-primary" />
            Playbooks
          </h1>
          <p className="text-sm text-muted-foreground">
            SOPs, call scripts, templates, training material, policies & FAQs for the ops team.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchItems} className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> New Playbook
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playbooks by title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_META[c]?.label || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading playbooks…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => {
            const meta = CATEGORY_META[p.category] || CATEGORY_META.sop;
            return (
              <Card key={p.id} className="shadow-xs hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] uppercase ${meta.tone}`}>{meta.label}</Badge>
                      <Badge variant={p.status === 'published' ? 'outline' : 'secondary'} className="text-[10px] capitalize">
                        {p.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">v{p.version || 1}</span>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-bold mt-1.5 leading-snug">{p.title}</CardTitle>
                  {p.summary && <CardDescription className="text-xs line-clamp-2">{p.summary}</CardDescription>}
                </CardHeader>
                <CardContent className="mt-auto pt-2 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.tags || []).slice(0, 5).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => viewPlaybook(p)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => togglePublish(p)}
                      title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600"
                      onClick={() => deletePlaybook(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              No playbooks found. Click "New Playbook" to create the first SOP.
            </div>
          )}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Playbook' : 'Create Playbook'}</DialogTitle>
            <DialogDescription>Content edits bump the version. Published items are visible to ops.</DialogDescription>
          </DialogHeader>
          <form onSubmit={savePlaybook} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Title *</Label>
                <Input
                  placeholder="e.g. Partner Onboarding — 5-step checklist"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_META[c]?.label || c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Summary</Label>
                <Input
                  placeholder="One-line description"
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Body *</Label>
                <Textarea
                  placeholder="Steps, scripts, checklists… (markdown-friendly)"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  rows={8}
                  required
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tags (comma-separated)</Label>
                <Input
                  placeholder="onboarding, checklist"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Audience (comma-separated)</Label>
                <Input
                  placeholder="city_manager, field_ops"
                  value={form.audience}
                  onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Save Changes' : 'Create Playbook'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {viewing?.title}
            </DialogTitle>
            <DialogDescription>
              {viewing?.category?.toUpperCase()} • v{viewing?.version || 1} • {viewing?.status}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-border/60 bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">{viewing?.body}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
