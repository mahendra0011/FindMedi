import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, FlaskConical, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/**
 * File 25 §7 — tenant Access Control Center: roles from templates,
 * assignments (no self-grant, critical needs approver), policy simulator
 * ("Can X do Y on Z?"), access requests, emergency grants, API keys.
 * Server-side enforcement only; this UI never grants power by itself.
 */
const TABS = ['Roles', 'Simulator', 'Requests', 'Grants', 'API Keys'] as const;

export default function AccessControl() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Roles');
  const [roles, setRoles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [roleName, setRoleName] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [sim, setSim] = useState({ userId: '', action: 'vitals:write', resource: '{"type":"record","id":"r1"}' });
  const [simResult, setSimResult] = useState<any>(null);
  const [assign, setAssign] = useState({ principalId: '', roleId: '', reason: '' });
  const [grant, setGrant] = useState({ subjectId: '', reasonCode: 'emergency_care', ticketId: '' });
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState('');

  const load = async () => {
    try {
      const [r, t] = await Promise.all([api.getIamRoles(), api.getIamTemplates()]);
      setRoles(r?.roles || []);
      setTemplates(t?.templates || []);
    } catch { toast.error('Failed to load access control'); }
  };
  useEffect(() => { load(); }, []);

  const createRole = async () => {
    try {
      await api.createIamRole({ name: roleName, templateKey: templateKey || undefined });
      toast.success('Role created');
      setRoleName(''); setTemplateKey('');
      load();
    } catch (err: any) { toast.error(err?.message || 'Create failed'); }
  };

  const createAssignment = async () => {
    try {
      await api.createIamAssignment({ principalType: 'user', principalId: assign.principalId, roleId: assign.roleId, reason: assign.reason });
      toast.success('Access granted (session revoked + reissued for the user)');
      setAssign({ principalId: '', roleId: '', reason: '' });
    } catch (err: any) { toast.error(err?.message || 'Grant failed (self-grant is blocked)'); }
  };

  const runSim = async () => {
    try {
      const resource = JSON.parse(sim.resource);
      const res: any = await api.iamSimulate({ userId: sim.userId, action: sim.action, resource });
      setSimResult(res);
    } catch { toast.error('Simulation failed — check JSON'); }
  };

  const requestGrant = async () => {
    try {
      await api.createIamGrant({ subjectType: 'patient', subjectId: grant.subjectId, reasonCode: grant.reasonCode, ticketId: grant.ticketId, minutes: 30 });
      toast.success('Emergency grant requested — needs approval');
      setGrant({ subjectId: '', reasonCode: 'emergency_care', ticketId: '' });
    } catch (err: any) { toast.error(err?.message || 'Grant request failed'); }
  };

  const createKey = async () => {
    try {
      const res: any = await api.createIamApiKey({ name: keyName });
      setNewKey(res?.key || '');
      toast.success('Key created — copy now, it is shown once');
      setKeyName('');
    } catch (err: any) { toast.error(err?.message || 'Key creation failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-2xl font-heading font-bold">Access Control</h1>
          <p className="text-sm text-muted-foreground">Least-privilege roles, scopes, simulator, emergency grants, API keys.</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Roles' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">New role from template</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Role name (e.g. Ward-3 Nurse)" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
              <select aria-label="Template" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
                <option value="">Custom (empty)</option>
                {templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
              </select>
              <Button onClick={createRole} disabled={!roleName}>Create role</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Grant access (no self-grant)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="User ID" value={assign.principalId} onChange={(e) => setAssign({ ...assign, principalId: e.target.value })} />
              <select aria-label="Role" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={assign.roleId} onChange={(e) => setAssign({ ...assign, roleId: e.target.value })}>
                <option value="">Select role</option>
                {roles.map((r) => <option key={r._id || r.id} value={r._id || r.id}>{r.name} ({r.type})</option>)}
              </select>
              <Input placeholder="Reason (logged)" value={assign.reason} onChange={(e) => setAssign({ ...assign, reason: e.target.value })} />
              <Button onClick={createAssignment} disabled={!assign.principalId || !assign.roleId}>Grant</Button>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">Roles ({roles.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {roles.map((r) => (
                <div key={r._id || r.id} className="flex items-center gap-2 text-sm rounded-lg border border-border/50 p-2.5">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.type} · v{r.version}</span>
                </div>
              ))}
              {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles yet — create one from a template.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Simulator' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FlaskConical className="w-4 h-4" />Can X do Y on Z?</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="User ID" value={sim.userId} onChange={(e) => setSim({ ...sim, userId: e.target.value })} />
            <Input placeholder="Action (e.g. vitals:write)" value={sim.action} onChange={(e) => setSim({ ...sim, action: e.target.value })} />
            <Input placeholder='Resource JSON (e.g. {"type":"record","id":"r1"})' value={sim.resource} onChange={(e) => setSim({ ...sim, resource: e.target.value })} />
            <Button onClick={runSim}>Simulate</Button>
            {simResult && (
              <p className={`text-sm font-bold ${simResult.allow ? 'text-success' : 'text-destructive'}`}>
                {simResult.allow ? '✅ ALLOW' : `❌ DENY — ${simResult.reason || ''}`}
                {simResult.obligations?.length ? ` (obligations: ${simResult.obligations.join(', ')})` : ''}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Requests' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Inbox className="w-4 h-4" />Staff access requests</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Staff file requests from their dashboard; approvals happen here via the API. Self-approval is blocked server-side.</p></CardContent>
        </Card>
      )}

      {tab === 'Grants' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tenant emergency grant (30–60 min, audited)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Patient/Record ID" value={grant.subjectId} onChange={(e) => setGrant({ ...grant, subjectId: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-3">
              <select aria-label="Reason" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={grant.reasonCode} onChange={(e) => setGrant({ ...grant, reasonCode: e.target.value })}>
                <option value="emergency_care">emergency_care</option>
                <option value="safety_incident">safety_incident</option>
                <option value="legal_order">legal_order</option>
                <option value="treatment">treatment</option>
              </select>
              <Input placeholder="Ticket ID" value={grant.ticketId} onChange={(e) => setGrant({ ...grant, ticketId: e.target.value })} />
            </div>
            <Button onClick={requestGrant} disabled={!grant.subjectId}>Request grant</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'API Keys' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" />Service accounts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Key name (e.g. HL7 feed)" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              <Button onClick={createKey} disabled={!keyName}>Create</Button>
            </div>
            {newKey && <p className="text-xs font-mono break-all bg-muted p-2 rounded">{newKey}</p>}
            <p className="text-xs text-muted-foreground">Hashed at rest, IP-bindable, expiring, instantly revocable. Never use for PHI-wide access.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
