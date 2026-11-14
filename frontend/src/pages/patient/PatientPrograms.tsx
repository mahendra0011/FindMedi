import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Clock, QrCode, PauseCircle, PlayCircle,
  RotateCcw, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Unmodelled } from '@/lib/apiTypes';

/**
 * Patient programs & memberships.
 *
 * The rows come from the buyer's own memberships (GET /api/memberships) and
 * every action here hits the membership lifecycle API - freeze, resume,
 * check-in and cancel. Nothing is a local fixture: a membership that is not
 * on the server must not be rendered as if the patient owned it, and a freeze
 * that only toggled a local boolean would tell the patient their term is
 * paused while the server still counts the days against them.
 */

const TERMINAL = ['CANCELLED', 'EXPIRED'];

const titleCase = (value: Unmodelled) =>
  String(value || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const fmtDate = (iso: Unmodelled) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface ProgramRow {
  id: string;
  title: string;
  provider: string;
  plan: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  daysLeft: number | null;
  isFrozen: boolean;
  creditsLeft: number | null;
  sessionsCompleted: string;
  progressPercent: number;
  nextMilestone: string;
  checkIns: number;
  autoRenew: boolean;
}

export default function PatientPrograms() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyMemberships();
      const rows = (res?.memberships || []) as Unmodelled[];
      setPrograms(rows.map((row: Unmodelled) => {
        const plan = row.planId && typeof row.planId === 'object' ? row.planId : null;
        const provider = row.providerId && typeof row.providerId === 'object' ? row.providerId : null;
        const checkIns = Array.isArray(row.checkIns) ? row.checkIns.length : 0;
        const total = row.creditsLeft != null ? row.checkIns?.length + row.creditsLeft || 0 : 0;
        const used = Array.isArray(row.checkIns) ? row.checkIns.length : 0;
        return {
          id: String(row._id || row.id || ''),
          title: plan?.name || plan?.title || 'Membership plan',
          provider: provider?.name || provider?.businessName || 'Partner provider',
          plan: plan?.termLabel || plan?.durationLabel || 'Membership',
          type: plan?.category || 'Membership',
          status: String(row.status || 'ACTIVE'),
          startDate: fmtDate(row.startAt),
          endDate: fmtDate(row.endAt),
          daysLeft: row.daysLeft == null ? null : Number(row.daysLeft),
          isFrozen: String(row.status) === 'FROZEN',
          creditsLeft: row.creditsLeft == null ? null : Number(row.creditsLeft),
          sessionsCompleted: row.creditsLeft == null
            ? `${used} session${used === 1 ? '' : 's'} attended`
            : `${used} of ${total} sessions used`,
          progressPercent: total > 0 ? Math.round((used / total) * 100) : 0,
          nextMilestone: row.freeze?.resumeAt
            ? `Frozen until ${fmtDate(row.freeze.resumeAt)}`
            : row.endAt
              ? `Term ends on ${fmtDate(row.endAt)}`
              : 'No upcoming milestone',
          checkIns,
          autoRenew: Boolean(row.autoRenew),
        };
      }));
      setError('');
    } catch {
      setError('Could not load your memberships.');
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  const handleToggleFreeze = async (row: ProgramRow) => {
    setActingId(row.id);
    try {
      if (row.isFrozen) {
        await api.unfreezeMembership(row.id);
        toast.success('Membership resumed successfully.');
      } else {
        await api.freezeMembership(row.id, { days: 14, reason: 'Paused from the patient app' });
        toast.success('Membership frozen for 14 days.');
      }
      await loadPrograms();
    } catch (e: Unmodelled) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not update the membership.');
    } finally {
      setActingId(null);
    }
  };

  const handleCheckIn = async (row: ProgramRow) => {
    setActingId(row.id);
    try {
      await api.checkInMembership(row.id, { method: 'app' });
      toast.success('Checked in for this session.');
      await loadPrograms();
    } catch (e: Unmodelled) {
      toast.error(e?.response?.data?.message || e?.message || 'Check-in failed.');
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (row: ProgramRow) => {
    setActingId(row.id);
    try {
      await api.cancelMembership(row.id, { reason: 'Cancelled from the patient app' });
      toast.success('Membership cancelled.');
      await loadPrograms();
    } catch (e: Unmodelled) {
      toast.error(e?.response?.data?.message || e?.message || 'Cancellation failed.');
    } finally {
      setActingId(null);
    }
  };

  const visible = programs.filter((p) => {
    const terminal = TERMINAL.includes(p.status.toUpperCase());
    return activeTab === 'completed' ? terminal : !terminal;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Programs & Memberships</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your chronic care plans, fitness passes, recurring dialysis/physio packs, and subscriptions.
          </p>
        </div>

        <Link to="/patient/services">
          <Button size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Explore New Programs
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Active Subscriptions ({programs.filter((p) => !TERMINAL.includes(p.status.toUpperCase())).length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/50'
          }`}
        >
          Past / Completed
        </button>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground py-8 text-center">Loading your memberships…</p>
      )}

      {!loading && error && (
        <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-1">
          <XCircle className="w-5 h-5 mx-auto text-destructive" />
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="p-8 rounded-3xl border border-border/60 bg-card text-center space-y-1">
          <QrCode className="w-5 h-5 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            {activeTab === 'completed' ? 'No past memberships' : 'No active memberships'}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeTab === 'completed'
              ? 'Cancelled and expired terms will appear here.'
              : 'Buy a plan from a partner provider to see it here.'}
          </p>
        </div>
      )}

      {/* Programs List */}
      <div className="space-y-4">
        {visible.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-3xl border border-border/60 bg-card space-y-4 shadow-xs hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                    {item.type}
                  </Badge>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.isFrozen
                      ? 'bg-amber-500/10 text-amber-600'
                      : item.status.toUpperCase() === 'TRIAL'
                        ? 'bg-info/10 text-info'
                        : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {item.isFrozen ? 'Temporarily Frozen' : titleCase(item.status)}
                  </span>
                </div>
                <h2 className="font-heading text-base font-bold text-foreground">{item.title}</h2>
                <p className="text-xs text-muted-foreground">{item.provider} • <strong className="text-foreground">{item.plan}</strong></p>
              </div>

              <div className="text-right sm:shrink-0">
                <span className="text-xs text-muted-foreground block">Validity</span>
                <span className="text-sm font-extrabold text-foreground">
                  {item.daysLeft == null ? '—' : `${item.daysLeft} days remaining`}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress: {item.sessionsCompleted}</span>
                <span className="font-bold text-foreground">{item.progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Milestone callout */}
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Next Milestone: {item.nextMilestone}</span>
              </div>

              <div className="flex items-center gap-2">
                {!item.isFrozen && !TERMINAL.includes(item.status.toUpperCase()) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => handleCheckIn(item)}
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5 text-primary" /> Check in
                  </Button>
                )}

                {!TERMINAL.includes(item.status.toUpperCase()) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => handleToggleFreeze(item)}
                    className="h-7 text-xs rounded-lg gap-1"
                  >
                    {item.isFrozen ? (
                      <><PlayCircle className="w-3.5 h-3.5 text-emerald-600" /> Resume Pass</>
                    ) : (
                      <><PauseCircle className="w-3.5 h-3.5 text-amber-600" /> Freeze Pass (14d)</>
                    )}
                  </Button>
                )}

                {!TERMINAL.includes(item.status.toUpperCase()) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actingId === item.id}
                    onClick={() => handleCancel(item)}
                    className="h-7 text-xs rounded-lg gap-1 text-destructive"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                )}

                <Button
                  size="sm"
                  className="h-7 text-xs rounded-lg font-semibold"
                  onClick={() => toast.info('Navigating to program session scheduler...')}
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
