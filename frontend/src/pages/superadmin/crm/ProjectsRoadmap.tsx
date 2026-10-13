import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, RefreshCw, Trash2, Pencil, Milestone, Flag, History, X
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Decision { decision: string; why?: string; at?: string; by?: string }
interface Project {
  id: string;
  title: string;
  kind: string;
  phase?: string;
  status: string;
  ownerId?: string | { name?: string; email?: string } | null;
  startAt?: string | null;
  targetAt?: string | null;
  progress: number;
  externalRef?: string;
  tags?: string[];
  notes?: string;
  decisionLog?: Decision[];
}

const STATUSES = ['planned', 'in_progress', 'blocked', 'done', 'cancelled'] as const;

const STATUS_META: Record<string, { label: string; tone: string }> = {
  planned: { label: 'Planned', tone: 'bg-slate-100 text-slate-700 border-slate-300' },
  in_progress: { label: 'In Progress', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  blocked: { label: 'Blocked', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  done: { label: 'Done', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const emptyForm = {
  title: '',
  kind: 'project',
  phase: '',
  status: 'planned',
  progress: 0,
  targetAt: '',
  externalRef: '',
  notes: '',
};

export default function ProjectsRoadmap() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [decisionProject, setDecisionProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [decisionForm, setDecisionForm] = useState({ decision: '', why: '' });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const url = statusFilter && statusFilter !== 'all' ? `/crm/projects?status=${statusFilter}` : '/crm/projects';
      const res = await apiClient.get(url);
      setProjects(res.data.projects || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [statusFilter]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setIsFormOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditId(p.id);
    setForm({
      title: p.title,
      kind: p.kind,
      phase: p.phase || '',
      status: p.status,
      progress: p.progress || 0,
      targetAt: p.targetAt ? String(p.targetAt).slice(0, 10) : '',
      externalRef: p.externalRef || '',
      notes: p.notes || '',
    });
    setIsFormOpen(true);
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      phase: form.phase,
      status: form.status,
      progress: Number(form.progress) || 0,
      targetAt: form.targetAt || null,
      externalRef: form.externalRef,
      notes: form.notes,
    };
    try {
      if (editId) {
        await apiClient.patch(`/crm/projects/${editId}`, payload);
        toast.success('Project updated');
      } else {
        await apiClient.post('/crm/projects', payload);
        toast.success('Project created');
      }
      setIsFormOpen(false);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    }
  };

  const deleteProject = async (p: Project) => {
    try {
      await apiClient.delete(`/crm/projects/${p.id}`);
      setProjects(projects.filter((x) => x.id !== p.id));
      toast.success('Project deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const advanceStatus = async (p: Project) => {
    const idx = STATUSES.indexOf(p.status as any);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    try {
      await apiClient.patch(`/crm/projects/${p.id}`, { status: next });
      setProjects(projects.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      toast.success(`Status → ${STATUS_META[next].label}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openDecisions = (p: Project) => {
    setDecisionProject(p);
    setDecisionForm({ decision: '', why: '' });
    setIsDecisionOpen(true);
  };

  const addDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionProject) return;
    if (decisionForm.decision.trim().length < 3) { toast.error('Decision text required (min 3 chars)'); return; }
    try {
      const res = await apiClient.post(`/crm/projects/${decisionProject.id}/decisions`, {
        decision: decisionForm.decision.trim(),
        why: decisionForm.why.trim(),
      });
      toast.success(`Decision logged (#${res.data.decisions})`);
      setDecisionForm({ decision: '', why: '' });
      fetchProjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to log decision');
    }
  };

  const ownerName = (p: Project) => {
    const o = p.ownerId as any;
    if (o && typeof o === 'object') return o.name || o.email || '';
    return '';
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading roadmap…</div>;

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <Badge variant="outline" className="text-xs uppercase bg-sky-50 text-sky-700 dark:bg-sky-950/40 border-sky-200">
            File 24 §4.10 — Projects & Roadmap
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <ClipboardList className="h-6 w-6 text-primary" />
            Projects & Roadmap
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform initiatives, releases & ops tasks — with a "decision + why" log for leadership.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchProjects} className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const meta = STATUS_META[p.status] || STATUS_META.planned;
          return (
            <Card key={p.id} className="shadow-xs hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] uppercase ${meta.tone}`}>{meta.label}</Badge>
                    <Badge variant="secondary" className="text-[10px] capitalize">{p.kind.replace('_', ' ')}</Badge>
                    {p.externalRef && <span className="text-[10px] text-muted-foreground font-mono">{p.externalRef}</span>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-500 hover:text-rose-600"
                    onClick={() => deleteProject(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardTitle className="text-sm font-bold mt-1.5 leading-snug">{p.title}</CardTitle>
                {p.phase && <CardDescription className="text-xs">Phase: {p.phase}</CardDescription>}
              </CardHeader>
              <CardContent className="mt-auto pt-2 space-y-3">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{ownerName(p) || 'Unassigned'}</span>
                  <span>
                    {p.targetAt ? <>Due {new Date(p.targetAt).toLocaleDateString()}</> : 'No due date'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium">
                    <span>Progress</span>
                    <span>{p.progress || 0}%</span>
                  </div>
                  <Progress value={p.progress || 0} className="h-1.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => advanceStatus(p)} title="Cycle status">
                    <Flag className="h-3 w-3" /> Status
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 flex-1" onClick={() => openDecisions(p)}>
                    <History className="h-3 w-3" />
                    Decisions{p.decisionLog?.length ? ` (${p.decisionLog.length})` : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
            No projects found. Click "New Project" to start the roadmap.
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Project' : 'New Project'}</DialogTitle>
            <DialogDescription>Track platform initiatives, releases or ops tasks.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProject} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                placeholder="e.g. Q4 City Expansion — Indore"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Kind</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="release">Release</SelectItem>
                    <SelectItem value="initiative">Initiative</SelectItem>
                    <SelectItem value="ops_task">Ops Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold">Phase</Label>
                <Input
                  placeholder="e.g. Discovery"
                  value={form.phase}
                  onChange={(e) => setForm({ ...form, phase: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Target date</Label>
                <Input
                  type="date"
                  value={form.targetAt}
                  onChange={(e) => setForm({ ...form, targetAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Progress %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress}
                  onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">External ref (Jira/Linear)</Label>
                <Input
                  placeholder="e.g. OPS-142"
                  value={form.externalRef}
                  onChange={(e) => setForm({ ...form, externalRef: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Notes</Label>
              <Textarea
                placeholder="Scope, dependencies, risks…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit">{editId ? 'Save Changes' : 'Create Project'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Decision log dialog */}
      <Dialog open={isDecisionOpen} onOpenChange={setIsDecisionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Milestone className="h-4 w-4 text-primary" />
              Decision Log — {decisionProject?.title}
            </DialogTitle>
            <DialogDescription>Record every leadership decision with the reasoning ("why").</DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {(decisionProject?.decisionLog || []).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">No decisions logged yet.</div>
            )}
            {(decisionProject?.decisionLog || []).map((d, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <div className="text-xs font-semibold">{d.decision}</div>
                {d.why && <div className="text-[11px] text-muted-foreground mt-1">Why: {d.why}</div>}
                {d.at && <div className="text-[10px] text-muted-foreground mt-1">{new Date(d.at).toLocaleString()}</div>}
              </div>
            ))}
          </div>

          <form onSubmit={addDecision} className="space-y-3 pt-2 border-t border-border/60">
            <div>
              <Label className="text-xs font-semibold">Decision *</Label>
              <Input
                placeholder="e.g. Ship without partner ledger tab"
                value={decisionForm.decision}
                onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Why</Label>
              <Textarea
                placeholder="Reasoning / trade-off…"
                value={decisionForm.why}
                onChange={(e) => setDecisionForm({ ...decisionForm, why: e.target.value })}
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setIsDecisionOpen(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> Close
              </Button>
              <Button type="submit">Log Decision</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
