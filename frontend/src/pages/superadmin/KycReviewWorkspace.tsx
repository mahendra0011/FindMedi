import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';

/** High-risk provider types: approval needs TWO different reviewers. */
export const HIGH_RISK_TYPES = ['ambulance', 'ivf', 'fertility', 'de-addiction', 'deaddiction'];

export function isHighRiskType(typeKey?: string | null): boolean {
  if (!typeKey) return false;
  const k = String(typeKey).toLowerCase().replace(/[_\s]+/g, '-');
  return HIGH_RISK_TYPES.some((h) => k.includes(h));
}

/** Type-wise review checklist: configured docs + universal identity checks. */
export function checklistFor(typeKey: string, requiredDocs: Array<{ key: string; label?: string }> = []) {
  const base = [
    { key: 'identity', label: 'Government ID matches applicant name' },
    { key: 'address', label: 'Address proof valid & current' },
  ];
  const docs = requiredDocs.map((d) => ({ key: String(d.key), label: d.label || String(d.key) }));
  const extra: Array<{ key: string; label: string }> =
    isHighRiskType(typeKey)
      ? [
          { key: 'second_reviewer', label: 'Second (different) reviewer approval recorded' },
          { key: 'license_validity', label: 'Clinical licence in date & issuing authority verified' },
          { key: 'facility_inspection', label: 'Facility / vehicle inspection evidence on file' },
        ]
      : [{ key: 'license_validity', label: 'Registration / licence in date' }];
  return [...base, ...docs, ...extra];
}

interface Props {
  applicationId: string;
  onDecided?: () => void;
}

/**
 * KYC review workspace: applicant payload + documents + type checklist in one
 * view, with a two-person approval banner for high-risk types (ambulance, IVF,
 * de-addiction). Decisions call the existing POST /api/admin/applications/:id/decision.
 */
export default function KycReviewWorkspace({ applicationId, onDecided }: Props) {
  const [application, setApplication] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [checks, setChecks] = useState<Record<string, { status: string; note: string }>>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/admin/applications/${applicationId}`)
      .then((d: any) => {
        setApplication(d?.application || null);
        setDocuments(d?.documents || []);
        setConfig(d?.config || null);
      })
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const typeKey: string = application?.typeKey || '';
  const highRisk = isHighRiskType(typeKey);
  const awaitingSecond = Boolean(application?.approvalState?.firstApprovedBy) && application?.status === 'under_review';
  const items = checklistFor(typeKey, [...(config?.requiredDocs || []), ...(config?.optionalDocs || [])]);

  const decide = async (decision: 'approve' | 'reject' | 'needs_info' | 'escalate') => {
    if (decision === 'reject' && !reason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setActing(true);
    try {
      const checklist = Object.entries(checks).map(([key, v]) => ({ key, status: v.status, note: v.note || '' }));
      const res: any = await api.post(`/admin/applications/${applicationId}/decision`, {
        decision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(checklist.length ? { checklist } : {}),
      });
      if (res?.awaitingSecondApprover) {
        toast.success('First approval recorded — a second, different reviewer must approve');
      } else {
        toast.success(`Decision recorded: ${decision}`);
      }
      setApplication(res?.application || null);
      onDecided?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Decision failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!application) return <p className="text-sm text-muted-foreground">Application not found.</p>;

  return (
    <div className="space-y-4">
      {highRisk && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10" role="alert">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              High-risk type ({typeKey}) — two-person approval required
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {awaitingSecond
                ? 'First approval is recorded. A second, DIFFERENT reviewer must approve — the same reviewer cannot close it.'
                : 'The first approve only parks the application in review. A second, different reviewer completes the approval.'}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type-wise checklist — {typeKey || 'unknown type'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const cur = checks[item.key] || { status: 'pending', note: '' };
            return (
              <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border border-border/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{item.key}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {['verified', 'failed', 'pending'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setChecks((c) => ({ ...c, [item.key]: { ...cur, status: s } }))}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${
                        cur.status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {documents.length > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> {documents.length} document(s) attached — inspect fileRef copies in the reviewer console.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required for reject)…" className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90" disabled={acting} onClick={() => decide('approve')}>
              <CheckCircle className="w-3.5 h-3.5" /> Approve{highRisk && !awaitingSecond ? ' (1st of 2)' : ''}
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" disabled={acting} onClick={() => decide('reject')}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button size="sm" variant="outline" disabled={acting} onClick={() => decide('needs_info')}>
              Needs info
            </Button>
            <Button size="sm" variant="outline" disabled={acting} onClick={() => decide('escalate')}>
              Escalate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
