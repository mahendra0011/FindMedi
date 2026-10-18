import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, RefreshCw, Trash2, Pencil, Milestone, Flag, History, X,
  CheckCircle2, AlertTriangle, Layers, ShieldCheck, Info
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ROADMAP_PHASES,
  DEFINITION_OF_DONE,
  INITIALLY_EXCLUDED_FEATURES,
  TOP_RISKS_REGISTER,
} from '@/lib/roadmap';
import {
  TEST_PYRAMID,
  TEST_ENVIRONMENTS,
  CRITICAL_E2E_JOURNEYS,
  FEATURE_TEST_MATRICES,
  NON_FUNCTIONAL_TRACKS,
  CLINICAL_SAFETY_QA,
  DEFECT_SEVERITIES,
  QA_RELEASE_CHECKLIST,
  validateReleaseReadiness,
} from '@/lib/qaTestPlan';
import { HeartPulse, Stethoscope, ShieldAlert, Server, Cpu, Activity, Calculator, AlertOctagon, Wrench, LifeBuoy, Headphones, BookOpen, UserCheck, MessageSquare, Megaphone, Search, Share2, Calendar, Sparkles, Briefcase, Target, HelpCircle, TrendingUp, Lock, Eye, EyeOff, UserX, FileCheck, Key } from 'lucide-react';
import {
  SCOPED_ADMIN_ROLES,
  DATA_ACCESS_MATRIX,
  BREAK_GLASS_POLICY,
  MASKING_CONFIG,
  ADMIN_SIDEBAR_SPEC,
  PRIVACY_GUARANTEES,
  maskPatientPii,
  validateBreakGlassRequest,
} from '@/lib/superAdminGovernance';
import {
  CRM_NAV_MODULES,
  HYBRID_ARCHITECTURE_DECISION,
  SUPPLY_PIPELINE_STAGES,
  LOST_REASONS,
  PARTNERSHIP_STAGES,
  LEAD_SCORING_WEIGHTS,
  PROVIDER_HEALTH_WEIGHTS,
  ROLE_BASED_KPIS,
  AUTOMATION_WORKFLOW_RULES,
  CRM_ROLE_PERMISSIONS_MATRIX,
  calculateLeadScore,
  calculateProviderHealthScore,
} from '@/lib/crmOpsTeam';

import {
  INFRA_STAGES,
  ENV_TOPOLOGY,
  CI_CD_PIPELINE,
  SLO_DEFINITIONS,
  ALERTING_RULES,
  COST_BUCKETS,
  DISASTER_RECOVERY_TIERS,
  SRE_RUNBOOKS,
  HARDENING_GUARDRAILS,
  calculateCostPerThousandBookings,
  evaluateSloCompliance,
} from '@/lib/devOpsScaling';
import {
  OPERATING_MODEL,
  SUPPORT_CHANNELS_SLAS,
  TICKET_TAXONOMY,
  CORE_SOPS,
  ESCALATION_MATRIX,
  STAFFING_MODEL,
  COMMUNICATION_TEMPLATES,
  OPS_LAUNCH_CHECKLIST,
  routeSupportTicket,
  renderCommunicationTemplate,
} from '@/lib/supportOperations';
import {
  BRAND_FOUNDATION,
  HEALTHCARE_MARKETING_PRINCIPLES,
  CHANNEL_STRATEGY,
  SEO_SITE_ARCHITECTURE,
  KEYWORD_CLUSTERS,
  HEALTH_CALENDAR_CAMPAIGNS,
  LIFECYCLE_CRM_JOURNEYS,
  PARTNERSHIP_PLAYBOOK,
  MARKETING_COMPLIANCE_CHECKLIST,
  NINETY_DAY_LAUNCH_PLAN,
  generateSchemaOrgJsonLd,
  validateMarketingClaim,
  getSeoUrlForListing,
} from '@/lib/marketingSeo';
import {
  PITCH_DECK_SLIDES,
  THREE_MINUTE_PITCH,
  NARRATIVE_SCRIPT,
  MARKET_SIZING_FRAMEWORK,
  INVESTOR_QA_MATRIX,
  DUE_DILIGENCE_DATA_ROOM,
  FUNDING_PATH_ALTERNATIVES,
  GTM_THREE_PHASE_ROADMAP,
  calculateCityMarketPotential,
} from '@/lib/pitchDeck';
import type { Unmodelled } from '@/lib/apiTypes';

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
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isQaConsoleOpen, setIsQaConsoleOpen] = useState(false);
  const [isDevOpsOpen, setIsDevOpsOpen] = useState(false);
  const [isSupportOpsOpen, setIsSupportOpsOpen] = useState(false);
  const [isMarketingSeoOpen, setIsMarketingSeoOpen] = useState(false);
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [governanceActiveTab, setGovernanceActiveTab] = useState('roles');

  // Break-glass interactive simulator state
  const [bgRequesterId, setBgRequesterId] = useState('ops-admin-42');
  const [bgReasonCode, setBgReasonCode] = useState('LEGAL_COURT_ORDER');
  const [bgJustification, setBgJustification] = useState('Formal high court production order HC-JBP-2026-9041 requesting prescription records.');
  const [bgCaseNumber, setBgCaseNumber] = useState('HC-JBP-2026-9041');
  const [bgDuration, setBgDuration] = useState(30);
  const [bgIsSensitive, setBgIsSensitive] = useState(false);
  const [bgApprover1, setBgApprover1] = useState('dpo-officer');
  const [bgApprover2, setBgApprover2] = useState('');
  const [bgValidationResult, setBgValidationResult] = useState<any>(null);

  // Masking tester state
  const [rawPatientInput, setRawPatientInput] = useState({
    name: 'Vikram Singh Patel',
    phone: '+91 98260 12345',
    email: 'vikram.patel@gmail.com',
    address: '14 Civil Lines, Near High Court, Jabalpur 482001',
  });
  const [otpAssistUnlocked, setOtpAssistUnlocked] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  // Ops CRM & Team Spec interactive calculator state (Document 24)
  const [isOpsTeamSpecOpen, setIsOpsTeamSpecOpen] = useState(false);
  const [leadPriorityCat, setLeadPriorityCat] = useState(true);
  const [leadFootfall, setLeadFootfall] = useState(35);
  const [leadDirectDm, setLeadDirectDm] = useState(true);
  const [leadDigital, setLeadDigital] = useState(true);
  const [leadCluster, setLeadCluster] = useState(true);
  const [leadFastResp, setLeadFastResp] = useState(true);
  const [leadDocsReady, setLeadDocsReady] = useState(true);

  const [provBookings, setProvBookings] = useState(45);
  const [provPrevBookings, setProvPrevBookings] = useState(40);
  const [provRating, setProvRating] = useState(4.7);
  const [provResponseMin, setProvResponseMin] = useState(12);
  const [provCancelRate, setProvCancelRate] = useState(2);
  const [provProfileComp, setProvProfileComp] = useState(95);
  const [provDocExpiryDays, setProvDocExpiryDays] = useState(120);
  const [provDisputes, setProvDisputes] = useState(0);
  const [pitchActiveSlide, setPitchActiveSlide] = useState(1);
  const [pitchCityPop, setPitchCityPop] = useState(1500000);
  const [pitchSpendPerHh, setPitchSpendPerHh] = useState(25000);
  const [pitchDigitalPen, setPitchDigitalPen] = useState(15);
  const [pitchTakeRate, setPitchTakeRate] = useState(12);
  const [selectedQaId, setSelectedQaId] = useState('QA-01');
  const [claimCheckInput, setClaimCheckInput] = useState('');
  const [schemaOrgType, setSchemaOrgType] = useState('Physician');
  const [seoCityInput, setSeoCityInput] = useState('bhopal');
  const [seoCategoryInput, setSeoCategoryInput] = useState('dentist');
  const [seoAreaInput, setSeoAreaInput] = useState('arera-colony');
  const [seoSlugInput, setSeoSlugInput] = useState('dr-sharma-dental-clinic');
  const [sopSearchQuery, setSopSearchQuery] = useState('');
  const [testTicketCategory, setTestTicketCategory] = useState('Booking');
  const [testIsEmergency, setTestIsEmergency] = useState(false);
  const [calcBookings, setCalcBookings] = useState(1000);
  const [calcCosts, setCalcCosts] = useState<Record<string, number>>({
    compute: 15000,
    database: 12000,
    search: 8000,
    cacheAndQueue: 4000,
    objectStorage: 5000,
    messaging: 8000,
    video: 6000,
    maps: 3000,
    payments: 4000,
    verification: 3000,
    observability: 3000,
    operations: 25000,
  });
  const [testSloMetric, setTestSloMetric] = useState('apiAvailability');
  const [testSloValue, setTestSloValue] = useState(99.95);
  const [journeyPriorityFilter, setJourneyPriorityFilter] = useState('all');
  const [evalSev1, setEvalSev1] = useState(0);
  const [evalSev2, setEvalSev2] = useState(0);
  const [evalCriticalE2e, setEvalCriticalE2e] = useState(true);
  const [evalClinicalSignoff, setEvalClinicalSignoff] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [decisionProject, setDecisionProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [decisionForm, setDecisionForm] = useState({ decision: '', why: '' });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (phaseFilter && phaseFilter !== 'all') params.append('phase', phaseFilter);
      const qs = params.toString();
      const url = qs ? `/crm/projects?${qs}` : '/crm/projects';
      const res = await apiClient.get(url);
      setProjects(res.data.projects || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [statusFilter, phaseFilter]);

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpsTeamSpecOpen(true)}
            className="gap-1.5 h-9 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            data-testid="ops-team-spec-btn"
          >
            <Briefcase className="h-4 w-4" /> Ops CRM & Team Spec
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGovernanceOpen(true)}
            className="gap-1.5 h-9 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            data-testid="superadmin-governance-btn"
          >
            <ShieldAlert className="h-4 w-4" /> Super Admin Governance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPitchDeckOpen(true)}
            className="gap-1.5 h-9 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            data-testid="pitch-deck-btn"
          >
            <Briefcase className="h-4 w-4" /> Investor Pitch Deck
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMarketingSeoOpen(true)}
            className="gap-1.5 h-9 border-teal-500/30 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30"
            data-testid="marketing-seo-btn"
          >
            <Megaphone className="h-4 w-4" /> Marketing & SEO
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSupportOpsOpen(true)}
            className="gap-1.5 h-9 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            data-testid="support-ops-btn"
          >
            <Headphones className="h-4 w-4" /> Support & Ops Playbooks
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDevOpsOpen(true)}
            className="gap-1.5 h-9 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            data-testid="devops-scaling-btn"
          >
            <Server className="h-4 w-4" /> DevOps & Cost Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQaConsoleOpen(true)}
            className="gap-1.5 h-9 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            data-testid="qa-release-gates-btn"
          >
            <ShieldCheck className="h-4 w-4" /> QA & Release Gates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBlueprintOpen(true)}
            className="gap-1.5 h-9 border-primary/30 text-primary hover:bg-primary/5"
            data-testid="roadmap-blueprint-btn"
          >
            <Milestone className="h-4 w-4" /> Roadmap Blueprint
          </Button>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-36 h-9 text-xs" data-testid="roadmap-phase-filter"><SelectValue placeholder="Phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {ROADMAP_PHASES.map((ph) => (
                <SelectItem key={ph.code} value={ph.code}>{ph.code}: {ph.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
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
                <Select value={form.phase || 'custom'} onValueChange={(v) => setForm({ ...form, phase: v === 'custom' ? '' : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select phase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom / Other</SelectItem>
                    {ROADMAP_PHASES.map((ph) => (
                      <SelectItem key={ph.code} value={ph.code}>{ph.code}: {ph.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!ROADMAP_PHASES.some(p => p.code === form.phase)) && (
                  <Input
                    placeholder="e.g. Custom phase"
                    value={form.phase}
                    onChange={(e) => setForm({ ...form, phase: e.target.value })}
                    className="mt-1"
                  />
                )}
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

      {/* Document 14 — Roadmap Blueprint Dialog */}
      <Dialog open={isBlueprintOpen} onOpenChange={setIsBlueprintOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="roadmap-blueprint-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Document 14
              </Badge>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Milestone className="h-5 w-5 text-primary" />
                FindMedi Implementation Roadmap & Governance Blueprint
              </DialogTitle>
            </div>
            <DialogDescription>
              Phased sprint schedule (R-1 to R4), exit gates, definition of done, scope boundaries & risk register.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="phases" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="phases" className="text-xs">Phases & Gates</TabsTrigger>
              <TabsTrigger value="dod" className="text-xs">Definition of Done</TabsTrigger>
              <TabsTrigger value="boundaries" className="text-xs">Scope Boundaries</TabsTrigger>
              <TabsTrigger value="risks" className="text-xs">Risk Register</TabsTrigger>
            </TabsList>

            <TabsContent value="phases" className="space-y-3 pt-3">
              {ROADMAP_PHASES.map((ph) => (
                <div key={ph.code} className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className="font-mono text-xs">{ph.code}</Badge>
                      <span className="font-semibold text-sm">{ph.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{ph.sprints} ({ph.duration})</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{ph.outcome}</p>
                  <div className="p-2 rounded bg-muted/50 border border-border/50 text-[11px] text-foreground flex items-start gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-700 dark:text-emerald-300">Exit Gate: </strong>
                      {ph.exitGate}
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="dod" className="space-y-2.5 pt-3">
              <p className="text-xs text-muted-foreground mb-2">
                Every release milestone must satisfy all 8 statutory and engineering criteria prior to promotion:
              </p>
              {DEFINITION_OF_DONE.map((d) => (
                <div key={d.id} className="p-2.5 rounded-lg border border-border/60 bg-card flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">{d.item}</div>
                    <div className="text-[11px] text-muted-foreground">{d.detail}</div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="boundaries" className="space-y-2 pt-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/40 mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Kya NAHI banana initially (Strict Boundaries)
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  Prevents premature scope creep across 25+ categories and ungrounded architectures:
                </p>
              </div>
              {INITIALLY_EXCLUDED_FEATURES.map((feat, idx) => (
                <div key={idx} className="p-2 rounded border border-border/50 bg-muted/30 text-xs flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="risks" className="space-y-2.5 pt-3">
              {TOP_RISKS_REGISTER.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">{r.risk}</span>
                    <Badge variant="outline" className={`text-[10px] uppercase ${r.impact === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                      {r.impact}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground">Mitigation: </strong>{r.mitigation}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsBlueprintOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QA & Release Gates Specification Modal (Document 18) */}
      <Dialog open={isQaConsoleOpen} onOpenChange={setIsQaConsoleOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="qa-release-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs">
                Document 18
              </Badge>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                QA & Test Plan (incl. UAT & Clinical Safety)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Quality strategy, test pyramid target mix, 14 critical E2E journeys, non-functional tracks, clinical safety gates, and defect SLAs.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="journeys" className="w-full mt-2">
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="journeys" className="text-xs" data-testid="tab-e2e-journeys">E2E Journeys (14)</TabsTrigger>
              <TabsTrigger value="pyramid" className="text-xs" data-testid="tab-quality-pyramid">Test Pyramid</TabsTrigger>
              <TabsTrigger value="nonfunctional" className="text-xs" data-testid="tab-non-functional">Non-Functional</TabsTrigger>
              <TabsTrigger value="clinical" className="text-xs" data-testid="tab-clinical-safety">Clinical Safety</TabsTrigger>
              <TabsTrigger value="readiness" className="text-xs" data-testid="tab-release-evaluator">Release Readiness</TabsTrigger>
            </TabsList>

            {/* Tab: Critical E2E Journeys */}
            <TabsContent value="journeys" className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  14 core user & provider journeys required to pass on every production release:
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Filter:</span>
                  <Select value={journeyPriorityFilter} onValueChange={setJourneyPriorityFilter}>
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="P0">P0 (Blocker)</SelectItem>
                      <SelectItem value="P1">P1 (Critical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {CRITICAL_E2E_JOURNEYS
                  .filter((j) => journeyPriorityFilter === 'all' || j.priority === journeyPriorityFilter)
                  .map((j) => (
                    <div key={j.id} className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-mono text-xs ${j.priority === 'P0' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-amber-50 text-amber-700 border-amber-300'}`}>
                            {j.id} · {j.priority}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">{j.title}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] uppercase">{j.category}</Badge>
                      </div>

                      <div className="space-y-1 pl-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">Journey Steps:</span>
                        <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-0.5 pl-1">
                          {j.steps.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="p-2 rounded bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Pass Criteria: </strong>{j.passCriteria}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {/* Tab: Test Pyramid & Environments */}
            <TabsContent value="pyramid" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.entries(TEST_PYRAMID).map(([key, layer]) => (
                  <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">{key}</span>
                      <Badge className="font-mono text-xs">{layer.targetSharePct}%</Badge>
                    </div>
                    <div className="text-[11px] font-medium text-foreground">{layer.runner}</div>
                    <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                      {layer.scope.slice(0, 4).map((s, idx) => (
                        <li key={idx} className="line-clamp-2">{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Environments & Data Strategy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TEST_ENVIRONMENTS.map((env) => (
                    <div key={env.name} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{env.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{env.name}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{env.purpose}</p>
                      <div className="text-[10px] text-muted-foreground">
                        <strong>Data: </strong>{env.dataSource}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Non-Functional & Benchmarks */}
            <TabsContent value="nonfunctional" className="space-y-4 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performance p95 Latency Benchmarks (k6 / Artillery)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NON_FUNCTIONAL_TRACKS.performance.benchmarks.map((b, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-foreground">{b.metric}</div>
                        <div className="text-[11px] text-muted-foreground">{b.description}</div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs font-bold shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                        ≤ {b.targetP95Ms >= 1000 ? `${b.targetP95Ms / 1000}s` : `${b.targetP95Ms}ms`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resilience & Fail-Closed Principles</h4>
                <div className="space-y-2">
                  {NON_FUNCTIONAL_TRACKS.resilienceAndChaos.principles.map((p, i) => (
                    <div key={i} className="p-2.5 rounded border border-border/60 bg-muted/20 text-xs flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab: Clinical Safety & Triage */}
            <TabsContent value="clinical" className="space-y-4 pt-3">
              <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <HeartPulse className="h-4 w-4" />
                  {CLINICAL_SAFETY_QA.title}
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                  {CLINICAL_SAFETY_QA.mandate}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emergency Red-Flag Escalate Scenarios</h4>
                <div className="space-y-2">
                  {CLINICAL_SAFETY_QA.redFlagKeywords.map((rf, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-border/70 bg-card flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground capitalize">{rf.symptom}</span>
                        <p className="text-[11px] text-muted-foreground">{rf.guidance}</p>
                      </div>
                      <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-mono text-[10px] uppercase">
                        {rf.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core Clinical Safety Rules</h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  {CLINICAL_SAFETY_QA.rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            {/* Tab: Release Readiness Evaluator & Gates */}
            <TabsContent value="readiness" className="space-y-4 pt-3">
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-3">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Live Release Readiness Evaluator
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Open Sev-1 Defect(s)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={evalSev1}
                      onChange={(e) => setEvalSev1(parseInt(e.target.value) || 0)}
                      className="h-8 text-xs mt-1"
                      data-testid="input-eval-sev1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Open Sev-2 Defect(s)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={evalSev2}
                      onChange={(e) => setEvalSev2(parseInt(e.target.value) || 0)}
                      className="h-8 text-xs mt-1"
                      data-testid="input-eval-sev2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Critical E2E Passed?</Label>
                    <Select
                      value={evalCriticalE2e ? 'yes' : 'no'}
                      onValueChange={(v) => setEvalCriticalE2e(v === 'yes')}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-eval-e2e"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes (14/14)</SelectItem>
                        <SelectItem value="no">No (Failed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Clinical Sign-Off?</Label>
                    <Select
                      value={evalClinicalSignoff ? 'yes' : 'no'}
                      onValueChange={(v) => setEvalClinicalSignoff(v === 'yes')}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1" data-testid="select-eval-clinical"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Granted</SelectItem>
                        <SelectItem value="no">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(() => {
                  const evalResult = validateReleaseReadiness({
                    openSev1Count: evalSev1,
                    openSev2Count: evalSev2,
                    criticalE2ePassing: evalCriticalE2e,
                    clinicalAdvisorSignoff: evalClinicalSignoff,
                  });
                  return (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                        evalResult.canRelease
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50/50 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-200'
                      }`}
                      data-testid="eval-result-box"
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        {evalResult.canRelease ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            RELEASE READY: All quality exit gates satisfied.
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            RELEASE BLOCKED: Unresolved exit gate criteria.
                          </>
                        )}
                      </div>
                      {evalResult.blockers.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {evalResult.blockers.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Defect Severities & SLAs</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.entries(DEFECT_SEVERITIES).map(([key, def]) => (
                    <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{def.level}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{def.sla}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{def.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsQaConsoleOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document 19 — DevOps, Scaling & Cost Console Modal */}
      <Dialog open={isDevOpsOpen} onOpenChange={setIsDevOpsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="devops-scaling-modal">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border-indigo-200 text-[10px] uppercase font-bold">
                Document 19
              </Badge>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Server className="h-5 w-5 text-indigo-600" /> DevOps, Scaling & Cost Console
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Stage-wise infrastructure (S0–S3), zero-PHI staging, automated CI/CD gates, starter SLOs, page vs ticket alerts, cost per 1k bookings calculator, and disaster recovery runbooks.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="stages" className="w-full mt-2">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60 text-xs gap-1">
              <TabsTrigger value="stages" className="text-xs py-1.5" data-testid="tab-stages">Stages S0–S3</TabsTrigger>
              <TabsTrigger value="pipeline" className="text-xs py-1.5" data-testid="tab-pipeline">CI/CD & Envs</TabsTrigger>
              <TabsTrigger value="slos" className="text-xs py-1.5" data-testid="tab-slos">SLOs</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs py-1.5" data-testid="tab-alerts">Alerts (Page/Ticket)</TabsTrigger>
              <TabsTrigger value="costs" className="text-xs py-1.5" data-testid="tab-costs">Cost Calculator</TabsTrigger>
              <TabsTrigger value="runbooks" className="text-xs py-1.5" data-testid="tab-runbooks">DR Runbooks</TabsTrigger>
            </TabsList>

            {/* Tab 1: Stages S0-S3 */}
            <TabsContent value="stages" className="space-y-4 pt-3">
              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold">Core Principle (Don't Over-Build):</span> Start with S0 core in production. Advanced pieces (Kafka, Flink, Trino, Pinot, k8s) are kept behind profiles/flags to minimize operational overhead and prevent premature cost escalation.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {Object.entries(INFRA_STAGES).map(([key, item]) => (
                  <div key={key} className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{item.stage}</span>
                      <Badge variant="outline" className="text-[10px]">{key.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">{item.scope}</p>
                    
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Recommended Stack:</span>
                      <ul className="text-[11px] space-y-0.5 list-disc list-inside text-muted-foreground">
                        {item.recommendedStack.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    {item.skipForNow.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Skip For Now:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.skipForNow.map((sk, idx) => (
                            <Badge key={idx} variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200">
                              {sk}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/80 italic pt-1 border-t border-border/40">
                      Guidance: {item.operationalGuidance}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 2: CI/CD & Envs */}
            <TabsContent value="pipeline" className="space-y-4 pt-3">
              <div className="p-3 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{ENV_TOPOLOGY.dataSafetyPrinciple}</span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Environment Topology</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(ENV_TOPOLOGY)
                    .filter(([k]) => k !== 'dataSafetyPrinciple')
                    .map(([envKey, env]) => {
                      const envObj = env as { purpose: string; hosting: string; data: string };
                      return (
                        <div key={envKey} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase">{envKey}</Badge>
                            <span className="text-[10px] text-muted-foreground">{envObj.hosting}</span>
                          </div>
                          <p className="text-xs font-medium text-foreground">{envObj.purpose}</p>
                          <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Data:</span> {envObj.data}</p>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CI/CD Pipeline Gates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" /> Pull Request (PR) Gates
                    </span>
                    <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                      {CI_CD_PIPELINE.prGates.map((g, idx) => (
                        <li key={idx}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" /> Staging & Production Rollout
                    </span>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-foreground">Staging Verification:</span>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                        {CI_CD_PIPELINE.stagingGates.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1 pt-1.5">
                      <span className="text-[10px] font-semibold text-foreground">Production Rollout:</span>
                      <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                        {CI_CD_PIPELINE.productionRollout.map((g, idx) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-card text-xs space-y-1">
                <span className="font-bold text-foreground">Zero-Downtime Database Migration Pattern:</span>
                <p className="text-muted-foreground">{CI_CD_PIPELINE.databaseMigrationPattern}</p>
              </div>
            </TabsContent>

            {/* Tab 3: SLOs */}
            <TabsContent value="slos" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(SLO_DEFINITIONS).map(([key, slo]) => (
                  <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{slo.metric}</span>
                      <Badge variant="outline" className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {slo.targetStr}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">{slo.sli}</p>
                    <p className="text-[10px] text-muted-foreground/80">{slo.description}</p>
                  </div>
                ))}
              </div>

              {/* Interactive SLO Compliance Tester */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3" data-testid="slo-compliance-evaluator">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Interactive SLO Compliance Tester</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Select Metric</Label>
                    <Select value={testSloMetric} onValueChange={setTestSloMetric}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SLO_DEFINITIONS).map(([k, s]) => (
                          <SelectItem key={k} value={k}>{s.metric} ({s.targetStr})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observed Telemetry Value ({SLO_DEFINITIONS[testSloMetric]?.targetP95Ms ? 'ms' : '%'})</Label>
                    <Input
                      type="number"
                      step={SLO_DEFINITIONS[testSloMetric]?.targetP95Ms ? '1' : '0.01'}
                      value={testSloValue}
                      onChange={(e) => setTestSloValue(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      data-testid="slo-test-value-input"
                    />
                  </div>
                  <div>
                    {(() => {
                      const res = evaluateSloCompliance(testSloMetric, testSloValue);
                      return (
                        <div
                          className={`p-2 rounded-md text-xs font-medium border flex items-center gap-1.5 ${
                            res.compliant
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                          data-testid="slo-compliance-result"
                        >
                          {res.compliant ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />}
                          <span className="truncate">{res.message}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Alerts (Page vs Ticket) */}
            <TabsContent value="alerts" className="space-y-4 pt-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold">PAGE ALERTS (P0/P1)</Badge>
                  <span className="text-xs text-muted-foreground">Wakes on-call engineers via PagerDuty / OpsGenie. Linked to executable SRE runbooks.</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ALERTING_RULES.pageAlerts.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg border border-rose-200/70 dark:border-rose-900/40 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{a.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono text-rose-600 border-rose-200">{a.severity}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">{a.condition}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Runbook: {a.runbook}</span>
                        <span className="text-muted-foreground">{a.channel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold">TICKET ALERTS (P2/P3)</Badge>
                  <span className="text-xs text-muted-foreground">Automatically created in JIRA backlog for business-hour resolution.</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ALERTING_RULES.ticketAlerts.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{t.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{t.severity}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">{t.condition}</p>
                      <div className="pt-1 border-t border-border/40 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Runbook: {t.runbook}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Cost Calculator */}
            <TabsContent value="costs" className="space-y-4 pt-3">
              {/* Interactive Calculator Top Bar */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3" data-testid="cost-per-1k-calculator">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Cost per 1,000 Bookings Calculator (§10.2)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Monthly Bookings:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={calcBookings}
                      onChange={(e) => setCalcBookings(Math.max(1, Number(e.target.value)))}
                      className="h-8 w-28 text-xs font-mono font-bold"
                      data-testid="calc-bookings-input"
                    />
                  </div>
                </div>

                {/* Calculation Summary KPIs */}
                {(() => {
                  const calc = calculateCostPerThousandBookings(calcCosts, calcBookings);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                      <div className="p-3 rounded-lg bg-card border border-border/70 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Monthly Cost</span>
                        <div className="text-lg font-bold text-foreground font-mono" data-testid="calc-total-monthly">
                          ₹{calc.totalMonthlyCost.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-card border border-border/70 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cost per Booking</span>
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono" data-testid="calc-per-booking">
                          ₹{calc.costPerBooking.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-card border border-border/70 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cost per 1,000 Bookings</span>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono" data-testid="calc-per-1k-bookings">
                          ₹{calc.costPerThousandBookings.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Cost Buckets Inputs */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adjust Monthly Cost Buckets (₹ INR)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {Object.entries(COST_BUCKETS).map(([key, bucket]) => (
                    <div key={key} className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">{bucket.name}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={calcCosts[key] || 0}
                          onChange={(e) => setCalcCosts({ ...calcCosts, [key]: Number(e.target.value) })}
                          className="h-7 w-24 text-right text-xs font-mono font-bold"
                          data-testid={`cost-input-${key}`}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate" title={bucket.description}>{bucket.description}</p>
                      <p className="text-[9px] text-muted-foreground/80 italic truncate" title={bucket.controlLevers}>Levers: {bucket.controlLevers}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hardening Guardrails Card */}
              <div className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
                <span className="text-xs font-bold text-foreground">Operational Hardening & Cost Guardrails (§10.3)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">SMS Daily Quota / Number:</span>
                    <span className="font-bold font-mono text-foreground">{HARDENING_GUARDRAILS.smsPumpingDefense.maxDailyOtpPerNumber} OTPs</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">OTP Cooldown:</span>
                    <span className="font-bold font-mono text-foreground">{HARDENING_GUARDRAILS.smsPumpingDefense.otpCooldownSeconds} seconds</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Max Video Session:</span>
                    <span className="font-bold font-mono text-foreground">{HARDENING_GUARDRAILS.videoSessionLimits.maxSessionDurationMinutes} minutes</span>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <span className="text-[10px] text-muted-foreground block">Max Upload File Size:</span>
                    <span className="font-bold font-mono text-foreground">{HARDENING_GUARDRAILS.fileUploadHardening.maxUploadSizeBytes / (1024 * 1024)} MB</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Disaster Recovery Runbooks */}
            <TabsContent value="runbooks" className="space-y-4 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Disaster Recovery (DR) Tiers (§11)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {Object.entries(DISASTER_RECOVERY_TIERS).map(([key, tier]) => (
                    <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{tier.tier}</span>
                        <div className="flex gap-1 text-[10px] font-mono">
                          <Badge variant="outline">RPO: {tier.rpoMinutes}m</Badge>
                          <Badge variant="outline">RTO: {tier.rtoMinutes}m</Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Services:</span> {tier.services.join(', ')}</p>
                      <p className="text-[10px] text-muted-foreground/80 italic">{tier.failoverMechanism}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">7 SRE Incident Runbooks</h4>
                <div className="space-y-2.5">
                  {SRE_RUNBOOKS.map((rb) => (
                    <div key={rb.id} className="p-3 rounded-lg border border-border/80 bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-600 border-indigo-200">{rb.id}</Badge>
                          <span className="text-xs font-bold text-foreground">{rb.title}</span>
                        </div>
                        <Badge variant={rb.severity === 'Sev-1' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {rb.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Trigger:</span> {rb.trigger}</p>
                      <div className="space-y-1 bg-muted/30 p-2.5 rounded-md">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step-by-Step Resolution:</span>
                        <ol className="text-[11px] text-foreground space-y-1 list-none">
                          {rb.steps.map((st, i) => (
                            <li key={i} className="text-muted-foreground">{st}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsDevOpsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document 20 — Support & Operations Playbooks Modal */}
      <Dialog open={isSupportOpsOpen} onOpenChange={setIsSupportOpsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="support-ops-modal">
          <DialogHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200 text-[10px] uppercase font-bold">
                Document 20
              </Badge>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Headphones className="h-5 w-5 text-amber-600" /> Support & Operations Playbooks
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Tier 0 to Tier 3 operating model, channel SLAs, 17 Core SOPs, Sev-1 to Sev-4 escalation matrix, pilot staffing model, and standard crisis & patient communication templates.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="sops" className="w-full mt-2">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60 text-xs gap-1">
              <TabsTrigger value="sops" className="text-xs py-1.5" data-testid="tab-sops">17 Core SOPs</TabsTrigger>
              <TabsTrigger value="model" className="text-xs py-1.5" data-testid="tab-model">Operating Model</TabsTrigger>
              <TabsTrigger value="slas" className="text-xs py-1.5" data-testid="tab-slas">Channel SLAs</TabsTrigger>
              <TabsTrigger value="matrix" className="text-xs py-1.5" data-testid="tab-matrix">Escalation Matrix</TabsTrigger>
              <TabsTrigger value="staffing" className="text-xs py-1.5" data-testid="tab-staffing">Staffing Model</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs py-1.5" data-testid="tab-templates">Templates</TabsTrigger>
            </TabsList>

            {/* Tab 1: 17 Core SOPs */}
            <TabsContent value="sops" className="space-y-4 pt-3">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Search SOP by ID, title, or keywords (e.g. no-show, refund, crisis, wrong drug)..."
                  value={sopSearchQuery}
                  onChange={(e) => setSopSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                  data-testid="sop-search-input"
                />
              </div>

              <div className="space-y-3">
                {CORE_SOPS.filter((s) => {
                  if (!sopSearchQuery) return true;
                  const q = sopSearchQuery.toLowerCase();
                  return (
                    s.id.toLowerCase().includes(q) ||
                    s.title.toLowerCase().includes(q) ||
                    s.trigger.toLowerCase().includes(q) ||
                    s.steps.some((step) => step.toLowerCase().includes(q))
                  );
                }).map((sop) => (
                  <div key={sop.id} className="p-3 rounded-lg border border-border/80 bg-card space-y-2" data-testid={`sop-card-${sop.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs font-bold text-amber-600 border-amber-200">{sop.id}</Badge>
                        <span className="text-xs font-bold text-foreground">{sop.title}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Trigger:</span> {sop.trigger}</p>
                    <div className="space-y-1 bg-muted/30 p-2.5 rounded-md">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Standard Operating Procedure:</span>
                      <ol className="text-[11px] text-foreground space-y-1 list-none">
                        {sop.steps.map((st, i) => (
                          <li key={i} className="text-muted-foreground">{st}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 2: Operating Model */}
            <TabsContent value="model" className="space-y-4 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiered Support Hierarchy</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {OPERATING_MODEL.tiers.map((t, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{t.tier}</span>
                        <Badge variant="outline" className="text-[10px]">{t.coverage}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{t.description}</p>
                      <div className="text-[10px] pt-1 border-t border-border/40 text-amber-700 dark:text-amber-400">
                        <span className="font-semibold">Escalation Trigger:</span> {t.escalationTrigger}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Functional Teams & Core Responsibilities</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {OPERATING_MODEL.teams.map((tm, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card space-y-1">
                      <span className="text-xs font-bold text-foreground">{tm.name}</span>
                      <p className="text-[11px] text-muted-foreground">{tm.responsibility}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Channel SLAs & Priority Queue */}
            <TabsContent value="slas" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(SUPPORT_CHANNELS_SLAS)
                  .filter(([k]) => k !== 'priorityQueueOrder')
                  .map(([key, ch]) => {
                    const c = ch as { channel: string; hours: string; firstResponseSla: string; resolutionSla: string };
                    return (
                      <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                        <span className="text-xs font-bold text-foreground">{c.channel}</span>
                        <Badge variant="secondary" className="text-[10px] block w-fit">{c.hours}</Badge>
                        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">First Response:</span> {c.firstResponseSla}</p>
                        <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Resolution:</span> {c.resolutionSla}</p>
                      </div>
                    );
                  })}
              </div>

              <div className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Priority Queue Order</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  {SUPPORT_CHANNELS_SLAS.priorityQueueOrder.map((pq, idx) => (
                    <Badge key={idx} variant="outline" className="font-mono text-[11px] py-1">
                      {pq}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Interactive Ticket Router Tester */}
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3" data-testid="ticket-router-tester">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Support Ticket Routing Tester</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Select value={testTicketCategory} onValueChange={setTestTicketCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TICKET_TAXONOMY.map((tx) => (
                          <SelectItem key={tx.category} value={tx.category}>{tx.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 flex items-center gap-2 pb-1">
                    <input
                      type="checkbox"
                      id="emergency-cb"
                      checked={testIsEmergency}
                      onChange={(e) => setTestIsEmergency(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      data-testid="test-emergency-checkbox"
                    />
                    <Label htmlFor="emergency-cb" className="text-xs font-semibold text-rose-600">
                      Emergency / Life-Safety Flag
                    </Label>
                  </div>
                  <div>
                    {(() => {
                      const res = routeSupportTicket(testTicketCategory, testIsEmergency);
                      return (
                        <div className="p-2 rounded-md text-xs font-medium border bg-card flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{res.routingQueue}</span>
                            <Badge variant={res.isEmergency ? 'destructive' : 'outline'} className="text-[10px]">
                              {res.severity}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground text-[10px]">SLA: {res.targetSla}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Escalation Matrix */}
            <TabsContent value="matrix" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(ESCALATION_MATRIX).map(([key, item]) => (
                  <div key={key} className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{item.level}</span>
                      <Badge variant={key === 'SEV_1' ? 'destructive' : 'outline'} className="text-[10px] font-mono">
                        {key.replace('_', '-')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Definition:</span> {item.definition}</p>
                    <p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground/80">Responsible Team:</span> {item.team}</p>
                    <div className="pt-1 border-t border-border/40 text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      Cadence: {item.responseCadence}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 5: Staffing Model */}
            <TabsContent value="staffing" className="space-y-4 pt-3">
              <div className="p-3 rounded-lg bg-card border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{STAFFING_MODEL.pilotCityS0.phase}</span>
                  <Badge variant="outline" className="text-[10px]">{STAFFING_MODEL.pilotCityS0.assumedVolume}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {STAFFING_MODEL.pilotCityS0.teamAllocation.map((tm, idx) => (
                    <div key={idx} className="p-2.5 rounded-md border border-border/60 bg-muted/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{tm.role}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">{tm.count}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{tm.duty}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workforce Growth Triggers</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STAFFING_MODEL.growthTriggers.map((gt, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card space-y-1 text-xs">
                      <span className="font-semibold text-foreground">{gt.trigger}</span>
                      <p className="text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">→ {gt.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Communication Templates */}
            <TabsContent value="templates" className="space-y-4 pt-3">
              <div className="space-y-3">
                {Object.entries(COMMUNICATION_TEMPLATES).map(([key, tpl]) => (
                  <div key={key} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5" data-testid={`template-${key}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{tpl.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">{key}</Badge>
                    </div>
                    <div className="p-2.5 rounded bg-muted/30 text-xs font-mono text-foreground/90 whitespace-pre-wrap border border-border/40">
                      {tpl.template}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsSupportOpsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marketing, Brand & SEO Plan Dialog (Document 21) */}
      <Dialog open={isMarketingSeoOpen} onOpenChange={setIsMarketingSeoOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="marketing-seo-modal">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 dark:bg-teal-950/40 border-teal-200">
                Document 21 — Marketing, Brand & SEO
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Vernacular Local SEO
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Drugs & Magic Remedies Act Compliant
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Megaphone className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Marketing, Brand & SEO Plan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Brand positioning, healthcare marketing principles (zero PHI ad targeting), channel mix, local SEO hierarchy, Schema.org generator, keyword clusters, annual health calendar, and 90-day launch roadmap.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="brand" className="w-full mt-2">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto p-1 bg-muted/60">
              <TabsTrigger value="brand" className="text-xs py-1.5" data-testid="tab-marketing-brand">Brand</TabsTrigger>
              <TabsTrigger value="channels" className="text-xs py-1.5" data-testid="tab-marketing-channels">Channels</TabsTrigger>
              <TabsTrigger value="seo" className="text-xs py-1.5" data-testid="tab-marketing-seo">SEO & Schema</TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs py-1.5" data-testid="tab-marketing-keywords">Keywords</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs py-1.5" data-testid="tab-marketing-calendar">Calendar</TabsTrigger>
              <TabsTrigger value="lifecycle" className="text-xs py-1.5" data-testid="tab-marketing-lifecycle">Lifecycle & B2B</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs py-1.5" data-testid="tab-marketing-compliance">Claims Check</TabsTrigger>
              <TabsTrigger value="launch" className="text-xs py-1.5" data-testid="tab-marketing-launch">90-Day Plan</TabsTrigger>
            </TabsList>

            {/* Tab 1: Brand & Vernacular */}
            <TabsContent value="brand" className="space-y-4 pt-3">
              <div className="p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 space-y-2">
                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">Positioning Statement</span>
                <p className="text-sm font-semibold text-foreground italic leading-relaxed">
                  "{BRAND_FOUNDATION.positioning}"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-xs bg-card">Brand Promise: {BRAND_FOUNDATION.promise}</Badge>
                  <span className="text-xs text-muted-foreground">{BRAND_FOUNDATION.tone}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">5 Brand Pillars</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {BRAND_FOUNDATION.pillars.map((pillar, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                      <span className="text-xs font-bold text-foreground">{pillar.title}</span>
                      <p className="text-[11px] text-muted-foreground">{pillar.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Brand Dos (Best Practices)</span>
                  <ul className="text-xs space-y-1 text-emerald-900 dark:text-emerald-300">
                    {BRAND_FOUNDATION.dosAndDonts.do.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Brand Don'ts (Strictly Forbidden)</span>
                  <ul className="text-xs space-y-1 text-rose-900 dark:text-rose-300">
                    {BRAND_FOUNDATION.dosAndDonts.dont.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vernacular Category Aliases (Hindi / English)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(BRAND_FOUNDATION.vernacularTaxonomyAliases).map(([eng, hin]) => (
                    <div key={eng} className="p-2.5 rounded-md border border-border/60 bg-muted/20 text-xs">
                      <div className="font-bold text-foreground">{eng}</div>
                      <div className="text-muted-foreground text-[11px]">{hin}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Channel Mix (P0/P1/P2) */}
            <TabsContent value="channels" className="space-y-4 pt-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40">P0</Badge>
                    Core Zero-CAC Foundation Channels
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Highest trust, organic patient acquisition</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {CHANNEL_STRATEGY.p0_coreZeroCac.map((ch, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{ch.channel}</span>
                        <Badge variant="secondary" className="text-[10px]">{ch.priority}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground/80">Role:</span> {ch.role}</p>
                      <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">Action: {ch.action}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/40">P1</Badge>
                    Growth Channels
                  </h4>
                  <div className="space-y-2">
                    {CHANNEL_STRATEGY.p1_growthChannels.map((ch, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-0.5">
                        <span className="font-bold text-foreground">{ch.channel}</span>
                        <p className="text-muted-foreground text-[11px]">{ch.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/40">P2</Badge>
                    Supplementary Channels
                  </h4>
                  <div className="space-y-2">
                    {CHANNEL_STRATEGY.p2_supplementary.map((ch, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-0.5">
                        <span className="font-bold text-foreground">{ch.channel}</span>
                        <p className="text-muted-foreground text-[11px]">{ch.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Local SEO & Schema.org */}
            <TabsContent value="seo" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Search className="h-4 w-4 text-teal-600" /> Canonical URL Hierarchy
                  </span>
                  <div className="space-y-1 text-[11px] font-mono text-muted-foreground">
                    {SEO_SITE_ARCHITECTURE.urlHierarchy.map((url, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-muted/30 border border-border/40 text-foreground/90">
                        {url}
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 text-xs text-muted-foreground space-y-1 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <span>Quality Gate Minimum Providers:</span>
                      <Badge variant="outline">{SEO_SITE_ARCHITECTURE.qualityGateMinimumVerifiedProviders}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Noindex Below Threshold:</span>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                    <span className="text-xs font-bold text-foreground">Interactive Canonical URL Tester</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px]">City</Label>
                        <Input
                          value={seoCityInput}
                          onChange={(e) => setSeoCityInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          data-testid="seo-city-input"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Category</Label>
                        <Input
                          value={seoCategoryInput}
                          onChange={(e) => setSeoCategoryInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          data-testid="seo-cat-input"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Area (Optional)</Label>
                        <Input
                          value={seoAreaInput}
                          onChange={(e) => setSeoAreaInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          data-testid="seo-area-input"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Slug</Label>
                        <Input
                          value={seoSlugInput}
                          onChange={(e) => setSeoSlugInput(e.target.value)}
                          className="h-8 text-xs font-mono"
                          data-testid="seo-slug-input"
                        />
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/40 text-xs font-mono text-teal-700 dark:text-teal-400 break-all border border-border/40" data-testid="canonical-seo-preview">
                      {getSeoUrlForListing(seoCityInput, seoCategoryInput, seoSlugInput, seoAreaInput)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/70 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Schema.org JSON-LD Generator</span>
                      <Select value={schemaOrgType} onValueChange={setSchemaOrgType}>
                        <SelectTrigger className="w-36 h-7 text-xs" data-testid="schema-type-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Physician">Physician</SelectItem>
                          <SelectItem value="MedicalOrganization">MedicalOrganization</SelectItem>
                          <SelectItem value="Dentist">Dentist</SelectItem>
                          <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="MedicalWebPage">MedicalWebPage</SelectItem>
                          <SelectItem value="FAQPage">FAQPage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <pre className="p-2.5 rounded bg-muted/40 text-[10px] font-mono text-foreground/90 max-h-36 overflow-y-auto border border-border/40 whitespace-pre-wrap" data-testid="schema-jsonld-preview">
                      {generateSchemaOrgJsonLd(schemaOrgType, {
                        name: 'Aarogyam Clinic & Diagnostics',
                        city: seoCityInput,
                        specialty: 'Cardiology & General Medicine',
                        phone: '+91-761-2400111',
                        rating: 4.8,
                        reviewCount: 42,
                      })}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Keyword Clusters */}
            <TabsContent value="keywords" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {KEYWORD_CLUSTERS.map((kc, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
                    <span className="text-xs font-bold text-foreground">{kc.cluster}</span>
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="font-semibold text-muted-foreground text-[10px] uppercase">English Queries:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {kc.english.map((q, qidx) => (
                            <Badge key={qidx} variant="outline" className="text-[10px] font-normal">{q}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-teal-700 dark:text-teal-400 text-[10px] uppercase">Hinglish / Local Search:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {kc.hinglish.map((hq, hqidx) => (
                            <Badge key={hqidx} variant="secondary" className="text-[10px] font-normal bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300">{hq}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 5: Health Calendar */}
            <TabsContent value="calendar" className="space-y-4 pt-3">
              <div className="space-y-2.5">
                {HEALTH_CALENDAR_CAMPAIGNS.map((camp, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{camp.date}</Badge>
                        <span className="text-xs font-bold text-foreground">{camp.campaignTitle}</span>
                        <span className="text-[11px] text-muted-foreground">({camp.theme})</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-0.5">{camp.action}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] self-start md:self-center shrink-0">
                      Community Camp
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 6: Lifecycle CRM & Partnerships */}
            <TabsContent value="lifecycle" className="space-y-4 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lifecycle CRM Patient Journeys</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {LIFECYCLE_CRM_JOURNEYS.map((lj, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{lj.stage}</span>
                        <Badge variant="outline" className="text-[10px]">{lj.channel}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]"><span className="font-semibold text-foreground/80">Trigger:</span> {lj.trigger}</p>
                      <p className="text-foreground/90 text-[11px] italic bg-muted/20 p-1.5 rounded border border-border/40">"{lj.message}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Institutional B2B Partnerships Playbook</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PARTNERSHIP_PLAYBOOK.map((pt, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5 text-xs">
                      <span className="font-bold text-foreground">{pt.partnerType}</span>
                      <p className="text-muted-foreground text-[11px]"><span className="font-semibold text-foreground/80">Offer:</span> {pt.offer}</p>
                      <p className="text-teal-700 dark:text-teal-400 text-[11px] font-medium">Mechanism: {pt.mechanism}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Claims Compliance & Checklist */}
            <TabsContent value="compliance" className="space-y-4 pt-3">
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Interactive Claims Compliance Checker (Drugs & Magic Remedies Act 1954)
                  </span>
                  <Badge variant="outline" className="text-[10px]">Zero Miracle Cures</Badge>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter marketing claim (e.g. '100% cure for arthritis' or 'Consult verified specialists nearby')"
                    value={claimCheckInput}
                    onChange={(e) => setClaimCheckInput(e.target.value)}
                    className="text-xs"
                    data-testid="claim-check-input"
                  />
                  {claimCheckInput.trim() && (() => {
                    const res = validateMarketingClaim(claimCheckInput);
                    return (
                      <div className="p-3 rounded-md border text-xs space-y-1 bg-muted/30" data-testid="claim-validation-result">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">
                            {res.isCompliant ? 'Status: Approved' : 'Status: Prohibited Claim Detected'}
                          </span>
                          <Badge variant={res.isCompliant ? 'secondary' : 'destructive'} className="text-[10px]">
                            {res.isCompliant ? 'Compliant' : 'Violation'}
                          </Badge>
                        </div>
                        <p className={res.isCompliant ? 'text-emerald-700 dark:text-emerald-400 text-[11px]' : 'text-rose-600 dark:text-rose-400 text-[11px]'}>
                          {res.recommendation}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Healthcare Marketing Compliance Checklist</h4>
                <div className="space-y-1.5">
                  {MARKETING_COMPLIANCE_CHECKLIST.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-md border border-border/60 bg-card flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span className="text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 8: 90-Day Launch Roadmap */}
            <TabsContent value="launch" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(NINETY_DAY_LAUNCH_PLAN).map(([key, plan]) => (
                  <div key={key} className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {key.replace('days_', 'Days ')}
                        </Badge>
                      </div>
                      <span className="text-xs font-bold text-foreground block">{plan.phase}</span>
                      <ul className="text-[11px] text-muted-foreground space-y-1.5 pt-1">
                        {plan.milestones.map((m: Unmodelled, midx: Unmodelled) => (
                          <li key={midx} className="flex items-start gap-1.5">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsMarketingSeoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investor Pitch Deck & Q&A Prep Dialog (Document 22) */}
      <Dialog open={isPitchDeckOpen} onOpenChange={setIsPitchDeckOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="pitch-deck-modal">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200">
                Document 22 — Investor Pitch Deck & Q&A
              </Badge>
              <Badge variant="secondary" className="text-xs">
                $1.2M Seed Round
              </Badge>
              <Badge variant="secondary" className="text-xs">
                TAM / SAM / SOM Modeling
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Pitch / Investor Deck Outline & Q&A Prep
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              12-slide pitch deck structure, TAM / SAM / SOM market sizing models, interactive city potential calculator, hard investor objection defense matrix, and 3-phase GTM milestones.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="slides" className="w-full mt-2">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/60">
              <TabsTrigger value="slides" className="text-xs py-1.5" data-testid="tab-pitch-slides">14-Slide Deck</TabsTrigger>
              <TabsTrigger value="threemin" className="text-xs py-1.5" data-testid="tab-pitch-threemin">3-Min Pitch & Script</TabsTrigger>
              <TabsTrigger value="marketsize" className="text-xs py-1.5" data-testid="tab-pitch-marketsize">Market Sizing & Calc</TabsTrigger>
              <TabsTrigger value="qa" className="text-xs py-1.5" data-testid="tab-pitch-qa">Investor Q&A (13)</TabsTrigger>
              <TabsTrigger value="dataroom" className="text-xs py-1.5" data-testid="tab-pitch-dataroom">Data Room & Grants</TabsTrigger>
              <TabsTrigger value="gtm" className="text-xs py-1.5" data-testid="tab-pitch-gtm">3-Phase GTM</TabsTrigger>
            </TabsList>

            {/* Tab 1: 14-Slide Deck */}
            <TabsContent value="slides" className="space-y-4 pt-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="slide-navigator">
                {PITCH_DECK_SLIDES.map((slide) => (
                  <Button
                    key={slide.slideNumber}
                    variant={pitchActiveSlide === slide.slideNumber ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPitchActiveSlide(slide.slideNumber)}
                    className="h-7 text-xs px-2.5 font-mono shrink-0"
                    data-testid={`slide-btn-${slide.slideNumber}`}
                  >
                    Slide {slide.slideNumber}
                  </Button>
                ))}
              </div>

              {(() => {
                const curSlide = PITCH_DECK_SLIDES.find((s) => s.slideNumber === pitchActiveSlide) || PITCH_DECK_SLIDES[0];
                return (
                  <div className="p-4 rounded-lg border border-border/80 bg-card space-y-3" data-testid="active-slide-card">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          Slide {curSlide.slideNumber} of 14
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/40">
                          {curSlide.category}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">Investor Pitch Outline</span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground">{curSlide.title}</h3>
                      <p className="text-xs text-muted-foreground">{curSlide.subtitle}</p>
                    </div>

                    <div className="p-2.5 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 text-xs font-semibold text-purple-900 dark:text-purple-300">
                      💡 Key Takeaway: {curSlide.keyTakeaway}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Core Talking Points & Evidence</span>
                      <ul className="text-xs space-y-1.5">
                        {curSlide.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-purple-600 font-bold">•</span>
                            <span className="text-foreground/90">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Tab 2: 3-Minute Quick Pitch & Narrative Script */}
            <TabsContent value="threemin" className="space-y-4 pt-3">
              <div className="p-4 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400">{NARRATIVE_SCRIPT.title}</span>
                <p className="text-xs leading-relaxed italic text-foreground/90 font-medium">
                  "{NARRATIVE_SCRIPT.hindiScript}"
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">5-Step Rapid Elevator Pitch</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {THREE_MINUTE_PITCH.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-400">{p.step}</span>
                      <p className="text-xs text-foreground/90">{p.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: TAM / SAM / SOM & City Potential */}
            <TabsContent value="marketsize" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-border/80 bg-card space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{MARKET_SIZING_FRAMEWORK.tam.label}</span>
                  <div className="text-xl font-bold text-foreground font-mono">{MARKET_SIZING_FRAMEWORK.tam.valueUsd}</div>
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-400">{MARKET_SIZING_FRAMEWORK.tam.valueInr}</div>
                  <p className="text-[11px] text-muted-foreground">{MARKET_SIZING_FRAMEWORK.tam.description}</p>
                </div>
                <div className="p-3.5 rounded-lg border border-border/80 bg-card space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{MARKET_SIZING_FRAMEWORK.sam.label}</span>
                  <div className="text-xl font-bold text-foreground font-mono">{MARKET_SIZING_FRAMEWORK.sam.valueUsd}</div>
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-400">{MARKET_SIZING_FRAMEWORK.sam.valueInr}</div>
                  <p className="text-[11px] text-muted-foreground">{MARKET_SIZING_FRAMEWORK.sam.description}</p>
                </div>
                <div className="p-3.5 rounded-lg border border-border/80 bg-card space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{MARKET_SIZING_FRAMEWORK.som.label}</span>
                  <div className="text-xl font-bold text-foreground font-mono">{MARKET_SIZING_FRAMEWORK.som.valueUsd}</div>
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-400">{MARKET_SIZING_FRAMEWORK.som.valueInr}</div>
                  <p className="text-[11px] text-muted-foreground">{MARKET_SIZING_FRAMEWORK.som.description}</p>
                </div>
              </div>

              {/* Bottom-Up City Potential Calculator */}
              <div className="p-4 rounded-lg border border-border/80 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calculator className="h-4 w-4 text-purple-600" />
                    Interactive Bottom-Up City Market Potential Calculator
                  </span>
                  <Badge variant="outline" className="text-[10px]">Realtime Model</Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <Label className="text-[10px]">City Population</Label>
                    <Input
                      type="number"
                      value={pitchCityPop}
                      onChange={(e) => setPitchCityPop(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      data-testid="input-city-pop"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Annual Health Spend/HH (₹)</Label>
                    <Input
                      type="number"
                      value={pitchSpendPerHh}
                      onChange={(e) => setPitchSpendPerHh(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      data-testid="input-spend-hh"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Digital Penetration (%)</Label>
                    <Input
                      type="number"
                      value={pitchDigitalPen}
                      onChange={(e) => setPitchDigitalPen(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      data-testid="input-digital-pen"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">FindMedi Take Rate (%)</Label>
                    <Input
                      type="number"
                      value={pitchTakeRate}
                      onChange={(e) => setPitchTakeRate(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      data-testid="input-take-rate"
                    />
                  </div>
                </div>

                {(() => {
                  const pot = calculateCityMarketPotential({
                    cityPopulation: pitchCityPop,
                    annualHouseholdHealthSpend: pitchSpendPerHh,
                    digitalPenetrationPercent: pitchDigitalPen,
                    takeRatePercent: pitchTakeRate,
                  });
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50" data-testid="city-potential-results">
                      <div className="p-2 rounded bg-muted/30 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Total Households</span>
                        <div className="text-xs font-bold font-mono">{pot.households.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/30 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Outpatient Spend</span>
                        <div className="text-xs font-bold font-mono">₹{(pot.outpatientSpendInr / 10000000).toFixed(1)} Cr</div>
                      </div>
                      <div className="p-2 rounded bg-muted/30 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">Addressable Digital</span>
                        <div className="text-xs font-bold font-mono">₹{(pot.addressableDigitalSpendInr / 10000000).toFixed(1)} Cr</div>
                      </div>
                      <div className="p-2 rounded bg-muted/30 space-y-0.5">
                        <span className="text-[10px] text-muted-foreground">FindMedi Target GMV</span>
                        <div className="text-xs font-bold text-teal-700 dark:text-teal-400 font-mono">₹{(pot.findmediGmvInr / 10000000).toFixed(2)} Cr</div>
                      </div>
                      <div className="p-2 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 space-y-0.5">
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">FindMedi Annual Revenue</span>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-300 font-mono">₹{(pot.findmediRevenueInr / 100000).toFixed(1)} Lakhs</div>
                      </div>
                      <div className="p-2 rounded bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 space-y-0.5">
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold">Monthly Runrate</span>
                        <div className="text-xs font-bold text-purple-900 dark:text-purple-300 font-mono">₹{(pot.monthlyRevenueInr / 100000).toFixed(2)} L/mo</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Tab 4: Investor Q&A & Defense */}
            <TabsContent value="qa" className="space-y-4 pt-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="qa-selector">
                {INVESTOR_QA_MATRIX.map((qa) => (
                  <Button
                    key={qa.id}
                    variant={selectedQaId === qa.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedQaId(qa.id)}
                    className="h-7 text-xs px-2.5 shrink-0"
                    data-testid={`qa-btn-${qa.id}`}
                  >
                    {qa.id}: {qa.category}
                  </Button>
                ))}
              </div>

              {(() => {
                const curQa = INVESTOR_QA_MATRIX.find((q) => q.id === selectedQaId) || INVESTOR_QA_MATRIX[0];
                return (
                  <div className="p-4 rounded-lg border border-border/80 bg-card space-y-3" data-testid="active-qa-card">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">{curQa.id} • {curQa.category}</Badge>
                      <Badge variant="secondary" className="text-xs">Objection Defense</Badge>
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      "{curQa.question}"
                    </h4>

                    <div className="p-2.5 rounded bg-muted/40 border border-border/50 text-xs font-medium text-foreground/90">
                      🎯 Executive Summary: {curQa.answerSummary}
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hard Evidence & Defensive Moats</span>
                      <ul className="text-xs space-y-1.5">
                        {curQa.defensePoints.map((dp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{dp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Tab 5: Due Diligence Data Room & Funding Path */}
            <TabsContent value="dataroom" className="space-y-4 pt-3">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due-Diligence Data Room Index</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {DUE_DILIGENCE_DATA_ROOM.map((dd, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5">
                      <span className="text-xs font-bold text-foreground">{dd.category}</span>
                      <ul className="text-[11px] text-muted-foreground space-y-1">
                        {dd.documents.map((doc, docIdx) => (
                          <li key={docIdx} className="flex items-start gap-1.5">
                            <span className="text-purple-600 font-bold">•</span>
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Funding Paths & Alternatives</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FUNDING_PATH_ALTERNATIVES.map((fp, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{fp.path}</span>
                        <Badge variant="outline" className="text-[10px]">{fp.suitability}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{fp.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: 3-Phase GTM Roadmap */}
            <TabsContent value="gtm" className="space-y-4 pt-3">
              <div className="space-y-3">
                {GTM_THREE_PHASE_ROADMAP.map((phase, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-xs font-bold text-foreground">{phase.phase}</span>
                      <Badge variant="outline" className="text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40">
                        Target: {phase.target}
                      </Badge>
                    </div>
                    <ul className="text-xs space-y-1 text-muted-foreground pt-1">
                      {phase.milestones.map((m, midx) => (
                        <li key={midx} className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold">•</span>
                          <span className="text-foreground/90">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsPitchDeckOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Document 23: Super Admin Governance & Privacy Architecture Modal ─── */}
      <Dialog open={isGovernanceOpen} onOpenChange={setIsGovernanceOpen}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-y-auto"
          data-testid="governance-modal"
        >
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-300">
                Document 23 — Governance & Privacy Architecture
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                DPDP & DISHA Compliant
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground mt-1">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Super Admin Governance, Scoped Roles & Break-Glass Console
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              "Platform operators marketplace chalate hain; patient ka clinical data default me nahi dekhte." Zero clinical browsing by default, dynamic PII masking, 14 scoped admin roles, and time-boxed dual-approved emergency break-glass.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/60 text-xs">
              <TabsTrigger value="roles" className="py-2 gap-1.5" data-testid="gov-tab-roles">
                <UserCheck className="h-3.5 w-3.5" /> 14 Scoped Roles & Matrix
              </TabsTrigger>
              <TabsTrigger value="breakglass" className="py-2 gap-1.5" data-testid="gov-tab-breakglass">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" /> Break-Glass Console
              </TabsTrigger>
              <TabsTrigger value="support" className="py-2 gap-1.5" data-testid="gov-tab-support">
                <EyeOff className="h-3.5 w-3.5" /> Masked Support & OTP
              </TabsTrigger>
              <TabsTrigger value="sidebar" className="py-2 gap-1.5" data-testid="gov-tab-sidebar">
                <Layers className="h-3.5 w-3.5" /> Sidebar Feature Audit
              </TabsTrigger>
              <TabsTrigger value="checklist" className="py-2 gap-1.5" data-testid="gov-tab-checklist">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 10 Privacy Guarantees
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 14 Scoped Roles & Data Access Matrix */}
            <TabsContent value="roles" className="space-y-5 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Admin Roles</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">14 Scoped</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Least-privilege principle</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Default PHI Access</div>
                  <div className="text-xl font-bold text-rose-600 mt-0.5">0 (Zero)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Across all 14 roles</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Emergency Unblock</div>
                  <div className="text-xl font-bold text-amber-600 mt-0.5">Break-Glass</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">≤60 min lease + audit log</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Sensitive Specialties</div>
                  <div className="text-xl font-bold text-purple-600 mt-0.5">Dual Approval</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Mental & Sexual Health</div>
                </div>
              </div>

              {/* Roles Directory */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  14 Scoped Admin Roles Directory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {SCOPED_ADMIN_ROLES.map((role) => (
                    <div
                      key={role.code}
                      className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5 text-xs hover:border-primary/40 transition-colors"
                      data-testid={`role-card-${role.code}`}
                    >
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-bold text-foreground">{role.title}</span>
                        <div className="flex items-center gap-1">
                          {role.requiresMfa && (
                            <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 dark:bg-sky-950/40 border-sky-300">
                              MFA Required
                            </Badge>
                          )}
                          {role.canApproveBreakGlass && (
                            <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-300">
                              Break-Glass Approver
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-primary/80 font-medium">{role.department} · <span className="font-mono text-muted-foreground">{role.code}</span></div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{role.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {role.allowedScopes.map((sc) => (
                          <Badge key={sc} variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                            {sc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Access Matrix Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Data Access Control Matrix
                </h3>
                <div className="border border-border/70 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/70 border-b border-border text-[11px] font-semibold text-muted-foreground">
                        <th className="p-2.5">Data Category</th>
                        <th className="p-2.5">Superadmin</th>
                        <th className="p-2.5">KYC Reviewer</th>
                        <th className="p-2.5">Support L1</th>
                        <th className="p-2.5">Support L2</th>
                        <th className="p-2.5">Finance</th>
                        <th className="p-2.5">DPO</th>
                        <th className="p-2.5">Clinical Safety</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {DATA_ACCESS_MATRIX.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-2.5 font-medium text-foreground">{row.category}</td>
                          <td className="p-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              row.superadmin.includes('Break-Glass') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                              row.superadmin === 'Full' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                              row.superadmin === 'Masked' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {row.superadmin}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] text-muted-foreground">{row.kyc_reviewer}</span>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              row.support_l1 === 'None' ? 'text-slate-400' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40'
                            }`}>
                              {row.support_l1}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] text-muted-foreground">{row.support_l2}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] text-muted-foreground">{row.finance_admin}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-medium text-primary">{row.dpo}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] text-muted-foreground">{row.clinical_safety}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Break-Glass Protocol & Interactive Simulator */}
            <TabsContent value="breakglass" className="space-y-5 pt-3">
              <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    Emergency Break-Glass Protocol (≤60 Minutes Auto-Revoke)
                  </div>
                  <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                    Break-glass is strictly for life-or-death emergencies, formal court subpoenas, or fatal pharmacovigilance alerts. Access grants are time-boxed, immutably audit-logged, and trigger automated patient notification unless prohibited by a judicial gag order.
                  </p>
                </div>
              </div>

              {/* Allowed Reasons */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  Permitted Emergency Reason Codes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {BREAK_GLASS_POLICY.reasons.map((r) => (
                    <div key={r.code} className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{r.label}</span>
                        {r.requiresDualApproval ? (
                          <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-300">
                            Dual Approval
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                            Single Approver
                          </Badge>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">{r.code}</div>
                      <p className="text-muted-foreground text-[11px]">{r.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interactive Break-Glass Request Simulator */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Break-Glass Request Validator & Simulator
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">
                    Simulate Access Grant
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Requester Admin ID</Label>
                    <Input
                      value={bgRequesterId}
                      onChange={(e) => setBgRequesterId(e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder="e.g. ops-admin-42"
                      data-testid="bg-input-requester"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reason Code</Label>
                    <Select value={bgReasonCode} onValueChange={setBgReasonCode}>
                      <SelectTrigger className="h-8 text-xs mt-1" data-testid="bg-select-reason">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BREAK_GLASS_POLICY.reasons.map((r) => (
                          <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Case / Subpoena / Ticket ID</Label>
                    <Input
                      value={bgCaseNumber}
                      onChange={(e) => setBgCaseNumber(e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder="e.g. HC-JBP-2026-9041"
                      data-testid="bg-input-case"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Duration (Minutes, max 60)</Label>
                    <Input
                      type="number"
                      value={bgDuration}
                      onChange={(e) => setBgDuration(Number(e.target.value))}
                      className="h-8 text-xs mt-1"
                      min={1}
                      max={60}
                      data-testid="bg-input-duration"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Approver 1 ID (DPO/Sec/Owner)</Label>
                    <Input
                      value={bgApprover1}
                      onChange={(e) => setBgApprover1(e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder="e.g. dpo-officer"
                      data-testid="bg-input-approver1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Approver 2 ID (for dual-approval)</Label>
                    <Input
                      value={bgApprover2}
                      onChange={(e) => setBgApprover2(e.target.value)}
                      className="h-8 text-xs font-mono mt-1"
                      placeholder="e.g. security-lead"
                      data-testid="bg-input-approver2"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="bg-sensitive-check"
                    checked={bgIsSensitive}
                    onChange={(e) => setBgIsSensitive(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                    data-testid="bg-check-sensitive"
                  />
                  <Label htmlFor="bg-sensitive-check" className="text-xs font-normal cursor-pointer">
                    Sensitive Clinical Category (Mental Health / Psychiatry / Sexual Health) — <strong className="text-purple-600">Forces Dual Approval</strong>
                  </Label>
                </div>

                <div>
                  <Label className="text-xs">Emergency Justification (min 20 characters)</Label>
                  <Textarea
                    value={bgJustification}
                    onChange={(e) => setBgJustification(e.target.value)}
                    className="text-xs min-h-[60px] mt-1"
                    placeholder="Describe legal warrant, ER urgency, or adverse drug batch investigation..."
                    data-testid="bg-textarea-justification"
                  />
                  <span className="text-[10px] text-muted-foreground">{bgJustification.length} / 20 characters minimum</span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const approvers = [bgApprover1.trim(), bgApprover2.trim()].filter(Boolean);
                      const res = validateBreakGlassRequest({
                        requesterId: bgRequesterId.trim(),
                        reasonCode: bgReasonCode,
                        justification: bgJustification.trim(),
                        caseOrTicketId: bgCaseNumber.trim(),
                        durationMinutes: Number(bgDuration),
                        isSensitiveCategory: bgIsSensitive,
                        approverIds: approvers,
                      });
                      setBgValidationResult(res);
                    }}
                    className="gap-1.5 h-8 bg-rose-600 hover:bg-rose-700 text-white"
                    data-testid="validate-breakglass-btn"
                  >
                    <FileCheck className="h-3.5 w-3.5" /> Validate Break-Glass Request
                  </Button>
                </div>

                {/* Validation Result Display */}
                {bgValidationResult && (
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      bgValidationResult.valid
                        ? 'bg-emerald-50/80 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                        : 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
                    }`}
                    data-testid="breakglass-validation-result"
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      {bgValidationResult.valid ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-800 dark:text-emerald-300">
                            VALID BREAK-GLASS GRANT APPROVED ({bgDuration} Min Lease)
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                          <span className="text-rose-800 dark:text-rose-300">
                            BREAK-GLASS REJECTED — Governance Violations Detected
                          </span>
                        </>
                      )}
                    </div>
                    {bgValidationResult.valid ? (
                      <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                        Request complies with platform privacy governance. Immutable audit record generated. Dual-approval: {bgValidationResult.requiresDualApproval ? 'Verified (2 sign-offs)' : 'Single approver verified'}.
                      </p>
                    ) : (
                      <ul className="text-rose-700 dark:text-rose-400 text-[11px] space-y-0.5 list-disc pl-4">
                        {bgValidationResult.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 3: Masked Support Tools & OTP Assist Session */}
            <TabsContent value="support" className="space-y-5 pt-3">
              <div className="p-3.5 rounded-lg border border-sky-300 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-900/60 flex items-start gap-3">
                <EyeOff className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sky-900 dark:text-sky-200">
                    Frontline Masked Support & Assist Sessions
                  </div>
                  <p className="text-sky-800/90 dark:text-sky-300/80 leading-relaxed">
                    Customer support operators (L1/L2) never see full patient phone numbers, email addresses, or home locations by default. When a patient requests phone callback or live help, the patient receives a 6-digit OTP to consent to a temporary 15-minute unmasked assist session.
                  </p>
                </div>
              </div>

              {/* Live Interactive PII Masking Tester */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Input Raw Patient PII (Simulator)
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <Label className="text-[11px]">Full Name</Label>
                      <Input
                        value={rawPatientInput.name}
                        onChange={(e) => setRawPatientInput({ ...rawPatientInput, name: e.target.value })}
                        className="h-8 text-xs mt-0.5"
                        data-testid="mask-input-name"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Phone Number</Label>
                      <Input
                        value={rawPatientInput.phone}
                        onChange={(e) => setRawPatientInput({ ...rawPatientInput, phone: e.target.value })}
                        className="h-8 text-xs mt-0.5"
                        data-testid="mask-input-phone"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Email Address</Label>
                      <Input
                        value={rawPatientInput.email}
                        onChange={(e) => setRawPatientInput({ ...rawPatientInput, email: e.target.value })}
                        className="h-8 text-xs mt-0.5"
                        data-testid="mask-input-email"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Residential Address</Label>
                      <Input
                        value={rawPatientInput.address}
                        onChange={(e) => setRawPatientInput({ ...rawPatientInput, address: e.target.value })}
                        className="h-8 text-xs mt-0.5"
                        data-testid="mask-input-address"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <EyeOff className="h-4 w-4 text-sky-600" />
                      Dynamic Masked View for Support Desk
                    </h3>
                    <Badge variant={otpAssistUnlocked ? 'destructive' : 'secondary'} className="text-[10px]">
                      {otpAssistUnlocked ? 'Assist Session Active' : 'Masked by Default'}
                    </Badge>
                  </div>

                  {(() => {
                    const masked = maskPatientPii(rawPatientInput);
                    return (
                      <div className="space-y-2.5 text-xs">
                        <div className="p-2 rounded bg-muted/60 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Display Name</span>
                          <div className="font-mono text-xs font-semibold text-foreground" data-testid="masked-display-name">
                            {otpAssistUnlocked ? rawPatientInput.name : masked.name}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-muted/60 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Phone Number</span>
                          <div className="font-mono text-xs font-semibold text-foreground" data-testid="masked-display-phone">
                            {otpAssistUnlocked ? rawPatientInput.phone : masked.phone}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-muted/60 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Email Address</span>
                          <div className="font-mono text-xs font-semibold text-foreground" data-testid="masked-display-email">
                            {otpAssistUnlocked ? rawPatientInput.email : masked.email}
                          </div>
                        </div>
                        <div className="p-2 rounded bg-muted/60 space-y-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">Address</span>
                          <div className="font-mono text-xs font-semibold text-foreground" data-testid="masked-display-address">
                            {otpAssistUnlocked ? rawPatientInput.address : masked.address}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* OTP-Gated Support Assist Session Simulator */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-amber-600" />
                      Patient-Consented Assist Session Unlock (OTP-Gated)
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Requires patient verbal confirmation of 6-digit OTP sent to their registered WhatsApp / SMS.
                    </p>
                  </div>
                  {otpAssistUnlocked ? (
                    <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 border-rose-300">
                      ⏱ 14:59 Mins Remaining
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                      🔒 Locked
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {!otpAssistUnlocked ? (
                    <>
                      <Input
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                        placeholder="Enter 6-digit Patient OTP (e.g. 123456)"
                        className="h-8 text-xs font-mono max-w-xs"
                        maxLength={6}
                        data-testid="assist-otp-input"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (otpInput.trim().length === 6) {
                            setOtpAssistUnlocked(true);
                            toast.success('Patient assist session unlocked for 15 minutes.');
                          } else {
                            toast.error('Please enter a 6-digit OTP.');
                          }
                        }}
                        className="h-8 text-xs gap-1.5"
                        data-testid="unlock-assist-btn"
                      >
                        <Key className="h-3.5 w-3.5" /> Unlock Temporary Assist Session
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Live Assist Session Active: Operator can view unmasked phone for callback.
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setOtpAssistUnlocked(false);
                          setOtpInput('');
                          toast.info('Assist session ended. Contact data re-masked.');
                        }}
                        className="h-8 text-xs"
                        data-testid="revoke-assist-btn"
                      >
                        End Assist Session
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Admin Sidebar Feature Audit */}
            <TabsContent value="sidebar" className="space-y-4 pt-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Admin Sidebar Audit (Keep / Restrict / Remove / Add)
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Comprehensive review of all superadmin pages against privacy and data minimization laws.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">KEEP: 2</Badge>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700">RESTRICT: 4</Badge>
                  <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700">REMOVE: 1</Badge>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700">ADD NEW: 2</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ADMIN_SIDEBAR_SPEC.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border/80 bg-card space-y-1.5 text-xs hover:border-primary/40 transition-colors"
                    data-testid={`sidebar-item-${item.id}`}
                  >
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="font-bold text-foreground">{item.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-semibold ${
                          item.action === 'KEEP_AS_IS' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                          item.action === 'RESTRICT_ACCESS' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                          item.action === 'REMOVE_OR_REPLACE' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                          'bg-sky-50 text-sky-700 border-sky-300'
                        }`}
                      >
                        {item.action}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">{item.reason}</p>
                    <div className="pt-1 flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-semibold">Authorized:</span>
                      {item.allowedRoles.length > 0 ? (
                        item.allowedRoles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                            {r}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold">Prohibited for ALL platform roles</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 5: 10 Privacy Guarantees */}
            <TabsContent value="checklist" className="space-y-4 pt-3">
              <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    The 10 Non-Negotiable Privacy Guarantees
                  </div>
                  <p className="text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
                    Designed to withstand regulatory scrutiny under the Digital Personal Data Protection (DPDP) Act, DISHA draft rules, and NMC ethical guidelines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRIVACY_GUARANTEES.map((g) => (
                  <div
                    key={g.num}
                    className="p-3.5 rounded-lg border border-border/80 bg-card space-y-1.5 text-xs flex items-start gap-3 hover:border-emerald-500/40 transition-colors"
                    data-testid={`privacy-guarantee-${g.num}`}
                  >
                    <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      {g.num}
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-foreground">{g.title}</div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{g.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsGovernanceOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Document 24: Ops CRM & Team Management Specification Modal ─── */}
      <Dialog open={isOpsTeamSpecOpen} onOpenChange={setIsOpsTeamSpecOpen}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-y-auto"
          data-testid="ops-team-spec-modal"
        >
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/40 border-blue-300">
                Document 24 — Ops CRM & Team Management
              </Badge>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-300">
                Zero Patient PHI Isolated
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground mt-1">
              <Briefcase className="h-5 w-5 text-blue-600" />
              Ops CRM & Team Management Specification
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Platform operations cockpit, 10-stage supply funnel, provider 360 health scoring, institutional partnerships, field white-space mapping, team scorecards, and event-driven automation rules.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="modules" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted/60 text-xs">
              <TabsTrigger value="modules" className="py-2 gap-1.5" data-testid="crm-tab-modules">
                <Layers className="h-3.5 w-3.5" /> 13 Modules & Hybrid
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="py-2 gap-1.5" data-testid="crm-tab-pipeline">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Supply & Partnerships
              </TabsTrigger>
              <TabsTrigger value="scoring" className="py-2 gap-1.5" data-testid="crm-tab-scoring">
                <Calculator className="h-3.5 w-3.5" /> Scoring Engines
              </TabsTrigger>
              <TabsTrigger value="team" className="py-2 gap-1.5" data-testid="crm-tab-team">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Role KPI Scorecards
              </TabsTrigger>
              <TabsTrigger value="automation" className="py-2 gap-1.5" data-testid="crm-tab-automation">
                <Cpu className="h-3.5 w-3.5" /> Automation & Privacy
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 13 CRM Nav Modules & Hybrid Architecture */}
            <TabsContent value="modules" className="space-y-5 pt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Nav Modules</div>
                  <div className="text-xl font-bold text-foreground mt-0.5">13 Dedicated</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Superadmin CRM group</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Architecture</div>
                  <div className="text-xl font-bold text-blue-600 mt-0.5">Hybrid</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Build core / buy generic</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Patient PHI</div>
                  <div className="text-xl font-bold text-rose-600 mt-0.5">Zero (Banned)</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Strict anti-leak isolation</div>
                </div>
                <div className="p-3 rounded-lg border border-border/80 bg-card">
                  <div className="text-[11px] font-semibold text-muted-foreground">Team Entity</div>
                  <div className="text-xl font-bold text-emerald-600 mt-0.5">TeamMember</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Isolated from tenant Staff</div>
                </div>
              </div>

              {/* 13 CRM Nav Modules Directory */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  13 Super Admin CRM Navigation Modules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {CRM_NAV_MODULES.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5 text-xs hover:border-blue-400/50 transition-colors"
                      data-testid={`crm-nav-card-${m.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{m.title}</span>
                        <Badge variant="outline" className="text-[9px] font-mono">{m.path.replace('/superadmin/crm/', '')}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{m.purpose}</p>
                      <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold pt-0.5">
                        Core Metric: {m.coreMetric}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hybrid Build vs Buy Decision Grid */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Wrench className="h-4 w-4 text-primary" />
                    Hybrid Build vs Buy Blueprint
                  </h3>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">Recommended Strategy</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">✅ Build In-House (Platform Native)</span>
                    <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                      {HYBRID_ARCHITECTURE_DECISION.buildInHouse.map((item, idx) => (
                        <li key={idx}><strong className="text-foreground">{item}</strong></li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border space-y-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">🛠 Buy / Use Existing Tools (External SaaS)</span>
                    <ul className="space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                      {HYBRID_ARCHITECTURE_DECISION.buyOrIntegrate.map((item, idx) => (
                        <li key={idx}><strong className="text-foreground">{item}</strong></li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">Strict Rules for External Tools:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {HYBRID_ARCHITECTURE_DECISION.externalToolGuardrails.map((g, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">{g}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Supply Pipeline Stages & Partnerships */}
            <TabsContent value="pipeline" className="space-y-5 pt-3">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  10 Supply Pipeline Stages & Exit Criteria
                </h3>
                <div className="border border-border/70 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/70 border-b border-border text-[11px] font-semibold text-muted-foreground">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Pipeline Stage</th>
                        <th className="p-2.5">SLA Target</th>
                        <th className="p-2.5">Mandatory Exit Criteria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {SUPPLY_PIPELINE_STAGES.map((st, idx) => (
                        <tr key={st.stage} className="hover:bg-muted/30" data-testid={`supply-stage-row-${st.stage}`}>
                          <td className="p-2.5 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-foreground">{st.label}</td>
                          <td className="p-2.5">
                            {st.slaDays ? (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 border-blue-300">
                                {st.slaDays} Days
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-[11px]">{st.exitCriteria}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mandatory Lost Reasons */}
              <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5 text-amber-600" />
                  Mandatory Lost Reasons for Churned Leads
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {LOST_REASONS.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px] font-mono bg-amber-50 text-amber-800 dark:bg-amber-950/40 border-amber-300">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Institutional Partnerships Stages */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  Institutional Partnerships Pipeline (RWAs, Corporates, NGOs)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {PARTNERSHIP_STAGES.map((ps, idx) => (
                    <div key={ps.stage} className="p-2.5 rounded-lg border border-border/70 bg-card space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{idx + 1}. {ps.label}</span>
                        <Badge variant="secondary" className="text-[9px] font-mono">{ps.stage}</Badge>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{ps.exitCriteria}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: Scoring Engines (Lead Score & Provider Health Score) */}
            <TabsContent value="scoring" className="space-y-5 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lead Scoring Simulator */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      Lead Priority Score (0–100)
                    </h3>
                    {(() => {
                      const score = calculateLeadScore({
                        isPriorityCategory: leadPriorityCat,
                        estDailyFootfall: leadFootfall,
                        hasDirectDecisionMakerAccess: leadDirectDm,
                        isDigitallyReady: leadDigital,
                        isCloseToCluster: leadCluster,
                        hasFastResponse: leadFastResp,
                        hasDocsReady: leadDocsReady,
                      });
                      return (
                        <Badge
                          className={`text-xs font-bold ${
                            score >= 70 ? 'bg-emerald-600 text-white' : score >= 45 ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                          }`}
                          data-testid="live-lead-score"
                        >
                          Score: {score} / 100
                        </Badge>
                      );
                    })()}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-cat-check" className="cursor-pointer text-[11px]">High Demand Category (+25)</Label>
                      <input
                        type="checkbox"
                        id="lead-cat-check"
                        checked={leadPriorityCat}
                        onChange={(e) => setLeadPriorityCat(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-cat-check"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Est. Daily Footfall (+20 for ≥30)</span>
                        <span className="font-bold">{leadFootfall} patients/day</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        value={leadFootfall}
                        onChange={(e) => setLeadFootfall(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="lead-footfall-slider"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-dm-check" className="cursor-pointer text-[11px]">Direct Doctor/Owner Access (+15)</Label>
                      <input
                        type="checkbox"
                        id="lead-dm-check"
                        checked={leadDirectDm}
                        onChange={(e) => setLeadDirectDm(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-dm-check"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-digi-check" className="cursor-pointer text-[11px]">Digitally Ready (WhatsApp/Billing) (+10)</Label>
                      <input
                        type="checkbox"
                        id="lead-digi-check"
                        checked={leadDigital}
                        onChange={(e) => setLeadDigital(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-digi-check"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-clust-check" className="cursor-pointer text-[11px]">Near Demand Cluster &lt;3km (+10)</Label>
                      <input
                        type="checkbox"
                        id="lead-clust-check"
                        checked={leadCluster}
                        onChange={(e) => setLeadCluster(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-clust-check"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-resp-check" className="cursor-pointer text-[11px]">Fast Outreach Response &lt;24h (+10)</Label>
                      <input
                        type="checkbox"
                        id="lead-resp-check"
                        checked={leadFastResp}
                        onChange={(e) => setLeadFastResp(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-resp-check"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="lead-docs-check" className="cursor-pointer text-[11px]">Registration & Bank Docs Ready (+10)</Label>
                      <input
                        type="checkbox"
                        id="lead-docs-check"
                        checked={leadDocsReady}
                        onChange={(e) => setLeadDocsReady(e.target.checked)}
                        className="h-4 w-4"
                        data-testid="lead-docs-check"
                      />
                    </div>
                  </div>
                </div>

                {/* Provider Composite Health Score Simulator */}
                <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <HeartPulse className="h-4 w-4 text-emerald-600" />
                      Provider Health Score (0–100)
                    </h3>
                    {(() => {
                      const health = calculateProviderHealthScore({
                        monthlyBookings: provBookings,
                        prevMonthlyBookings: provPrevBookings,
                        averageRating: provRating,
                        avgResponseMinutes: provResponseMin,
                        cancellationRatePercent: provCancelRate,
                        profileCompletenessPercent: provProfileComp,
                        daysUntilDocExpiry: provDocExpiryDays,
                        openDisputesCount: provDisputes,
                      });
                      return (
                        <div className="flex items-center gap-1.5" data-testid="live-provider-health">
                          <Badge
                            className={`text-xs font-bold ${
                              health.healthBand === 'healthy' ? 'bg-emerald-600 text-white' :
                              health.healthBand === 'watch' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {health.score} ({health.healthBand.toUpperCase()})
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Monthly Bookings (vs {provPrevBookings} prev)</span>
                        <span className="font-bold">{provBookings} bookings</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={provBookings}
                        onChange={(e) => setProvBookings(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-bookings-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Patient Rating (2.5 to 5.0)</span>
                        <span className="font-bold">★ {provRating.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min={2.5}
                        max={5.0}
                        step={0.1}
                        value={provRating}
                        onChange={(e) => setProvRating(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-rating-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Response Time (mins)</span>
                        <span className="font-bold">{provResponseMin} min</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={120}
                        value={provResponseMin}
                        onChange={(e) => setProvResponseMin(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-resp-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Cancellation / No-Show Rate</span>
                        <span className="font-bold">{provCancelRate}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={provCancelRate}
                        onChange={(e) => setProvCancelRate(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-cancel-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Profile Completeness %</span>
                        <span className="font-bold">{provProfileComp}%</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        value={provProfileComp}
                        onChange={(e) => setProvProfileComp(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-comp-slider"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span>Days Until Nearest Document Expiry</span>
                        <span className="font-bold">{provDocExpiryDays} days</span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={365}
                        value={provDocExpiryDays}
                        onChange={(e) => setProvDocExpiryDays(Number(e.target.value))}
                        className="w-full mt-1"
                        data-testid="prov-expiry-slider"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: Role-Based KPI Scorecards */}
            <TabsContent value="team" className="space-y-4 pt-3">
              <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">
                    Pairing Quantity with Quality to Prevent Gaming
                  </div>
                  <p className="text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed">
                    Pure volume quotas lead to junk leads, spam applications, and toxic competition. Every operational role's scorecard pairs quantity output with strict quality guardrails (approval rates, 90-day retention, CSAT, audit accuracy).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {ROLE_BASED_KPIS.map((rk) => (
                  <div
                    key={rk.role}
                    className="p-3.5 rounded-lg border border-border/80 bg-card space-y-2 text-xs hover:border-emerald-500/40 transition-colors"
                    data-testid={`role-kpi-${rk.role}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{rk.title}</span>
                      <Badge variant="outline" className="text-[9px] font-mono">{rk.department}</Badge>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">📊 Quantity Output:</span>
                      <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                        {rk.quantityKpis.map((qk, qidx) => (
                          <li key={qidx}>{qk}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-border/60">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">🛡 Quality Guardrail:</span>
                      <ul className="text-[11px] text-foreground/90 list-disc pl-4 space-y-0.5">
                        {rk.qualityKpis.map((qk, qidx) => (
                          <li key={qidx}>{qk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 5: Automation Rules & Privacy Guardrails */}
            <TabsContent value="automation" className="space-y-4 pt-3">
              <div className="p-3.5 rounded-lg border border-blue-300 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/60 flex items-start gap-3">
                <Cpu className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-blue-900 dark:text-blue-200">
                    12 Event-Driven Platform CRM Automations
                  </div>
                  <p className="text-blue-800/90 dark:text-blue-300/80 leading-relaxed">
                    Automations trigger off platform events (application submission, KYC verification, booking completions, license expiry) with rate limits, opt-in checks, and immutable execution logs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {AUTOMATION_WORKFLOW_RULES.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-lg border border-border/70 bg-card space-y-1.5 text-xs hover:border-blue-400/50 transition-colors"
                    data-testid={`auto-rule-${rule.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-blue-600 dark:text-blue-400">{rule.id}</span>
                      <Badge variant="outline" className="text-[9px]">SLA: {rule.slaHours}h</Badge>
                    </div>
                    <div className="text-[11px] font-semibold text-foreground">Trigger: {rule.trigger}</div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">Action: {rule.action}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button variant="outline" onClick={() => setIsOpsTeamSpecOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


