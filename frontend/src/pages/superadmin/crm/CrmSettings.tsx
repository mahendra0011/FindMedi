import React, { useEffect, useState } from 'react';
import {
  Settings, RefreshCw, Plus, Play, ToggleLeft, ToggleRight, Timer,
  AlertTriangle, Zap, Trash2, Save
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface StageRow { key: string; label: string; slaHours: number; terminal?: boolean }
interface PipelineConfig {
  leadStages: StageRow[];
  partnerStages: StageRow[];
  lostReasons: string[];
  leadSources?: string[];
  scoringWeights?: Record<string, number>;
  followUpSlaHours?: number;
  docRenewalLeadDays?: number;
}
interface Rule {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  conditions?: Record<string, any>;
  actions?: Array<{ type: string; params?: Record<string, any> }>;
  cooldownMinutes?: number;
  runs?: Array<{ at: string; matched: number; created: number }>;
}

const TRIGGER_LABELS: Record<string, string> = {
  lead_stage_idle: 'Lead idle in stage (SLA breach)',
  doc_expiring: 'Provider document expiring',
  task_overdue: 'Task overdue',
  at_risk_provider: 'Provider at risk (churn signal)',
  partner_next_step_due: 'Partner next-step due',
};

export default function CrmSettings() {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger: 'lead_stage_idle',
    slaHours: 48,
    cooldownMinutes: 60,
    action: 'create_task',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, rulesRes] = await Promise.all([
        apiClient.get('/crm/settings'),
        apiClient.get('/crm/automation/rules'),
      ]);
      setConfig(settingsRes.data.config);
      setRules(rulesRes.data.rules || []);
      setTriggers(rulesRes.data.triggers || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load CRM settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await apiClient.put('/crm/settings', {
        leadStages: config.leadStages,
        partnerStages: config.partnerStages,
        lostReasons: config.lostReasons,
        followUpSlaHours: config.followUpSlaHours,
        docRenewalLeadDays: config.docRenewalLeadDays,
      });
      setConfig(res.data.config);
      toast.success('Pipeline config saved');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateStage = (group: 'leadStages' | 'partnerStages', idx: number, slaHours: number) => {
    if (!config) return;
    const rows = config[group].map((s, i) => (i === idx ? { ...s, slaHours } : s));
    setConfig({ ...config, [group]: rows } as PipelineConfig);
  };

  const toggleRule = async (rule: Rule) => {
    try {
      await apiClient.patch(`/crm/automation/rules/${rule.id}`, { enabled: !rule.enabled });
      setRules(rules.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
      toast.success(rule.enabled ? 'Rule paused' : 'Rule enabled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update rule');
    }
  };

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name.trim()) { toast.error('Rule name is required'); return; }
    try {
      await apiClient.post('/crm/automation/rules', {
        name: newRule.name.trim(),
        trigger: newRule.trigger,
        enabled: true,
        conditions: { slaHours: Number(newRule.slaHours) || 48 },
        actions: [{ type: newRule.action, params: {} }],
        cooldownMinutes: Number(newRule.cooldownMinutes) || 60,
      });
      toast.success('Automation rule created');
      setIsRuleOpen(false);
      setNewRule({ name: '', trigger: 'lead_stage_idle', slaHours: 48, cooldownMinutes: 60, action: 'create_task' });
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create rule');
    }
  };

  const runAutomation = async () => {
    setRunning(true);
    try {
      const res = await apiClient.post('/crm/automation/run', { force: true });
      const s = res.data || {};
      toast.success(`Sweep done — evaluated: ${s.evaluated ?? 0}, matched: ${s.matched ?? 0}, tasks: ${s.created ?? 0}, skipped: ${s.skipped ?? 0}${s.failed ? `, failed: ${s.failed}` : ''}`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Automation sweep failed');
    } finally {
      setRunning(false);
    }
  };

  const deleteRule = async (rule: Rule) => {
    try {
      await apiClient.delete(`/crm/automation/rules/${rule.id}`);
      setRules(rules.filter((r) => r.id !== rule.id));
      toast.success('Rule deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading CRM settings…</div>;
  }

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase bg-violet-50 text-violet-700 dark:bg-violet-950/40 border-violet-200">
              File 24 §4.13 + §5
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Settings className="h-6 w-6 text-primary" />
            CRM Settings & Automation
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline stages, SLAs, lost reasons, scoring + automation rules (trigger → task/notify).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={runAutomation} disabled={running} className="gap-1.5 h-9">
            <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run Automation Now'}
          </Button>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lead Pipeline SLAs</CardTitle>
            <CardDescription>Hours a lead may sit idle in each stage before follow-up breach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {config?.leadStages?.map((s, i) => (
              <div key={s.key} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/40 border border-border/60">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.label || s.key}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{s.key}{s.terminal ? ' • terminal' : ''}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={s.slaHours}
                    onChange={(e) => updateStage('leadStages', i, Number(e.target.value))}
                    className="w-20 h-8 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">h</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Partner Pipeline SLAs</CardTitle>
            <CardDescription>Same for partnership stages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {config?.partnerStages?.map((s, i) => (
              <div key={s.key} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/40 border border-border/60">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{s.label || s.key}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{s.key}{s.terminal ? ' • terminal' : ''}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    value={s.slaHours}
                    onChange={(e) => updateStage('partnerStages', i, Number(e.target.value))}
                    className="w-20 h-8 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">h</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Lost reasons + globals */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Lost Reasons & Global SLAs</CardTitle>
              <CardDescription>Churn taxonomy + follow-up/renewal defaults.</CardDescription>
            </div>
            <Button size="sm" onClick={saveConfig} disabled={saving} className="gap-1.5 h-9">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save Config'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {config?.lostReasons?.map((r) => (
              <Badge key={r} variant="secondary" className="text-[11px] capitalize">{r}</Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-semibold">Follow-up SLA (hours)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={config?.followUpSlaHours ?? 4}
                onChange={(e) => setConfig({ ...config!, followUpSlaHours: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Doc renewal lead (days)</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={config?.docRenewalLeadDays ?? 30}
                onChange={(e) => setConfig({ ...config!, docRenewalLeadDays: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-semibold">Scoring weights (%)</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {Object.entries(config?.scoringWeights || {}).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-[11px]">
                    {k}: <span className="font-bold ml-1">{v}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation rules */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Automation Rules
              </CardTitle>
              <CardDescription>Triggers fire hourly from the scheduler; cooldown prevents spam.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsRuleOpen(true)} className="gap-1.5 h-9">
              <Plus className="h-4 w-4" /> New Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No automation rules yet. Create one to auto-create follow-up tasks.
            </div>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{rule.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{rule.trigger}</Badge>
                  {rule.runs?.length ? (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      last: {rule.runs[0].matched} matched / {rule.runs[0].created} created
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                  {' • '}cooldown {rule.cooldownMinutes ?? 60}m
                  {' • '}action: {rule.actions?.[0]?.type || 'create_task'}
                  {rule.conditions?.slaHours ? ` • SLA ${rule.conditions.slaHours}h` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleRule(rule)}
                  title={rule.enabled ? 'Pause rule' : 'Enable rule'}
                >
                  {rule.enabled
                    ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                    : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 hover:text-rose-600"
                  onClick={() => deleteRule(rule)}
                  title="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>Guardrails: max 50 actions & 20 notifications per rule per run; daily dedupe keys on notifications.</span>
          </div>
        </CardContent>
      </Card>

      {/* New rule dialog */}
      <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>Trigger → conditions → action. Runs hourly or manually.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createRule} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Rule Name *</Label>
              <Input
                placeholder="e.g. Nudge idle qualified leads after 48h"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Trigger</Label>
              <Select value={newRule.trigger} onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(triggers.length ? triggers : Object.keys(TRIGGER_LABELS)).map((t) => (
                    <SelectItem key={t} value={t}>{TRIGGER_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">SLA / threshold (hours)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newRule.slaHours}
                  onChange={(e) => setNewRule({ ...newRule, slaHours: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Cooldown (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newRule.cooldownMinutes}
                  onChange={(e) => setNewRule({ ...newRule, cooldownMinutes: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Action</Label>
              <Select value={newRule.action} onValueChange={(v) => setNewRule({ ...newRule, action: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_task">Create follow-up task</SelectItem>
                  <SelectItem value="notify">Notify ops team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRuleOpen(false)}>Cancel</Button>
              <Button type="submit">Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
