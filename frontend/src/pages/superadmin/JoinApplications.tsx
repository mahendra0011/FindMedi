import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Flag, ShieldAlert, Siren, FileText, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import KycReviewWorkspace from './KycReviewWorkspace';

/**
 * 2.md 6/11 + 10.md 4.4 — the join-platform review console: list lane +
 * workspace side by side. The `flagged` lane is the reviewer's fraud queue
 * (submissions the submit-time automatic screen marked review/conflict);
 * `escalated` and `drafts` mirror the backend queue keys (adminApplications
 * QUEUES) so those rows are reachable without digging through `all`;
 * selecting a row mounts the full KycReviewWorkspace (documents, type
 * checklist, auto-check verdict, activation stamps, two-person decision).
 */

const LANES = [
  { key: 'pending', label: 'Pending', icon: Inbox },
  { key: 'flagged', label: 'Flagged', icon: Flag },
  { key: 'high_risk', label: 'High-risk', icon: ShieldAlert },
  { key: 'escalated', label: 'Escalated', icon: Siren },
  { key: 'needs_info', label: 'Needs info', icon: ClipboardList },
  { key: 'decided', label: 'Decided', icon: ClipboardList },
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'all', label: 'All', icon: ClipboardList },
];

export const KINDS = [
  { key: '', label: 'All Kinds' },
  { key: 'facility', label: 'Facility' },
  { key: 'practitioner', label: 'Practitioner' },
  { key: 'service', label: 'Service' },
  { key: 'product', label: 'Product' },
  { key: 'event', label: 'Event' },
  { key: 'info', label: 'Info' },
];

const VERDICT_CHIP: Record<string, string> = {
  conflict: 'bg-destructive/10 text-destructive',
  review: 'bg-warning/10 text-warning',
  error: 'bg-muted text-muted-foreground',
  clear: 'bg-success/10 text-success',
};

const LIMIT = 25;

function rowName(row: any): string {
  return (
    row?.draft?.stepData?.account?.name ||
    row?.draft?.stepData?.business?.name ||
    row?.draft?.stepData?.organization?.name ||
    row?.applicationId ||
    'Application'
  );
}

function rowSub(row: any): string {
  const account = row?.draft?.stepData?.account || {};
  return [account.email, account.phone, account.city].filter(Boolean).join(' · ');
}

export default function JoinApplications() {
  const [lane, setLane] = useState('pending');
  const [kindFilter, setKindFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('queue', lane);
      q.set('page', String(page));
      q.set('limit', String(LIMIT));
      if (kindFilter) q.set('kind', kindFilter);

      const d: any = await api.get(`/admin/applications?${q.toString()}`);
      setRows(Array.isArray(d?.applications) ? d.applications : []);
      setTotal(Number(d?.total) || 0);
      setError('');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load the queue');
    } finally {
      setLoading(false);
    }
  }, [lane, kindFilter, page]);

  useEffect(() => { load(); }, [load]);
  // Lane or kind change always returns to the list — a stale workspace for a row that
  // is no longer in this lane/kind would be misleading.
  useEffect(() => { setSelected(null); }, [lane, kindFilter]);

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" /> Join applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Provider onboarding review queue — oldest submitted first ({total} in this lane)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANES.map((l) => (
            <Button
              key={l.key}
              size="sm"
              variant={lane === l.key ? 'default' : 'outline'}
              onClick={() => { setLane(l.key); setPage(1); }}
              className="gap-1.5"
            >
              <l.icon className="w-3.5 h-3.5" /> {l.label}
              {l.key === 'flagged' && rows.length > 0 && lane === 'flagged' ? (
                <Badge variant="secondary" className="ml-1 text-[11px]">{total}</Badge>
              ) : null}
            </Button>
          ))}
        </div>
      </div>

      {/* Kind Filter Strip (Spec 08 §17: Kind-wise queues) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-muted-foreground font-medium shrink-0">Kind:</span>
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => { setKindFilter(k.key); setPage(1); }}
            className={`px-2.5 py-1 rounded-md transition-colors font-medium shrink-0 ${
              kindFilter === k.key
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/10">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 text-success" />
              <p className="font-semibold text-foreground">Queue clear</p>
              <p className="text-sm">Nothing waiting in {LANES.find((l) => l.key === lane)?.label.toLowerCase()}.</p>
            </div>
          ) : (
            rows.map((row) => {
              const id = String(row?._id);
              const verdict: string = row?.autoChecks?.verdict || '';
              const active = selected === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(active ? null : id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    active ? 'border-primary bg-primary/5' : 'border-border/60 bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{rowName(row)}</p>
                      <p className="text-xs text-muted-foreground truncate">{rowSub(row)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {verdict && verdict !== 'clear' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${VERDICT_CHIP[verdict] || VERDICT_CHIP.error}`}>
                          {verdict}
                        </span>
                      ) : null}
                      {row?.twoPersonApproval ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-warning/10 text-warning">2-person</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px] capitalize">{row?.status || 'draft'}</Badge>
                      {row?.kind ? (
                        <Badge variant="secondary" className="text-[10px] capitalize font-medium">{row.kind}</Badge>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {row?.typeKey || ''}
                      {row?.submittedAt ? ` · ${new Date(row.submittedAt).toLocaleDateString()}` : ''}
                    </span>
                  </div>
                </button>
              );
            })
          )}

          {!loading && pages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} / {pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="gap-1">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <KycReviewWorkspace
              applicationId={selected}
              onDecided={() => { setSelected(null); load(); }}
            />
          ) : (
            <Card className="hidden lg:block">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Select an application to open the review workspace — documents, type checklist,
                automatic-check verdict and activation stamps in one view.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
