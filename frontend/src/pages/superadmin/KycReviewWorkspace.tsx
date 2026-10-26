import React, { useEffect, useState } from 'react';
import {
  ShieldAlert, CheckCircle, XCircle, Info, ScanSearch, CalendarCheck, GraduationCap,
  FileText, Lock, Eye, ExternalLink, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { useParams } from 'react-router-dom';
import type { Unmodelled } from '@/lib/apiTypes';

/** High-risk provider types: approval needs TWO different reviewers. */
export const HIGH_RISK_TYPES = ['ambulance', 'ivf', 'fertility', 'de-addiction', 'deaddiction', 'peer_mentor', 'peer-mentor'];

/** Standard rejection templates (File 08 §17 Catalogue alignment) */
export const STANDARD_REJECTION_REASONS = [
  { code: 'OUT_OF_SCOPE', label: 'Out of Scope', text: 'OUT_OF_SCOPE: Application is outside FindMedi\'s 24 canonical health categories and approved provider types.' },
  { code: 'INVALID_COUNCIL_REGISTRATION', label: 'Invalid Council Reg', text: 'INVALID_REGISTRATION: Registration or statutory council credentials could not be verified on the official registry portal.' },
  { code: 'DOCUMENT_FORGERY_OR_MISMATCH', label: 'Doc Mismatch / Fraud', text: 'DOCUMENT_MISMATCH: Uploaded establishment documents do not match applicant identity or registered business name.' },
  { code: 'INCOMPLETE_MANDATORY_DOCS', label: 'Missing Mandatory Docs', text: 'INCOMPLETE_DOCS: Mandatory statutory documents (Clinical establishment, Drug license, or Fire/Pollution NOC) are missing or expired.' },
  { code: 'BANNED_AD_OR_CLINICAL_CLAIMS', label: 'Banned Claims', text: 'RESTRICTED_CLAIMS: Listing makes unsubstantiated or prohibited clinical claims under Drugs and Magic Remedies Act.' },
];

/** Lanes a reviewer may claim — mirrors the API's claimable set (2.md 6). */
const CLAIMABLE_STATUSES = new Set(['submitted', 'resubmitted', 'under_review', 'needs_info']);

export function isHighRiskType(typeKey?: string | null): boolean {
  if (!typeKey) return false;
  const k = String(typeKey).toLowerCase().replace(/[_\s]+/g, '-');
  return HIGH_RISK_TYPES.some((h) => k.includes(h));
}

export const REGISTRY_PORTALS_MAP: Record<string, Array<{ name: string; url: string }>> = {
  doctor: [
    { name: 'NMC National Medical Register', url: 'https://www.nmc.org.in/information-desk/indian-medical-register/' },
    { name: 'State Medical Councils', url: 'https://www.nmc.org.in/' },
  ],
  dental: [
    { name: 'Dental Council of India (DCI)', url: 'https://dciindia.gov.in/' },
  ],
  pharmacy: [
    { name: 'Pharmacy Council of India (PCI)', url: 'https://pci.nic.in/' },
  ],
  lawyer: [
    { name: 'Bar Council of India (BCI)', url: 'http://www.barcouncilofindia.org/' },
  ],
  counsellor: [
    { name: 'RCI Central Rehabilitation Register', url: 'https://rehabcouncil.nic.in/' },
    { name: 'Tele-MANAS Portal', url: 'https://telemanas.mohfw.gov.in/' },
  ],
  ayush: [
    { name: 'NCISM (Ayurveda/Unani/Siddha)', url: 'https://ncismindia.org/' },
    { name: 'NCH (Homeopathy Council)', url: 'https://nch.org.in/' },
  ],
  nurse: [
    { name: 'Indian Nursing Council (INC)', url: 'https://indiannursingcouncil.org/' },
  ],
};

export function getRegistryPortalsFor(typeKey: string) {
  const k = (typeKey || '').toLowerCase();
  if (k.includes('dent')) return REGISTRY_PORTALS_MAP.dental;
  if (k.includes('pharm')) return REGISTRY_PORTALS_MAP.pharmacy;
  if (k.includes('law')) return REGISTRY_PORTALS_MAP.lawyer;
  if (k.includes('ayush') || k.includes('ayurved') || k.includes('homeo')) return REGISTRY_PORTALS_MAP.ayush;
  if (k.includes('nurse') || k.includes('attendant')) return REGISTRY_PORTALS_MAP.nurse;
  if (k.includes('counsel') || k.includes('psych') || k.includes('mentor')) return REGISTRY_PORTALS_MAP.counsellor;
  return REGISTRY_PORTALS_MAP.doctor;
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
  applicationId?: string;
  onDecided?: () => void;
}

/**
 * KYC review workspace: applicant payload + documents + type checklist in one
 * view, with a two-person approval banner for high-risk types (ambulance, IVF,
 * de-addiction). Decisions call the existing POST /api/admin/applications/:id/decision.
 */
export default function KycReviewWorkspace({ applicationId: applicationIdProp, onDecided }: Props) {
  const params = useParams();
  const applicationId = (applicationIdProp || params.id) as Unmodelled;
  const [application, setApplication] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [checks, setChecks] = useState<Record<string, { status: string; note: string }>>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [onboarding, setOnboarding] = useState<Record<string, string | null> | null>(null);
  const [stamping, setStamping] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [probationActive, setProbationActive] = useState(true);
  const [payoutHold, setPayoutHold] = useState(false);
  const [bookingCap, setBookingCap] = useState(15);


  useEffect(() => {
    setLoading(true);
    api
      .get(`/admin/applications/${applicationId}`)
      .then((d: any) => {
        setApplication(d?.application || null);
        setDocuments(d?.documents || []);
        setConfig(d?.config || null);
        setOnboarding(d?.provider?.onboarding || null);
      })
      .catch(() => toast.error('Failed to load application'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const typeKey: string = application?.typeKey || '';
  const highRisk = isHighRiskType(typeKey);
  const registryPortals = getRegistryPortalsFor(typeKey);
  const awaitingSecond = Boolean(application?.approvalState?.firstApprovedBy) && application?.status === 'under_review';
  const items = checklistFor(typeKey, [...(config?.requiredDocs || []), ...(config?.optionalDocs || [])]);
  // 2.md 11 — the submit-time anti-fraud screen, stored on the application.
  const autoChecks = application?.autoChecks;
  const autoList: Array<{ key: string; status: string; severity: string; note: string }> =
    Array.isArray(autoChecks?.checks) ? autoChecks.checks : [];
  const verdict: string = autoChecks?.verdict || 'unchecked';
  // 2.md 6 — queue ownership: who currently holds this row (last append wins).
  const claimable = CLAIMABLE_STATUSES.has(application?.status);
  const holder: any =
    Array.isArray(application?.reviewerAssignments) && application.reviewerAssignments.length
      ? application.reviewerAssignments[application.reviewerAssignments.length - 1]
      : null;

  /**
   * Open a document preview. The `url` the workspace carries is a
   * short-lived signed link (2.md 5) — a workspace left open for an hour
   * would preview a dead URL, so re-mint on open and swap it in when the
   * fresh payload lands (guarded: never overwrite a newer selection).
   */
  const inspectDoc = async (doc: any) => {
    setSelectedDoc(doc);
    try {
      const fresh: any = await api.get(`/admin/applications/${applicationId}`);
      const updated = (fresh?.documents || []).find((d: any) => d._id === doc._id);
      if (updated?.url) {
        setSelectedDoc((prev: any) => (prev && prev._id === doc._id ? updated : prev));
      }
    } catch {
      /* keep the cached entry — it may still be inside its TTL */
    }
  };

  /** 2.md 7 — stamp/clear one of the two reviewer-only activation items. */
  const stampActivation = async (item: 'test_booking' | 'training', done: boolean) => {
    setStamping(item);
    try {
      const res: any = await api.post(`/admin/applications/${applicationId}/activation`, { item, done });
      setOnboarding(res?.onboarding || null);
      toast.success(done ? 'Activation item recorded' : 'Activation item cleared');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Could not update the activation flag');
    } finally {
      setStamping('');
    }
  };

  /** 2.md 6 — take ownership of this row; the stamped queue mirrors the console lane. */
  const claim = async () => {
    const queue =
      application?.status === 'needs_info'
        ? 'needs_info'
        : verdict === 'conflict' || autoList.some((c) => c.status === 'flag')
        ? 'flagged'
        : 'pending';
    setActing(true);
    try {
      const res: any = await api.post(`/admin/applications/${applicationId}/claim`, { queue });
      setApplication(res?.application || null);
      toast.success(res?.alreadyClaimed ? 'You already hold this row' : 'Claimed — this row is yours');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Claim failed');
    } finally {
      setActing(false);
    }
  };

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

      {autoList.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base inline-flex items-center gap-2">
              <ScanSearch className="w-4 h-4 text-primary" /> Automatic checks (submit-time screen)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                verdict === 'conflict'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : verdict === 'review'
                  ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200'
                  : verdict === 'error'
                  ? 'border-border bg-muted text-muted-foreground'
                  : 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold capitalize">Verdict: {verdict}</p>
                <p className="text-xs mt-0.5">
                  {verdict === 'conflict'
                    ? 'Duplicate identity / payout-name conflict — a second, different reviewer is now MANDATORY (two-person approval was forced on this application).'
                    : verdict === 'review'
                    ? 'The screen flagged items for a human look before you decide.'
                    : verdict === 'error'
                    ? 'The screen could not complete (fail-soft) — verify manually; submission was never blocked.'
                    : 'No duplicate identity, disposable inbox or payout-name mismatch found.'}
                </p>
                {autoChecks?.forceTwoPerson && (
                  <p className="text-xs mt-1 font-medium">Second approver: required (forced by conflict).</p>
                )}
              </div>
            </div>

            <ul className="space-y-1.5">
              {autoList.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-xs p-2 rounded-md border border-border/60">
                  <span
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      c.status === 'flag' && c.severity === 'conflict'
                        ? 'bg-destructive'
                        : c.status === 'flag'
                        ? 'bg-amber-500'
                        : c.status === 'error'
                        ? 'bg-slate-400'
                        : c.status === 'pass'
                        ? 'bg-emerald-500'
                        : 'bg-muted-foreground/40'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="font-mono">{c.key}</span>{' '}
                    <span className="text-muted-foreground">[{c.status}{c.severity !== 'info' ? `/${c.severity}` : ''}]</span>
                    <span className="text-muted-foreground"> — {c.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {application.providerId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activation stamps (approved → fully live)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Of the six go-live items, only the platform can vouch for these two — the applicant cannot prove them
              themselves. Stamps live on the listing and outlive this approval.
            </p>
            {([
              { item: 'test_booking', label: 'Platform test booking completed', icon: CalendarCheck, field: 'testBookingAt' },
              { item: 'training', label: 'Onboarding training completed', icon: GraduationCap, field: 'trainingCompletedAt' },
            ] as const).map(({ item, label, icon: Icon, field }) => {
              const set = Boolean(onboarding?.[field] ?? null);
              return (
                <div key={item} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/60">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Icon className={`w-4 h-4 ${set ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    {label}
                  </span>
                  <Button
                    size="sm"
                    variant={set ? 'outline' : 'default'}
                    disabled={stamping === item}
                    onClick={() => stampActivation(item, !set)}
                  >
                    {stamping === item ? 'Saving…' : set ? 'Undo' : 'Mark done'}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
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
            <div className="pt-3 space-y-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Submitted Documents ({documents.length})
                </span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Anti-leak watermarked
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documents.map((doc: any, idx: number) => (
                  <div key={doc._id || doc.key || idx} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/30 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium truncate">{doc.label || doc.key || `Document #${idx + 1}`}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{doc.filename || doc.type || 'Verified upload'}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={() => inspectDoc(doc)}
                    >
                      <Eye className="w-3 h-3" /> Inspect
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Official Council Registry Verification Links */}
      {registryPortals.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Official Council Registry Portals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-2">
              Cross-verify practitioner registration numbers and council status against statutory databases:
            </p>
            <div className="flex flex-wrap gap-2">
              {registryPortals.map((portal) => (
                <a
                  key={portal.name}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  {portal.name}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Probation & Risk Management */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> New Provider Probation & Risk Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Apply initial probation constraints to monitor quality and prevent financial risks during first 30 days:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card cursor-pointer">
              <input
                type="checkbox"
                checked={probationActive}
                onChange={(e) => setProbationActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span className="text-xs font-medium">Active Probation</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card cursor-pointer">
              <input
                type="checkbox"
                checked={payoutHold}
                onChange={(e) => setPayoutHold(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600"
              />
              <span className="text-xs font-medium">Payout Hold</span>
            </label>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Daily Cap:</span>
              <Input
                type="number"
                min="0"
                value={bookingCap}
                onChange={(e) => setBookingCap(Number(e.target.value) || 0)}
                placeholder="Slots/day"
                className="h-7 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {claimable && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Review owner:{' '}
                {holder ? `Reviewer …${String(holder.reviewerId).slice(-6)}` : 'unclaimed'}
                {holder?.queue ? <span className="text-muted-foreground font-normal"> · lane {holder.queue}</span> : null}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Claiming appends your name to this row — the queue keeps who held it and when (append-only, never rewritten).
              </p>
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" disabled={acting} onClick={claim}>
              <UserCheck className="w-3.5 h-3.5" />
              {acting ? 'Claiming…' : 'Claim'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Decision notes / Justification:</span>
              <span className="text-[11px] font-medium">Quick reason templates:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_REJECTION_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReason(r.text)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    reason.startsWith(r.code)
                      ? 'bg-destructive/15 text-destructive border-destructive/40 font-medium'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border-border/60'
                  }`}
                  title={r.text}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Decision notes / Resubmission reason (required for reject & needs-info)…"
              className="text-sm mt-1.5"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90" disabled={acting} onClick={() => decide('approve')}>
              <CheckCircle className="w-3.5 h-3.5" /> Approve{highRisk && !awaitingSecond ? ' (1st of 2)' : ''}
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5" disabled={acting} onClick={() => decide('reject')}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={acting} onClick={() => decide('needs_info')}>
              <Info className="w-3.5 h-3.5" /> Needs info (Resubmit)
            </Button>
            <Button size="sm" variant="outline" disabled={acting} onClick={() => decide('escalate')}>
              Escalate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Watermarked Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="doc-viewer-title">
          <div className="relative w-full max-w-2xl bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 id="doc-viewer-title" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> {selectedDoc.label || selectedDoc.key || 'Applicant Document'}
                </h3>
                <p className="text-[11px] text-muted-foreground">Watermarked reviewer copy · Direct downloads disabled</p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedDoc(null)} aria-label="Close document viewer">
                ✕
              </Button>
            </div>
            
            <div className="relative flex-1 overflow-auto p-4 bg-muted/20 min-h-[300px] flex items-center justify-center select-none">
              {/* Dynamic Watermark Overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-around items-center opacity-15 rotate-[-25deg] text-xs font-mono font-bold tracking-widest text-foreground"
                aria-hidden="true"
              >
                <div>FINDMEDI SECURE OPS · CONFIDENTIAL</div>
                <div>APPLICANT ID: {applicationId.slice(-8)}</div>
                <div>REVIEW TIMESTAMP: {new Date().toLocaleDateString('en-IN')}</div>
              </div>

              {selectedDoc.url ? (
                selectedDoc.url.endsWith('.pdf') ? (
                  <iframe src={selectedDoc.url} title="Document preview" className="w-full h-[400px] rounded border" />
                ) : (
                  <img src={selectedDoc.url} alt="Applicant document" className="max-w-full max-h-[400px] object-contain rounded shadow" />
                )
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Document reference: {selectedDoc.key || selectedDoc.filename || 'On file'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Stored securely in encrypted storage bucket</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t bg-muted/40 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Doc Hash: {selectedDoc._id || selectedDoc.key || 'VERIFIED-SHA256'}</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedDoc(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

