import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  FlaskConical,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Building2,
  Users,
  UsersRound,
  FileText,
  Sparkles,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  UserCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const TABS = [
  { id: 'roles', label: 'Roles & Templates', icon: ShieldCheck },
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'teams', label: 'Teams & Groups', icon: UsersRound },
  { id: 'assignments', label: 'Assignments', icon: Users },
  { id: 'scopes', label: 'Scopes & Hierarchy', icon: Building2 },
  { id: 'requests', label: 'Access Requests', icon: Inbox },
  { id: 'reviews', label: 'Access Reviews', icon: UserCheck },
  { id: 'simulator', label: 'Policy Simulator', icon: FlaskConical },
  { id: 'analyzer', label: 'Access Analyzer', icon: AlertTriangle },
  { id: 'grants', label: 'Emergency Break-Glass', icon: Zap },
  { id: 'apikeys', label: 'API Keys', icon: KeyRound },
  { id: 'activity', label: 'Activity & Audit', icon: Activity },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AccessControl() {
  const [tab, setTab] = useState<TabId>('roles');
  const [loading, setLoading] = useState(false);

  // Data states
  const [roles, setRoles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>({ actions: [], sensitivityClasses: [] });
  const [principals, setPrincipals] = useState<{ users: any[]; groups: any[] }>({ users: [], groups: [] });
  const [assignments, setAssignments] = useState<any[]>([]);
  const [scopes, setScopes] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [analyzer, setAnalyzer] = useState<any>({ summary: {}, findings: [] });
  const [grants, setGrants] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<{ entries: any[]; total: number }>({ entries: [], total: 0 });
  const [iamMetrics, setIamMetrics] = useState<any>({});
  const [logFlaggedOnly, setLogFlaggedOnly] = useState(false);

  // Form states
  const [roleForm, setRoleForm] = useState({ name: '', templateKey: '', selectedActions: [] as string[] });
  const [roleSearch, setRoleSearch] = useState('');
  const [actionSearch, setActionSearch] = useState('');

  const [assignForm, setAssignForm] = useState({
    principalType: 'user',
    principalId: '',
    roleId: '',
    wardIds: [] as string[],
    deptIds: [] as string[],
    careTeamOnly: false,
    mfa: true,
    shift: false,
    hospitalIp: false,
    expiresInDays: 0,
    reason: '',
  });

  const [scopeForm, setScopeForm] = useState({ type: 'ward', name: '', key: '' });

  const [simForm, setSimForm] = useState({
    userId: '',
    action: 'vitals:write',
    resourceType: 'ward',
    resourceId: 'ward-3',
    onShift: true,
    mfa: true,
  });
  const [simResult, setSimResult] = useState<any>(null);

  const [grantForm, setGrantForm] = useState({
    subjectType: 'patient',
    subjectId: '',
    reasonCode: 'emergency_care',
    ticketId: '',
    reasonNote: '',
    minutes: 30,
  });

  const [keyForm, setKeyForm] = useState({ name: '', ipBinding: '', expiresDays: 90 });
  const [generatedKey, setGeneratedKey] = useState('');

  const [policyForm, setPolicyForm] = useState({ name: '', templateKey: '' });
  const [groupForm, setGroupForm] = useState({ name: '', memberIds: [] as string[] });

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        rolesRes,
        templatesRes,
        catalogRes,
        principalsRes,
        assignRes,
        scopesRes,
        reqsRes,
        reviewsRes,
        analyzerRes,
        grantsRes,
        keysRes,
        policiesRes,
        groupsRes,
        logRes,
        metricsRes,
      ] = await Promise.allSettled([
        api.getIamRoles(),
        api.getIamTemplates(),
        api.getIamCatalog(),
        api.getIamPrincipals(),
        api.getIamAssignments(),
        api.getIamScopes(),
        api.getIamRequests(),
        api.getIamReviews(),
        api.getIamAnalyzer(),
        api.getIamGrants(),
        api.getIamApiKeys(),
        api.getIamPolicies(),
        api.getIamGroups(),
        api.getIamAccessLog({ limit: '100' }),
        api.getIamAccessMetrics(),
      ]);

      if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value?.roles || []);
      if (templatesRes.status === 'fulfilled') setTemplates(templatesRes.value?.templates || []);
      if (catalogRes.status === 'fulfilled') setCatalog(catalogRes.value || { actions: [], sensitivityClasses: [] });
      if (principalsRes.status === 'fulfilled') setPrincipals(principalsRes.value || { users: [], groups: [] });
      if (assignRes.status === 'fulfilled') setAssignments(assignRes.value?.assignments || []);
      if (scopesRes.status === 'fulfilled') setScopes(scopesRes.value?.scopes || []);
      if (reqsRes.status === 'fulfilled') setRequests(reqsRes.value?.requests || []);
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value?.reviews || []);
      if (analyzerRes.status === 'fulfilled') setAnalyzer(analyzerRes.value || { summary: {}, findings: [] });
      if (grantsRes.status === 'fulfilled') setGrants(grantsRes.value?.grants || []);
      if (keysRes.status === 'fulfilled') setApiKeys(keysRes.value?.apiKeys || []);
      if (policiesRes.status === 'fulfilled') setPolicies(policiesRes.value?.policies || []);
      if (groupsRes.status === 'fulfilled') setGroups(groupsRes.value?.groups || []);
      if (logRes.status === 'fulfilled') {
        setAccessLog({ entries: logRes.value?.entries || [], total: logRes.value?.total || 0 });
      }
      if (metricsRes.status === 'fulfilled') setIamMetrics(metricsRes.value || {});
    } catch (err: any) {
      toast.error('Failed to load some IAM resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Actions ──
  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) return toast.error('Role name is required');
    try {
      await api.createIamRole({
        name: roleForm.name.trim(),
        templateKey: roleForm.templateKey || undefined,
      });
      toast.success('Role created successfully');
      setRoleForm({ name: '', templateKey: '', selectedActions: [] });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create role');
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignForm.principalId) return toast.error('Principal selection is required');
    if (!assignForm.roleId) return toast.error('Role selection is required');
    try {
      const expiresAt =
        assignForm.expiresInDays > 0
          ? new Date(Date.now() + assignForm.expiresInDays * 86400000).toISOString()
          : null;

      await api.createIamAssignment({
        principalType: assignForm.principalType,
        principalId: assignForm.principalId,
        roleId: assignForm.roleId,
        scope: {
          wardIds: assignForm.wardIds,
          deptIds: assignForm.deptIds,
          careTeamOnly: assignForm.careTeamOnly,
        },
        conditions: {
          mfa: assignForm.mfa,
          shift: assignForm.shift ? 'current' : undefined,
          ip: assignForm.hospitalIp ? ['hospital-network'] : undefined,
        },
        expiresAt,
        reason: assignForm.reason || 'Admin granted access via Access Control Center',
      });
      toast.success('Fine-grained access granted. Session token refreshed for user.');
      setAssignForm({
        principalType: 'user',
        principalId: '',
        roleId: '',
        wardIds: [],
        deptIds: [],
        careTeamOnly: false,
        mfa: true,
        shift: false,
        hospitalIp: false,
        expiresInDays: 0,
        reason: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Assignment failed (self-grant or unapproved critical grant blocked)');
    }
  };

  const handleRevokeAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this access assignment immediately?')) return;
    try {
      await api.revokeIamAssignment(id);
      toast.success('Assignment revoked and sessions updated');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Revocation failed');
    }
  };

  const handleCreateScope = async () => {
    if (!scopeForm.name.trim() || !scopeForm.key.trim()) return toast.error('Name and Key required');
    try {
      await api.createIamScope({
        type: scopeForm.type,
        name: scopeForm.name.trim(),
        key: scopeForm.key.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      toast.success('Resource scope created');
      setScopeForm({ type: 'ward', name: '', key: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Scope creation failed');
    }
  };

  const handleCreatePolicy = async () => {
    if (!policyForm.name.trim()) return toast.error('Policy name is required');
    const tpl: any = templates.find((t: any) => t.key === policyForm.templateKey);
    if (!tpl) return toast.error('Pick a base template (statements must exist)');
    try {
      await api.createIamPolicy({
        name: policyForm.name.trim(),
        statements: tpl.statements || [],
      });
      toast.success('Policy created');
      setPolicyForm({ name: '', templateKey: '' });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Policy creation failed');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) return toast.error('Group name is required');
    if (!groupForm.memberIds.length) return toast.error('Pick at least one member');
    try {
      await api.createIamGroup({ name: groupForm.name.trim(), memberIds: groupForm.memberIds });
      toast.success('Team/group created');
      setGroupForm({ name: '', memberIds: [] });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Group creation failed');
    }
  };

  const refreshAccessLog = async (flaggedOnly = logFlaggedOnly) => {
    try {
      const res: any = await api.getIamAccessLog({
        limit: '100',
        ...(flaggedOnly ? { flagged: 'true' } : {}),
      });
      setAccessLog({ entries: res?.entries || [], total: res?.total || 0 });
      const m: any = await api.getIamAccessMetrics();
      setIamMetrics(m || {});
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load activity log');
    }
  };

  const handleSimulate = async () => {
    if (!simForm.userId || !simForm.action) return toast.error('User and Action are required');
    try {
      const res: any = await api.iamSimulate({
        userId: simForm.userId,
        action: simForm.action,
        resource: { type: simForm.resourceType, id: simForm.resourceId },
      });
      setSimResult(res);
    } catch (err: any) {
      toast.error(err?.message || 'Simulation error');
    }
  };

  const handleDecideRequest = async (id: string, action: 'approve' | 'deny') => {
    try {
      await api.decideIamRequest(id, { action });
      toast.success(`Request ${action}d`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Decision failed (maker-checker violation)');
    }
  };

  const handleStartReview = async () => {
    try {
      const cycle = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}-Certification`;
      await api.createIamReview({ cycle });
      toast.success(`Access certification cycle "${cycle}" initiated`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start review cycle');
    }
  };

  const handleReviewDecision = async (reviewId: string, itemId: string, decision: 'keep' | 'revoke') => {
    try {
      await api.patchIamReview(reviewId, {
        decisions: [{ itemId, decision, note: `${decision.toUpperCase()} by admin review` }],
      });
      toast.success(`Marked as ${decision}`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Review item update failed');
    }
  };

  const handleCompleteReview = async (reviewId: string) => {
    try {
      await api.patchIamReview(reviewId, { complete: true });
      toast.success('Access review cycle finalized and logged to compliance audit');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to finalize review');
    }
  };

  const handleCreateGrant = async () => {
    if (!grantForm.subjectId) return toast.error('Patient or Record ID required');
    try {
      await api.createIamGrant({
        subjectType: grantForm.subjectType,
        subjectId: grantForm.subjectId,
        reasonCode: grantForm.reasonCode,
        ticketId: grantForm.ticketId,
        reasonNote: grantForm.reasonNote,
        minutes: grantForm.minutes,
      });
      toast.success('Emergency break-glass requested. Dual approval required for restricted cases.');
      setGrantForm({
        subjectType: 'patient',
        subjectId: '',
        reasonCode: 'emergency_care',
        ticketId: '',
        reasonNote: '',
        minutes: 30,
      });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Emergency grant failed');
    }
  };

  const handleDecideGrant = async (id: string, action: 'approve' | 'deny') => {
    try {
      await api.decideIamGrant(id, { action });
      toast.success(`Grant ${action}d`);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Grant decision failed');
    }
  };

  const handleRevokeGrant = async (id: string) => {
    try {
      await api.revokeIamGrant(id);
      toast.success('Emergency break-glass grant revoked immediately');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Revocation failed');
    }
  };

  const handleCreateApiKey = async () => {
    if (!keyForm.name.trim()) return toast.error('Key name is required');
    try {
      const ips = keyForm.ipBinding
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const expiresAt =
        keyForm.expiresDays > 0
          ? new Date(Date.now() + keyForm.expiresDays * 86400000).toISOString()
          : null;
      const res: any = await api.createIamApiKey({
        name: keyForm.name.trim(),
        ipBinding: ips,
        expiresAt,
      });
      setGeneratedKey(res?.key || '');
      toast.success('Service account API key created — copy now!');
      setKeyForm({ name: '', ipBinding: '', expiresDays: 90 });
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Key creation failed');
    }
  };

  const handleRevokeApiKey = async (id: string) => {
    if (!confirm('Revoke this API key immediately? Connected HL7/PACS machines will lose access.')) return;
    try {
      await api.revokeIamApiKey(id);
      toast.success('API key revoked');
      loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Key revocation failed');
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name?.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.type?.toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-heading">Access Control Center</h1>
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
                AWS-IAM Equivalent
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Fine-grained hospital access control: least-privilege roles, department/ward scopes, time-bound grants,
              and security analyzers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.id === 'analyzer' && analyzer.summary?.totalFindings > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-destructive text-destructive-foreground font-bold">
                  {analyzer.summary.totalFindings}
                </span>
              )}
              {t.id === 'requests' && requests.filter((r) => r.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                  {requests.filter((r) => r.status === 'pending').length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: Roles & Templates ── */}
      {tab === 'roles' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Create Role
              </CardTitle>
              <CardDescription>
                Clone from managed healthcare templates or start with custom fine-grained permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Role Name</label>
                <Input
                  placeholder="e.g. Ward-3 Head Nurse, Billing Auditor"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Base Template</label>
                <select
                  aria-label="Managed Template"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={roleForm.templateKey}
                  onChange={(e) => setRoleForm({ ...roleForm, templateKey: e.target.value })}
                >
                  <option value="">Custom Empty Role</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.key} value={tmpl.key}>
                      {tmpl.name} ({tmpl.key})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Templates pre-populate least-privilege statements vetted for clinical workflows.
                </p>
              </div>

              <Button onClick={handleCreateRole} disabled={!roleForm.name.trim()} className="w-full">
                Create & Save Role
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Active Tenant Roles ({roles.length})</CardTitle>
                <CardDescription>Roles available for assignment to hospital staff and groups.</CardDescription>
              </div>
              <div className="w-48">
                <Input
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredRoles.map((r) => (
                <div
                  key={r._id}
                  className="p-3.5 rounded-lg border border-border/60 hover:border-primary/40 transition-colors bg-card flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{r.name}</span>
                      <Badge variant={r.type === 'managed' ? 'secondary' : 'default'} className="text-[10px]">
                        {r.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">v{r.version}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Attached Policies: {r.policyIds?.length || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignForm((prev) => ({ ...prev, roleId: r._id }));
                        setTab('assignments');
                      }}
                      className="text-xs h-8"
                    >
                      Assign Staff
                    </Button>
                  </div>
                </div>
              ))}
              {filteredRoles.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">No roles match your search.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: Assignments ── */}
      {tab === 'assignments' && (
        <div className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Grant Fine-Grained Access (No Self-Grant)
              </CardTitle>
              <CardDescription>
                Assign a role or custom policy with resource scopes (Wards, Departments) and zero-trust conditions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Principal Type</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                    value={assignForm.principalType}
                    onChange={(e) => setAssignForm({ ...assignForm, principalType: e.target.value })}
                  >
                    <option value="user">Individual Staff Member</option>
                    <option value="group">Team / Department Group</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {assignForm.principalType === 'user' ? 'Staff Member' : 'Group'}
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                    value={assignForm.principalId}
                    onChange={(e) => setAssignForm({ ...assignForm, principalId: e.target.value })}
                  >
                    <option value="">Select principal...</option>
                    {assignForm.principalType === 'user'
                      ? principals.users.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email}) — {u.role}
                          </option>
                        ))
                      : principals.groups.map((g) => (
                          <option key={g._id} value={g._id}>
                            {g.name} ({g.memberIds?.length || 0} members)
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Role</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                    value={assignForm.roleId}
                    onChange={(e) => setAssignForm({ ...assignForm, roleId: e.target.value })}
                  >
                    <option value="">Select role...</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scopes Section */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Resource Scopes (Hospital Boundary)
                </span>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Restricted to Ward</label>
                    <select
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs mt-1"
                      value={assignForm.wardIds[0] || ''}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, wardIds: e.target.value ? [e.target.value] : [] })
                      }
                    >
                      <option value="">All Wards (Tenant Wide)</option>
                      {scopes
                        .filter((s) => s.type === 'ward')
                        .map((w) => (
                          <option key={w.key} value={w.key}>
                            {w.name} ({w.key})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Restricted to Department</label>
                    <select
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs mt-1"
                      value={assignForm.deptIds[0] || ''}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, deptIds: e.target.value ? [e.target.value] : [] })
                      }
                    >
                      <option value="">All Departments</option>
                      {scopes
                        .filter((s) => s.type === 'department')
                        .map((d) => (
                          <option key={d.key} value={d.key}>
                            {d.name} ({d.key})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignForm.careTeamOnly}
                        onChange={(e) => setAssignForm({ ...assignForm, careTeamOnly: e.target.checked })}
                        className="rounded border-input text-primary"
                      />
                      Treating Care-Team Only (Need-to-Know)
                    </label>
                  </div>
                </div>
              </div>

              {/* Conditions & Expiry */}
              <div className="grid md:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mfa"
                    checked={assignForm.mfa}
                    onChange={(e) => setAssignForm({ ...assignForm, mfa: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <label htmlFor="mfa" className="text-xs font-medium cursor-pointer">
                    MFA Mandatory
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shift"
                    checked={assignForm.shift}
                    onChange={(e) => setAssignForm({ ...assignForm, shift: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <label htmlFor="shift" className="text-xs font-medium cursor-pointer">
                    Active Shift Only
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ip"
                    checked={assignForm.hospitalIp}
                    onChange={(e) => setAssignForm({ ...assignForm, hospitalIp: e.target.checked })}
                    className="rounded border-input text-primary"
                  />
                  <label htmlFor="ip" className="text-xs font-medium cursor-pointer">
                    Hospital IP Only
                  </label>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Auto-Expiry</label>
                  <select
                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs mt-0.5"
                    value={assignForm.expiresInDays}
                    onChange={(e) => setAssignForm({ ...assignForm, expiresInDays: Number(e.target.value) })}
                  >
                    <option value={0}>No Expiry (Permanent)</option>
                    <option value={1}>1 Day (Temporary Duty)</option>
                    <option value={7}>7 Days (Intern / Locum)</option>
                    <option value={30}>30 Days (Visiting Consultant)</option>
                    <option value={90}>90 Days (Quarterly)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <Input
                    placeholder="Audit reason for access grant..."
                    value={assignForm.reason}
                    onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={!assignForm.principalId || !assignForm.roleId}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Grant Access
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Assignments Table */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Active Assignments ({assignments.length})</CardTitle>
              <CardDescription>
                Audited access grants. Sessions automatically synchronize on modification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Principal</th>
                      <th className="py-2.5 px-3">Role / Policy</th>
                      <th className="py-2.5 px-3">Scopes</th>
                      <th className="py-2.5 px-3">Conditions</th>
                      <th className="py-2.5 px-3">Expires</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => {
                      const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
                      return (
                        <tr key={a._id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <div>{a.principal?.name || 'Staff User'}</div>
                            <span className="text-[10px] text-muted-foreground uppercase">{a.principalType}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-primary">{a.roleId?.name || a.policyId?.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {a.scope?.wardIds?.length ? `Ward: ${a.scope.wardIds.join(', ')}` : 'All Wards'}
                            {a.scope?.careTeamOnly && ' · Care-Team Only'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {a.conditions?.mfa && (
                                <Badge variant="outline" className="text-[10px]">
                                  MFA
                                </Badge>
                              )}
                              {a.conditions?.shift && (
                                <Badge variant="outline" className="text-[10px]">
                                  Shift
                                </Badge>
                              )}
                              {a.conditions?.ip && (
                                <Badge variant="outline" className="text-[10px]">
                                  IP
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {a.expiresAt ? (
                              <span className={isExpired ? 'text-destructive font-semibold' : ''}>
                                {new Date(a.expiresAt).toLocaleDateString()}
                              </span>
                            ) : (
                              'Never'
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant={a.status === 'active' && !isExpired ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              {isExpired ? 'expired' : a.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {a.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevokeAssignment(a._id)}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              >
                                Revoke
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {assignments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-muted-foreground">
                          No active fine-grained assignments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 3: Scopes & Hierarchy ── */}
      {tab === 'scopes' && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Add Resource Scope
              </CardTitle>
              <CardDescription>Define Hospital Wards, Departments, or Operational Locations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Scope Type</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={scopeForm.type}
                  onChange={(e) => setScopeForm({ ...scopeForm, type: e.target.value })}
                >
                  <option value="ward">Ward (e.g. Ward-3, ICU-B)</option>
                  <option value="department">Department (e.g. Cardiology, OPD)</option>
                  <option value="location">Location / Building Wing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Display Name</label>
                <Input
                  placeholder="e.g. Ward 3 — Post Operative"
                  value={scopeForm.name}
                  onChange={(e) => setScopeForm({ ...scopeForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Unique Key</label>
                <Input
                  placeholder="e.g. ward-3"
                  value={scopeForm.key}
                  onChange={(e) => setScopeForm({ ...scopeForm, key: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleCreateScope} disabled={!scopeForm.name || !scopeForm.key} className="w-full">
                Add Scope
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Hospital Scopes ({scopes.length})</CardTitle>
              <CardDescription>
                These scope identifiers bind assignments so nurses and interns only access their assigned units.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {scopes.map((s) => (
                  <div key={s._id} className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.key}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {s.type}
                    </Badge>
                  </div>
                ))}
                {scopes.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2 text-center py-6">
                    No resource scopes defined yet. Add wards and departments above.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 4: Access Requests ── */}
      {tab === 'requests' && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" />
              Staff Access Requests ({requests.length})
            </CardTitle>
            <CardDescription>
              Maker-checker enforced: Staff request elevated access. Hospital admins decide. Self-approval is blocked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Requester</th>
                    <th className="py-2.5 px-3">Requested Access</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Requested At</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium">
                        {r.requesterId?.name || 'Staff User'}
                        <div className="text-[10px] text-muted-foreground">{r.requesterId?.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold">
                          {r.requested?.roleId?.name || r.requested?.kind}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">{r.reason}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={
                            r.status === 'approved' ? 'default' : r.status === 'denied' ? 'destructive' : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {r.status === 'pending' && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecideRequest(r._id, 'approve')}
                              className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDecideRequest(r._id, 'deny')}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                        {r.status !== 'pending' && (
                          <span className="text-[10px] text-muted-foreground">Decided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-muted-foreground">
                        No access requests pending.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TAB 5: Access Reviews ── */}
      {tab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Access Certification & Reviews</h2>
              <p className="text-xs text-muted-foreground">
                Periodic reviews to prevent privilege creep. Revoked permissions immediately expire user sessions.
              </p>
            </div>
            <Button onClick={handleStartReview} className="gap-2">
              <Plus className="w-4 h-4" />
              Start New Certification Cycle
            </Button>
          </div>

          {reviews.map((rev) => (
            <Card key={rev._id} className="border-border/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{rev.cycle}</CardTitle>
                    <Badge variant={rev.completedAt ? 'secondary' : 'default'} className="text-[10px]">
                      {rev.completedAt ? 'Completed' : 'In Progress'}
                    </Badge>
                  </div>
                  <CardDescription>
                    Reviewer: {rev.reviewerId?.name} · Total Items: {rev.items?.length || 0}
                  </CardDescription>
                </div>
                {!rev.completedAt && (
                  <Button variant="outline" size="sm" onClick={() => handleCompleteReview(rev._id)}>
                    Finalize Review
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rev.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-sm">
                          {item.assignmentId?.roleId?.name || 'Assignment Item'}
                        </div>
                        <div className="text-muted-foreground">
                          Decision: <span className="font-medium">{item.decision}</span>
                          {item.note && ` — ${item.note}`}
                        </div>
                      </div>
                      {!rev.completedAt && (
                        <div className="flex gap-2">
                          <Button
                            variant={item.decision === 'keep' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleReviewDecision(rev._id, item._id, 'keep')}
                            className="h-7 text-xs"
                          >
                            Keep Access
                          </Button>
                          <Button
                            variant={item.decision === 'revoke' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleReviewDecision(rev._id, item._id, 'revoke')}
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          >
                            Revoke
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {reviews.length === 0 && (
            <Card className="text-center py-8 text-muted-foreground border-dashed">
              <p className="text-sm">No access review cycles have been executed yet.</p>
              <Button onClick={handleStartReview} variant="outline" className="mt-3">
                Initiate First Review
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 6: Policy Simulator ── */}
      {tab === 'simulator' && (
        <Card className="border-border/60 shadow-sm max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Policy Simulator: "Can X do Y on Z?"
            </CardTitle>
            <CardDescription>
              Test simulated access decisions through the 6-layer evaluation engine before granting permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">User / Principal</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={simForm.userId}
                  onChange={(e) => setSimForm({ ...simForm, userId: e.target.value })}
                >
                  <option value="">Select user...</option>
                  {principals.users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Action</label>
                <Input
                  placeholder="e.g. vitals:write, records:clinical:read"
                  value={simForm.action}
                  onChange={(e) => setSimForm({ ...simForm, action: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Resource Type</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={simForm.resourceType}
                  onChange={(e) => setSimForm({ ...simForm, resourceType: e.target.value })}
                >
                  <option value="ward">Ward</option>
                  <option value="patient">Patient</option>
                  <option value="record">Clinical Record</option>
                  <option value="billing">Invoice / Billing</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Resource ID</label>
                <Input
                  placeholder="e.g. ward-3, P-1002"
                  value={simForm.resourceId}
                  onChange={(e) => setSimForm({ ...simForm, resourceId: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <Button onClick={handleSimulate} disabled={!simForm.userId || !simForm.action} className="w-full">
              Run Evaluation Simulation
            </Button>

            {simResult && (
              <div
                className={`p-4 rounded-xl border mt-4 ${
                  simResult.allow
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : 'bg-destructive/10 border-destructive/30 text-destructive-foreground'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-base">
                  {simResult.allow ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ACCESS ALLOWED
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-destructive" />
                      ACCESS DENIED
                    </>
                  )}
                </div>
                {simResult.reason && (
                  <p className="text-xs mt-1 font-mono">Evaluation Reason: {simResult.reason}</p>
                )}
                {simResult.obligations?.length > 0 && (
                  <p className="text-xs mt-1">Obligations: {simResult.obligations.join(', ')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 7: Access Analyzer ── */}
      {tab === 'analyzer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{analyzer.summary?.totalFindings || 0}</div>
                <p className="text-xs text-muted-foreground">Total Findings</p>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{analyzer.summary?.critical || 0}</div>
                <p className="text-xs text-muted-foreground">Critical Violations</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-600">{analyzer.summary?.high || 0}</div>
                <p className="text-xs text-muted-foreground">High / SoD Violations</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-primary">{analyzer.summary?.medium || 0}</div>
                <p className="text-xs text-muted-foreground">Medium / Hygiene</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {analyzer.findings?.map((f: any) => (
              <Card key={f.id} className="border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          f.severity === 'critical' || f.severity === 'high'
                            ? 'text-destructive'
                            : 'text-amber-500'
                        }`}
                      />
                      <CardTitle className="text-sm">{f.title}</CardTitle>
                    </div>
                    <Badge
                      variant={
                        f.severity === 'critical' || f.severity === 'high' ? 'destructive' : 'secondary'
                      }
                      className="text-[10px] uppercase"
                    >
                      {f.severity}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-1.5">
                  <p className="text-foreground">{f.description}</p>
                  <div className="p-2.5 rounded bg-muted/40 font-mono text-[11px] text-muted-foreground">
                    Remediation: {f.remediation}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!analyzer.findings || analyzer.findings.length === 0) && (
              <Card className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium">All checks passed!</p>
                <p className="text-xs">No Segregation of Duties conflicts or unauthenticated accounts detected.</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 8: Emergency Break-Glass ── */}
      {tab === 'grants' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Request Break-Glass
              </CardTitle>
              <CardDescription>
                Emergency 30–60 min time-boxed grant to treat an unassigned patient.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Subject Type</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={grantForm.subjectType}
                  onChange={(e) => setGrantForm({ ...grantForm, subjectType: e.target.value })}
                >
                  <option value="patient">Patient Profile</option>
                  <option value="record">Clinical Record</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Subject ID</label>
                <Input
                  placeholder="Patient ID / Record ID (24 hex)"
                  value={grantForm.subjectId}
                  onChange={(e) => setGrantForm({ ...grantForm, subjectId: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Reason Code</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-1"
                  value={grantForm.reasonCode}
                  onChange={(e) => setGrantForm({ ...grantForm, reasonCode: e.target.value })}
                >
                  <option value="emergency_care">Emergency Care (Immediate Risk)</option>
                  <option value="treatment">Critical Consultation</option>
                  <option value="safety_incident">Safety Incident Investigation</option>
                  <option value="legal_order">Legal / Statutory Order</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Ticket / ER Case ID</label>
                <Input
                  placeholder="e.g. ER-2026-09"
                  value={grantForm.ticketId}
                  onChange={(e) => setGrantForm({ ...grantForm, ticketId: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleCreateGrant} disabled={!grantForm.subjectId} className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Request Emergency Access
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Emergency Grants History ({grants.length})</CardTitle>
              <CardDescription>
                Audited break-glass grants. Patient-visible access logs automatically recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {grants.map((g) => (
                <div
                  key={g._id}
                  className="p-3.5 rounded-lg border border-border/60 bg-card flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{g.principalId?.name || 'Physician'}</span>
                      <Badge
                        variant={
                          g.status === 'approved' ? 'default' : g.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {g.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono">{g.reasonCode}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Subject: {g.subject?.type} · Expires: {new Date(g.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecideGrant(g._id, 'approve')}
                          className="h-7 text-xs text-emerald-600"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDecideGrant(g._id, 'deny')}
                          className="h-7 text-xs text-destructive"
                        >
                          Deny
                        </Button>
                      </>
                    )}
                    {g.status === 'approved' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeGrant(g._id)}
                        className="h-7 text-xs text-destructive"
                      >
                        Revoke Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {grants.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">No emergency grants recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 9: API Keys ── */}
      {tab === 'apikeys' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Create Service Account Key
              </CardTitle>
              <CardDescription>
                Dedicated credentials for HL7 interfaces, PACS DICOM routers, and LIS analyzers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Key Name</label>
                <Input
                  placeholder="e.g. Sysmex-XN-550-LIS, Orthanc-PACS"
                  value={keyForm.name}
                  onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  IP Allowlist (Comma separated)
                </label>
                <Input
                  placeholder="e.g. 192.168.1.100, 10.0.0.5"
                  value={keyForm.ipBinding}
                  onChange={(e) => setKeyForm({ ...keyForm, ipBinding: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleCreateApiKey} disabled={!keyForm.name.trim()} className="w-full">
                Generate API Key
              </Button>

              {generatedKey && (
                <div className="p-3 rounded-lg bg-muted border border-border mt-3 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-primary">Copy Key Now (Shown Once):</span>
                  <div className="text-xs font-mono break-all select-all font-semibold p-1.5 bg-background rounded">
                    {generatedKey}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Active API Keys ({apiKeys.length})</CardTitle>
              <CardDescription>
                Hashed at rest with SHA-256. IP-restricted and revocable instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {apiKeys.map((k) => (
                <div
                  key={k._id}
                  className="p-3.5 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{k.name}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{k.prefix}••••••••</span>
                      <Badge variant={k.revokedAt ? 'destructive' : 'default'} className="text-[10px]">
                        {k.revokedAt ? 'revoked' : 'active'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      IP Binding: {k.ipBinding?.length ? k.ipBinding.join(', ') : 'None'} · Last Used:{' '}
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    {!k.revokedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeApiKey(k._id)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {apiKeys.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">No service account API keys created.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Policies ── */}
      {tab === 'policies' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Create Access Policy
              </CardTitle>
              <CardDescription>
                Allow/Deny statement documents — the building blocks of roles. Start from a managed template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Policy Name</label>
                <Input
                  placeholder="e.g. Ward-3 Nurse Read Policy"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Base Template</label>
                <select
                  aria-label="Managed Template"
                  value={policyForm.templateKey}
                  onChange={(e) => setPolicyForm({ ...policyForm, templateKey: e.target.value })}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Select template…</option>
                  {templates.map((t: any) => (
                    <option key={t.key} value={t.key}>{t.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreatePolicy} disabled={!policyForm.name.trim() || !policyForm.templateKey} className="w-full">
                Create Policy
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Policies ({policies.length})</CardTitle>
              <CardDescription>
                Platform templates (tenantId: null) are read-only and versioned; custom policies are tenant-scoped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {policies.map((p) => (
                <div
                  key={p._id}
                  className="p-3 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <Badge variant={p.type === 'custom' ? 'default' : 'secondary'} className="text-[10px]">{p.type}</Badge>
                      <Badge variant="outline" className="text-[10px]">v{p.version || 1}</Badge>
                      {p.status === 'deprecated' && (
                        <Badge variant="destructive" className="text-[10px]">deprecated</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Statements: {p.statementCount ?? p.statements?.length ?? '—'}
                      {p.createdBy ? ` · Created by ${p.createdBy}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {policies.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">No policies yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Teams & Groups ── */}
      {tab === 'teams' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-primary" />
                Create Team / Group
              </CardTitle>
              <CardDescription>
                AWS-IAM style groups: attach assignments once, every member inherits them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Group Name</label>
                <Input
                  placeholder="e.g. Ward-3 Nurses"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Members (ctrl/cmd-click for multiple)</label>
                <select
                  multiple
                  aria-label="Group Members"
                  value={groupForm.memberIds}
                  onChange={(e) =>
                    setGroupForm({
                      ...groupForm,
                      memberIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                    })
                  }
                  className="mt-1 w-full h-32 rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  {principals.users.map((u: any) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleCreateGroup} disabled={!groupForm.name.trim() || !groupForm.memberIds.length} className="w-full">
                Create Group
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Teams & Groups ({groups.length})</CardTitle>
              <CardDescription>Group assignments apply to every member (tokenVersion bumped on change).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map((g) => (
                <div
                  key={g._id}
                  className="p-3 rounded-lg border border-border/60 bg-card flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{g.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {g.memberIds?.length || 0} member{(g.memberIds?.length || 0) === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">
                      Roles: {g.roleIds?.length || 0} · Policies: {g.policyIds?.length || 0}
                    </p>
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">No teams/groups created yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: Activity & Audit ── */}
      {tab === 'activity' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Activity & Audit Log</h2>
              <p className="text-xs text-muted-foreground">
                Append-only access trail — reason-for-access, patient-visible reads, snooping flags (§11/§12).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={logFlaggedOnly}
                  onChange={(e) => {
                    setLogFlaggedOnly(e.target.checked);
                    refreshAccessLog(e.target.checked);
                  }}
                  className="accent-destructive"
                />
                Flagged only
              </label>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refreshAccessLog()}>
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Logged Access', value: iamMetrics.writes ?? 0 },
              { label: 'Allowed', value: iamMetrics.allow ?? 0 },
              { label: 'Denied', value: iamMetrics.deny ?? 0 },
              { label: 'Snooping Flags', value: iamMetrics.flagged ?? 0 },
              { label: 'Shadow Mismatches', value: iamMetrics.shadowMismatches ?? 0 },
            ].map((m) => (
              <Card key={m.label} className="border-border/60 shadow-sm">
                <CardContent className="py-4">
                  <div className="text-xl font-bold">{m.value}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Access Trail ({accessLog.total})</CardTitle>
              <CardDescription>
                Patients see rows where they are the subject via “/api/access-log/me”; this view needs audit:read.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase text-[10px]">
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Actor</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Patient</th>
                      <th className="py-2 pr-3">Decision</th>
                      <th className="py-2 pr-3">Reason (engine)</th>
                      <th className="py-2 pr-3">Reason-for-access</th>
                      <th className="py-2 pr-3">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLog.entries.map((e: any) => (
                      <tr key={e._id} className="border-b border-border/40 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-medium">{e.actorRole || '—'}</div>
                          <div className="text-muted-foreground font-mono text-[10px]">{e.actorId || ''}</div>
                        </td>
                        <td className="py-2 pr-3 font-mono">{e.action}</td>
                        <td className="py-2 pr-3 font-mono text-[10px]">{e.patientId || '—'}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={e.decision === 'deny' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {e.decision}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground">{e.reason || '—'}</td>
                        <td className="py-2 pr-3">
                          {e.accessReason || (
                            <span className="text-destructive/70 italic">missing</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {e.flagged ? (
                            <Badge variant="destructive" className="text-[10px]" title={e.flagReason}>
                              {e.flagReason || 'flagged'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {accessLog.entries.length === 0 && (
                <p className="text-sm text-center py-6 text-muted-foreground">
                  No access events logged yet — activity appears here as records are read.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
