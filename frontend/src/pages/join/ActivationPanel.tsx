import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  ListChecks,
  Users,
  UserPlus,
  Mail,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 2.md 7 + 2.md 9 — the applicant-facing side of "approved but not yet live".
 *
 * Two sections, both read-only unless the viewer owns the listing:
 *   1. The six-item ACTIVATION CHECKLIST (GET /join/:id/activation) — what is
 *      still between this application and a fully-live listing.
 *   2. The TEAM panel (GET /provider-staff) — invite the owner's own staff to
 *      the console. Only rendered once the application has materialised a
 *      listing (providerId), because invites are provider-scoped.
 *
 * Everything here degrades to a quiet error line: a failed checklist read must
 * never break the status list it is embedded in.
 */

interface ActivationItem {
  key: string;
  label: string;
  done: boolean;
  hint?: string;
}

interface ChecklistDto {
  items: ActivationItem[];
  doneCount: number;
  total: number;
  ratio: number;
  complete: boolean;
  approved: boolean;
  checkedAt?: string;
}

interface StaffRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  addedAt?: string;
  twoFactorEnabled?: boolean;
}

interface InviteRow {
  _id: string;
  email: string;
  template: string;
  role: string;
  expiresAt?: string;
  twoFactorRequired?: boolean;
}

interface TemplateRow {
  key: string;
  role: string;
  label: string;
  description?: string;
  twoFactorRequired?: boolean;
}

interface StaffDto {
  provider: { _id: string; name: string; status: string };
  staff: StaffRow[];
  invites: InviteRow[];
  templates: TemplateRow[];
}

export default function ActivationPanel({
  applicationId,
  providerId,
}: {
  applicationId: string;
  providerId?: string | null;
}) {
  const [checklist, setChecklist] = useState<ChecklistDto | null>(null);
  const [checkError, setCheckError] = useState('');
  const [staff, setStaff] = useState<StaffDto | null>(null);
  const [staffError, setStaffError] = useState('');

  const [template, setTemplate] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [revoking, setRevoking] = useState('');

  const loadStaff = useCallback(async () => {
    if (!providerId) return;
    try {
      const data = (await api.get(`/provider-staff?providerId=${encodeURIComponent(providerId)}`)) as unknown as StaffDto;
      setStaff(data);
      setStaffError('');
      if (!template && data.templates?.length) setTemplate(data.templates[0].key);
    } catch {
      setStaffError('Could not load the team panel.');
    }
  }, [providerId, template]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const data = (await api.get(`/join/${applicationId}/activation`)) as unknown as ChecklistDto;
        if (live) setChecklist(data);
      } catch {
        if (live) setCheckError('Could not load the activation checklist.');
      }
    })();
    return () => { live = false; };
  }, [applicationId]);

  useEffect(() => {
    if (providerId) loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await api.post('/provider-staff/invite', {
        template,
        email: email.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(providerId ? { providerId } : {}),
      });
      toast.success('Invitation sent — the single-use link is in their inbox.');
      setEmail('');
      setName('');
      await loadStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the invitation');
    } finally {
      setSending(false);
    }
  };

  const revoke = async (inviteId: string) => {
    setRevoking(inviteId);
    try {
      await api.del(`/provider-staff/invites/${inviteId}${providerId ? `?providerId=${encodeURIComponent(providerId)}` : ''}`);
      toast.success('Invitation revoked');
      await loadStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not revoke the invitation');
    } finally {
      setRevoking('');
    }
  };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {/* ── 2.md 7: activation checklist ─────────────────────────────── */}
      <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Go-live checklist</h3>
          </div>
          {checklist && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {checklist.doneCount}/{checklist.total}
            </span>
          )}
        </div>

        {checkError && <p className="text-xs text-muted-foreground">{checkError}</p>}
        {!checklist && !checkError && (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {checklist && (
          <>
            {checklist.complete && (
              <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg p-2.5">
                All activation items are complete — this listing is fully live.
              </div>
            )}
            <ul className="space-y-2">
              {checklist.items.map((item) => (
                <li key={item.key} className="flex items-start gap-2">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-muted-foreground/50 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {item.label}
                    </p>
                    {item.hint && <p className="text-[11px] text-muted-foreground/80 truncate">{item.hint}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ── 2.md 9: team + invitations (provider-scoped) ──────────────── */}
      {providerId ? (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Listing team</h3>
          </div>

          {staffError && <p className="text-xs text-muted-foreground">{staffError}</p>}
          {!staff && !staffError && (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {staff && (
            <>
              <ul className="space-y-1.5">
                {staff.staff.map((row) => (
                  <li key={String(row.userId)} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{row.name || row.email}</span>
                      <span className="text-muted-foreground"> · {row.role}</span>
                    </span>
                    {row.twoFactorEnabled && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 shrink-0">
                        <ShieldCheck className="w-3 h-3" /> 2FA
                      </span>
                    )}
                  </li>
                ))}
                {staff.staff.length === 0 && (
                  <li className="text-xs text-muted-foreground">No staff on this listing yet — you are the only owner.</li>
                )}
              </ul>

              {staff.invites.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pending invitations</p>
                  {staff.invites.map((row) => (
                    <div key={row._id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 inline-flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{row.email} · {row.template}</span>
                        {row.expiresAt && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(row.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => revoke(row._id)}
                        disabled={revoking === row._id}
                        className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline disabled:opacity-50 shrink-0"
                      >
                        <X className="w-3 h-3" /> Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={invite} className="pt-2 border-t space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Invite staff
                </p>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full text-xs border rounded-md bg-background px-2 py-1.5"
                >
                  {staff.templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} → {t.role}{t.twoFactorRequired ? ' (2FA required)' : ''}
                    </option>
                  ))}
                </select>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@clinic.in"
                  className="h-8 text-xs"
                />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name (optional)"
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" className="w-full gap-1" disabled={sending}>
                  {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                  Send invitation
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  The single-use link expires in 48 hours and is only shown in the email.
                </p>
              </form>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
