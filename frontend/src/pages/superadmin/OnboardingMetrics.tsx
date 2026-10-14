import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp, Clock, FileWarning, FileCheck2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

const fmtInt = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');
const fmtPct = (v: unknown) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
const fmtHours = (h: unknown) => (typeof h === 'number' ? `${h.toFixed(2)} h` : '—');

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
        {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

/**
 * 2.md 13 — the join-funnel dashboard. Read-only view over
 * `GET /api/onboarding-metrics` (superadminOnly): visit -> start -> submit ->
 * approved, per-step drop-off, review time, rejection reasons, doc
 * resubmission and profile completeness. Hardcoded English like every other
 * superadmin console page; numbers are aggregated, never PII.
 */
export default function OnboardingMetrics() {
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setM(await api.get('/onboarding-metrics'));
    } catch (e: any) {
      setError(e?.message || 'Could not load onboarding metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const funnel = m?.funnel;
  const pooled = m?.dropOff?.pooled;
  const maxPooledReached = Array.isArray(pooled?.steps) && pooled.steps.length > 0
    ? Math.max(...pooled.steps.map((s: any) => s.reached || 0), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Onboarding Funnel</h1>
            <p className="text-sm text-muted-foreground">
              Visit → start → submit → approved, drop-off per wizard step (2.md 13)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {m?.generatedAt ? (
            <span className="text-xs text-muted-foreground">
              Snapshot {new Date(m.generatedAt).toLocaleString()}
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="Refresh onboarding metrics">
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <span className="text-sm text-destructive">{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !m ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading metrics…</CardContent></Card>
      ) : null}

      {m ? (
        <>
          {m.sample?.truncated ? (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3 text-xs text-amber-800 dark:text-amber-300">
                Sample capped at {fmtInt(m.sample.maxRows)} applications ({fmtInt(m.sample.applicationsAnalyzed)} analyzed) — funnel
                numbers below are from the most recent rows, not the whole table.
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat
              label="Visit"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              value={fmtInt(funnel?.visit)}
              sub={funnel?.visit === null ? 'HTTP counter unavailable' : 'join entry routes, since process start'}
            />
            <Stat
              label="Started"
              icon={<Inbox className="w-3.5 h-3.5" />}
              value={fmtInt(funnel?.start)}
              sub={`${fmtPct(funnel?.rates?.startPerVisit)} of visits`}
            />
            <Stat
              label="Submitted"
              icon={<FileCheck2 className="w-3.5 h-3.5" />}
              value={fmtInt(funnel?.submit)}
              sub={`${fmtPct(funnel?.rates?.submitPerStart)} of starts`}
            />
            <Stat
              label="Approved"
              icon={<FileCheck2 className="w-3.5 h-3.5" />}
              value={fmtInt(funnel?.approved)}
              sub={`${fmtPct(funnel?.rates?.approvedPerSubmit)} of submissions`}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Stat
              label="Avg review time"
              icon={<Clock className="w-3.5 h-3.5" />}
              value={fmtHours(m.reviewTime?.avgHours)}
              sub={typeof m.reviewTime?.p50Ms === 'number'
                ? `median ${fmtHours(m.reviewTime.p50Ms / 3_600_000)} · n=${fmtInt(m.reviewTime.count)}`
                : 'no decided applications yet'}
            />
            <Stat
              label="Doc resubmission"
              icon={<FileWarning className="w-3.5 h-3.5" />}
              value={fmtPct(m.docResubmission?.rate)}
              sub={`${fmtInt(m.docResubmission?.resubmittedDocuments)} of ${fmtInt(m.docResubmission?.totalDocuments)} documents re-uploaded`}
            />
            <Stat
              label={`Profiles ≥ ${Math.round((m.profileCompleteness?.threshold ?? 0.8) * 100)}% complete`}
              icon={<BarChart3 className="w-3.5 h-3.5" />}
              value={fmtPct(m.profileCompleteness?.pctComplete)}
              sub={`${fmtInt(m.profileCompleteness?.complete)} of ${fmtInt(m.profileCompleteness?.measured)} · avg ${fmtPct(m.profileCompleteness?.avgCompleteness)}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drop-off per wizard step (all types pooled)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                <div><span className="text-muted-foreground">Mapped:</span> {fmtInt(pooled?.mapped)}</div>
                <div><span className="text-muted-foreground">Started:</span> {fmtInt(pooled?.started)}</div>
                <div><span className="text-muted-foreground">Never started:</span> {fmtInt(pooled?.neverStarted)}</div>
                <div><span className="text-muted-foreground">No type config:</span> {fmtInt(m.dropOff?.unmappedApplications)}</div>
              </div>
              {Array.isArray(pooled?.steps) && pooled.steps.length > 0 ? (
                <div className="space-y-2.5">
                  {pooled.steps.map((s: any) => (
                    <div key={s.index} className="grid grid-cols-[1fr_auto] gap-x-3 items-center">
                      <div className="min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            <span className="text-muted-foreground mr-1.5">#{s.index + 1}</span>
                            {s.label}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {fmtInt(s.reached)} reached ({fmtPct(s.pctReached)}) · {fmtInt(s.dropOff)} stopped ({fmtPct(s.pctDropped)})
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/70"
                            style={{ width: `${Math.max(2, Math.round(((s.reached || 0) / maxPooledReached) * 100))}%` }}
                          />
                        </div>
                      </div>
                      <span />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No wizard steps measured yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Drop-off by provider type</CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(m.dropOff?.byType) && m.dropOff.byType.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4 text-right">Applications</th>
                        <th className="py-2 pr-4 text-right">Never started</th>
                        <th className="py-2">Furthest step reached</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.dropOff.byType.map((t: any) => {
                        const furthest = (t.steps || []).reduce(
                          (acc: number, s: any) => (s.dropOff > 0 ? Math.max(acc, s.index) : acc),
                          -1,
                        );
                        return (
                          <tr key={t.typeKey} className="border-b last:border-0">
                            <td className="py-2 pr-4">
                              <div className="font-medium">{t.label}</div>
                              <div className="text-xs text-muted-foreground">{t.typeKey}</div>
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">{fmtInt(t.total)}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{fmtInt(t.neverStarted)}</td>
                            <td className="py-2">
                              {furthest >= 0 && t.steps?.[furthest]
                                ? `#${furthest + 1} ${t.steps[furthest].label}`
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No per-type data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Rejection reasons
                <Badge variant="secondary" className="ml-2 align-middle">{fmtInt(m.rejections?.total)} rejected</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(m.rejections?.histogram) && m.rejections.histogram.length > 0 ? (
                <div className="space-y-3">
                  {m.rejections.histogram.map((row: any) => (
                    <div key={row.reason}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{row.reason}</span>
                        <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                          {fmtInt(row.count)} ({fmtPct(row.pct)})
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-destructive/60" style={{ width: `${Math.max(2, Math.round((row.pct || 0) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No rejections recorded.</p>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground space-y-1">
            <span className="block">Visits: {funnel?.meta?.visitSource}</span>
            <span className="block">Submitted: {funnel?.meta?.submittedDefinition}</span>
            <span className="block">Completeness: {m.profileCompleteness?.definition}</span>
            <span className="block">
              Doc resubmission (applications): {fmtPct(m.docResubmission?.applicationRate)} — {fmtInt(m.docResubmission?.resubmittedApplications)} of {fmtInt(m.docResubmission?.submittedApplications)} submitted applications.
            </span>
          </p>
        </>
      ) : null}
    </div>
  );
}
