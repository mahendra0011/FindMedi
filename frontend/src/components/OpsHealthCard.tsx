import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Server, Radio, HardDrive, Layers, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

/**
 * ADM-M-05: the freshness/health widget on the superadmin overview.
 *
 * The backend snapshot (GET /api/ops-health) is superadmin-only, reports
 * instead of gating (200 with `degraded: true`), and carries enum status
 * words only. This component is the human half of that contract:
 *
 *   - FAIL-SOFT RENDER: if the fetch fails it shows an error tile rather than
 *     hiding - a health widget that disappears when the API is unhealthy is
 *     useless exactly when it is needed.
 *   - SELF-POLLING: 60s interval, cleared on unmount, independent of the
 *     parent page's refresh cadence so KPI polling can't starve it.
 *   - EXPLICIT TYPES: PlatformKPIs carries pre-existing baseline errors; this
 *     file adds zero (typecheck ratchet is at 11760 and may only go down).
 */

type SectionStatus = 'ok' | 'disabled' | 'unavailable' | 'error';

interface QueueSummary {
  enabled: boolean;
  reason?: string;
  error?: string;
  queues?: Record<string, { waiting?: number; active?: number; delayed?: number; failed?: number }>;
}

interface KafkaSummary {
  status: SectionStatus;
  consumerLag?: number;
  lagByTopic?: Record<string, number>;
  dlqDepth?: number;
  bullFailed?: number;
}

interface PipelineEntry {
  name: string;
  status: 'ok' | 'stale' | 'unknown';
  ageMs: number | null;
  budgetMs: number;
  currentlyFailing: boolean;
}

interface PipelinesSummary {
  degraded: boolean;
  counts: { total: number; stale: number; unknown: number; failing: number };
  pipelines: PipelineEntry[];
}

interface HttpSummary {
  windowSeconds: number;
  total: number;
  clientErrors: number;
  serverErrors: number;
  errorRate: number;
}

interface OpsHealthSnapshot {
  checkedAt: string;
  uptimeSeconds: number;
  degraded: boolean;
  mongo: { status: SectionStatus };
  redis: { status: SectionStatus };
  queues: QueueSummary;
  kafka: KafkaSummary;
  pipelines: PipelinesSummary;
  http: HttpSummary;
}

const STATUS_TONE: Record<SectionStatus, string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  disabled: 'text-muted-foreground',
  unavailable: 'text-amber-600 dark:text-amber-400',
  error: 'text-destructive',
};

const STATUS_LABEL: Record<SectionStatus, string> = {
  ok: 'OK',
  disabled: 'Off',
  unavailable: 'Down',
  error: 'Error',
};

const PIPELINE_TONE: Record<'ok' | 'stale' | 'unknown', string> = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  stale: 'text-amber-600 dark:text-amber-400',
  unknown: 'text-muted-foreground',
};

const fmtCheckedAt = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'just now' : d.toLocaleTimeString();
};

const fmtCount = (n: number | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString() : '-';

const StatusWord = ({ status }: { status: SectionStatus }) => (
  <span className={`text-sm font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
);

export default function OpsHealthCard() {
  const [snapshot, setSnapshot] = useState<OpsHealthSnapshot | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const snap = (await api.getOpsHealth()) as OpsHealthSnapshot;
        if (!activeRef.current) return;
        setSnapshot(snap);
        setFetchError(false);
      } catch {
        // Fail-soft: keep the last good snapshot, surface that refresh failed.
        if (activeRef.current) setFetchError(true);
      } finally {
        if (activeRef.current) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 60_000);
    return () => {
      activeRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const queueWaiting = snapshot?.queues?.queues
    ? Object.values(snapshot.queues.queues).reduce((sum, q) => sum + (q?.waiting || 0), 0)
    : 0;
  const queueFailed = snapshot?.queues?.queues
    ? Object.values(snapshot.queues.queues).reduce((sum, q) => sum + (q?.failed || 0), 0)
    : 0;
  const counts = snapshot?.pipelines?.counts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.58, duration: 0.35 }}
    >
      <Card className="hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              System Health
            </span>
            <span className="flex items-center gap-2">
              {fetchError && (
                <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                  refresh failed
                </Badge>
              )}
              {snapshot ? (
                snapshot.degraded ? (
                  <Badge variant="outline" className="text-xs gap-1 text-destructive border-destructive/40">
                    <ShieldAlert className="w-3 h-3" /> Degraded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                    <ShieldCheck className="w-3 h-3" /> Healthy
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {loading ? 'checking\u2026' : 'unavailable'}
                </Badge>
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!snapshot && !fetchError && (
            <p className="text-sm text-muted-foreground py-2">Collecting system health&hellip;</p>
          )}
          {!snapshot && fetchError && (
            <p className="text-sm text-muted-foreground py-2">
              Health snapshot unavailable - the API did not answer. This is itself a signal.
            </p>
          )}
          {snapshot && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Database className="w-3.5 h-3.5" /> MongoDB
                </p>
                <StatusWord status={snapshot.mongo.status} />
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Redis
                </p>
                <StatusWord status={snapshot.redis.status} />
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Radio className="w-3.5 h-3.5" /> Kafka
                </p>
                <StatusWord status={snapshot.kafka.status} />
                {snapshot.kafka.status === 'ok' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    lag {fmtCount(snapshot.kafka.consumerLag)} &middot; DLQ {fmtCount(snapshot.kafka.dlqDepth)}
                  </p>
                )}
              </div>              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Server className="w-3.5 h-3.5" /> Queues
                </p>
                {snapshot.queues.enabled ? (
                  <span className="text-sm font-semibold">
                    {fmtCount(queueWaiting)} waiting
                    {queueFailed > 0 && (
                      <span className="text-destructive text-xs ml-1">({fmtCount(queueFailed)} failed)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">Off</span>
                )}
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5" /> Pipelines
                </p>
                <span className="text-sm font-semibold">
                  {counts ? (
                    <>
                      {/* backend counts = {total, stale, unknown, failing}; ok is derived */}
                      <span className={PIPELINE_TONE.ok}>
                        {Math.max(0, counts.total - counts.stale - counts.unknown)}
                      </span>
                      <span className="text-muted-foreground"> ok </span>
                      <span className={PIPELINE_TONE.stale}>{counts.stale}</span>
                      <span className="text-muted-foreground"> stale </span>
                      <span className={PIPELINE_TONE.unknown}>{counts.unknown}</span>
                      <span className="text-muted-foreground"> unknown</span>
                    </>
                  ) : (
                    '-'
                  )}
                </span>
                {counts && counts.failing > 0 && (
                  <p className="text-xs text-destructive mt-1">{counts.failing} failing</p>
                )}
              </div>
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                  <Activity className="w-3.5 h-3.5" /> API errors (5m)
                </p>
                <span
                  className={`text-sm font-semibold ${
                    snapshot.http.errorRate > 0.05
                      ? 'text-destructive'
                      : snapshot.http.errorRate > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {(snapshot.http.errorRate * 100).toFixed(1)}%
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmtCount(snapshot.http.total)} requests
                </p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 col-span-2 md:col-span-2">
                <p className="text-xs text-muted-foreground mb-1.5">Snapshot</p>
                <p className="text-xs text-muted-foreground">
                  checked {fmtCheckedAt(snapshot.checkedAt)} &middot; up{' '}
                  {Math.floor(snapshot.uptimeSeconds / 3600)}h{' '}
                  {Math.floor((snapshot.uptimeSeconds % 3600) / 60)}m
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mongo is authoritative for readiness; this widget reports, it does not gate.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
