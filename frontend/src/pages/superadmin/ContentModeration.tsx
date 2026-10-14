import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Flag, CheckCircle, XCircle, AlertTriangle, Clock,
  Eye, EyeOff, MessageSquare, Building2, ShoppingBag, Calendar,
  FileText, ShieldCheck, UserX, AlertOctagon, Undo, UserCheck,
  Search, Filter, RefreshCw, ChevronRight, Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

const TARGET_TYPES = [
  { key: '', label: 'All Queues', icon: Filter },
  { key: 'review', label: 'Reviews & Ratings', icon: MessageSquare },
  { key: 'provider_profile', label: 'Provider Profiles', icon: Building2 },
  { key: 'product_listing', label: 'Products & Equipment', icon: ShoppingBag },
  { key: 'event', label: 'Events & Camps', icon: Calendar },
  { key: 'article', label: 'Articles & Content', icon: FileText },
  { key: 'chat_report', label: 'Chat Reports', icon: AlertOctagon },
];

const SEVERITIES = [
  { key: '', label: 'All Severities' },
  { key: 'critical', label: 'Critical (8h SLA)', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  { key: 'high', label: 'High (24h SLA)', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  { key: 'medium', label: 'Medium (48h SLA)', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { key: 'low', label: 'Low (72h SLA)', color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },
];

const STATUSES = [
  { key: 'open', label: 'Open' },
  { key: 'in_review', label: 'In Review' },
  { key: 'appealed', label: 'Appealed' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
];

export default function ContentModeration() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [targetType, setTargetType] = useState('');
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionNote, setActionNote] = useState('');
  const [acting, setActing] = useState(false);
  const [unblurMedia, setUnblurMedia] = useState<Record<string, boolean>>({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (targetType) q.set('targetType', targetType);
      if (status) q.set('status', status);
      if (severity) q.set('severity', severity);
      if (overdueOnly) q.set('overdue', 'true');
      q.set('limit', '40');

      const res: any = await api.get(`/moderation?${q.toString()}`);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setTotal(Number(res?.total) || 0);
    } catch {
      toast.error('Failed to load moderation items');
    } finally {
      setLoading(false);
    }
  }, [targetType, status, severity, overdueOnly]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const claimItem = async (id: string) => {
    try {
      const res: any = await api.post(`/moderation/${id}/claim`, {});
      toast.success('Item claimed for review');
      setSelectedItem(res?.item || null);
      loadQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Could not claim item');
    }
  };

  const takeAction = async (action: string) => {
    if (!selectedItem) return;
    if (['remove', 'strike', 'warn_user'].includes(action) && !actionNote.trim()) {
      toast.error('A note/justification is required for this action');
      return;
    }
    setActing(true);
    try {
      const res: any = await api.post(`/moderation/${selectedItem._id}/action`, {
        action,
        note: actionNote.trim(),
      });
      if (res?.code === 'NEEDS_SECOND_REVIEWER') {
        toast.info('Action parked: awaiting confirmation by a second, different reviewer');
      } else {
        toast.success(`Action applied: ${action}`);
      }
      setActionNote('');
      setSelectedItem(null);
      loadQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const confirmPendingAction = async () => {
    if (!selectedItem?.pendingAction) return;
    setActing(true);
    try {
      await api.post(`/moderation/${selectedItem._id}/action`, {
        action: selectedItem.pendingAction.action,
        note: actionNote.trim() || 'Second reviewer confirmation',
      });
      toast.success('Second reviewer approval confirmed! Action applied.');
      setActionNote('');
      setSelectedItem(null);
      loadQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Confirmation failed');
    } finally {
      setActing(false);
    }
  };

  const resolveAppeal = async (outcome: 'upheld' | 'overturned') => {
    if (!selectedItem) return;
    if (!actionNote.trim()) {
      toast.error('A resolution note is required to resolve this appeal');
      return;
    }
    setActing(true);
    try {
      await api.post(`/moderation/${selectedItem._id}/resolve-appeal`, {
        outcome,
        resolutionNote: actionNote.trim(),
      });
      toast.success(`Appeal ${outcome}`);
      setActionNote('');
      setSelectedItem(null);
      loadQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Appeal resolution failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> Content & UGC Moderation Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Operational review queue for reviews, profiles, UGC, medical claims & safety incidents ({total} items)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => loadQueue()}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Target Type Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 bg-muted/50 p-1.5 rounded-xl border border-border/60">
        {TARGET_TYPES.map((t) => {
          const Icon = t.icon;
          const active = targetType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTargetType(t.key); setSelectedItem(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60 text-xs">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => { setStatus(s.key); setSelectedItem(null); }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                status === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
        >
          {SEVERITIES.map((sev) => (
            <option key={sev.key} value={sev.key}>{sev.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-destructive"
          />
          <Clock className="w-3 h-3 text-destructive" /> Overdue SLA Only
        </label>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Column: Items Queue */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-500" />
              <p className="font-medium">Queue is clean</p>
              <p className="text-xs mt-0.5">No pending moderation items in this category</p>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?._id === item._id;
              const isOverdue = item.slaDueAt && new Date(item.slaDueAt) < new Date() && ['open', 'in_review'].includes(item.status);
              const sevConfig = SEVERITIES.find((s) => s.key === item.severity);

              return (
                <div
                  key={item._id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border/60 bg-card hover:border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono capitalize">
                        {item.targetType.replace('_', ' ')}
                      </Badge>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sevConfig?.color || 'bg-muted text-muted-foreground'}`}>
                        {item.severity}
                      </span>
                      {isOverdue && (
                        <Badge className="bg-destructive text-destructive-foreground text-[10px]">Overdue</Badge>
                      )}
                      {item.pendingAction && (
                        <Badge className="bg-amber-500 text-white text-[10px]">Needs 2nd Reviewer</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                      {item.category}: {item.reason || 'Flagged for moderation'}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      Target ID: {item.targetId.slice(-8)} · Source: {item.source}
                    </p>
                  </div>

                  {item.slaDueAt && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      SLA: {new Date(item.slaDueAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Review Workspace */}
        <div className="lg:col-span-3">
          {selectedItem ? (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="w-4 h-4 text-primary" /> Moderation Case #{selectedItem._id.slice(-6)}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Category: <span className="font-semibold text-foreground capitalize">{selectedItem.category}</span> · Status: {selectedItem.status}
                    </p>
                  </div>
                  {!selectedItem.assignee && (
                    <Button size="sm" variant="outline" onClick={() => claimItem(selectedItem._id)}>
                      Claim Case
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Two-Person Approval Pending Banner */}
                {selectedItem.pendingAction && (
                  <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs space-y-2" role="alert">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Two-Person Approval Required for Action: "{selectedItem.pendingAction.action.toUpperCase()}"
                    </div>
                    <p className="text-[11px]">
                      The first reviewer parked this action with note: "{selectedItem.pendingAction.note || 'No note'}".
                      A second, different reviewer must confirm before the action is enforced.
                    </p>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 gap-1"
                      disabled={acting}
                      onClick={confirmPendingAction}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Confirm As Second Reviewer
                    </Button>
                  </div>
                )}

                {/* Flagged Content Preview (with Reviewer Wellbeing Blur) */}
                <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" /> Flagged Content & Payload
                    </span>
                    <button
                      onClick={() => setUnblurMedia((p) => ({ ...p, [selectedItem._id]: !p[selectedItem._id] }))}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {unblurMedia[selectedItem._id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {unblurMedia[selectedItem._id] ? 'Blur content' : 'Unblur content'}
                    </button>
                  </div>

                  <div className={`text-xs p-3 rounded-lg bg-card border transition-all ${!unblurMedia[selectedItem._id] ? 'blur-sm select-none' : ''}`}>
                    <p className="text-foreground leading-relaxed">
                      {selectedItem.reason || 'Flagged content details awaiting inspector review.'}
                    </p>
                    {selectedItem.note && (
                      <p className="text-muted-foreground mt-2 border-t pt-1.5 italic font-mono">
                        System note: {selectedItem.note}
                      </p>
                    )}
                  </div>
                  {!unblurMedia[selectedItem._id] && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Reviewer wellbeing protection: sensitive text/media is blurred by default.
                    </p>
                  )}
                </div>

                {/* Appeal Section (if appealed) */}
                {selectedItem.status === 'appealed' && selectedItem.appeal && (
                  <div className="p-3 rounded-xl border border-purple-300 bg-purple-50 dark:bg-purple-900/10 text-xs space-y-2">
                    <p className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-purple-600" /> Registered User Appeal
                    </p>
                    <p className="text-[11px] text-purple-800 dark:text-purple-300">
                      Appellant statement: "{selectedItem.appeal.note || 'No statement provided'}"
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white" disabled={acting} onClick={() => resolveAppeal('upheld')}>
                        Uphold Original Action
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-purple-300" disabled={acting} onClick={() => resolveAppeal('overturned')}>
                        Overturn & Restore
                      </Button>
                    </div>
                  </div>
                )}

                {/* Canned Actions Panel */}
                <div className="space-y-3 pt-2">
                  <Input
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    placeholder="Moderator note / justification for audit trail (required for takedowns & strikes)…"
                    className="text-xs"
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      disabled={acting}
                      onClick={() => takeAction('restore')}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve / Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      disabled={acting}
                      onClick={() => takeAction('hide')}
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Hide Listing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                      disabled={acting}
                      onClick={() => takeAction('shadow_hide')}
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Shadow Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={acting}
                      onClick={() => takeAction('remove')}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Remove Content
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                      disabled={acting}
                      onClick={() => takeAction('warn_user')}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Issue Warning
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs gap-1"
                      disabled={acting}
                      onClick={() => takeAction('strike')}
                    >
                      <UserX className="w-3.5 h-3.5" /> Issue Strike (2-Person)
                    </Button>
                  </div>
                </div>

                {/* Audit & Decision Log */}
                {Array.isArray(selectedItem.actions) && selectedItem.actions.length > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs font-semibold text-foreground">Decision & Action History</p>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedItem.actions.map((act: any, i: number) => (
                        <div key={i} className="text-[11px] p-2 rounded bg-muted/40 border border-border/60 flex items-start justify-between">
                          <div>
                            <span className="font-semibold capitalize text-foreground">{act.action}</span>
                            {act.secondReviewer && <Badge className="ml-1.5 text-[9px] bg-amber-500">2nd Reviewer</Badge>}
                            <p className="text-muted-foreground mt-0.5">{act.note || 'No note recorded'}</p>
                          </div>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            {new Date(act.at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-xl text-muted-foreground text-sm p-6 text-center">
              <Scale className="w-10 h-10 mb-2 opacity-30 text-primary" />
              <p className="font-medium text-foreground">Select an item from the queue</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Inspect applicant claims, verified booking flags, crisis keywords, and take audited moderation actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
