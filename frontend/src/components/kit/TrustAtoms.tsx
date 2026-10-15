/**
 * 11.md §7 shared kit: VerificationBadge + DiscreetBanner + ConsentToggle.
 * Small trust/privacy atoms reused across cards, profiles and checkouts.
 */
import { ShieldCheck, ShieldAlert, Clock, EyeOff } from 'lucide-react';

export type VerificationLevel = 'verified' | 'pending' | 'expired' | 'unverified';

const LEVEL_STYLE: Record<VerificationLevel, string> = {
  verified: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  expired: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  unverified: 'bg-muted text-muted-foreground border-border/40',
};

export function VerificationBadge({ level, detail }: { level: VerificationLevel; detail?: string }) {
  const Icon = level === 'verified' ? ShieldCheck : level === 'unverified' ? ShieldAlert : Clock;
  const label = level === 'verified' ? 'Verified' : level === 'pending' ? 'Verification pending' : level === 'expired' ? 'Verification expired' : 'Unverified';
  return (
    <span
      data-testid="verification-badge"
      title={detail || label}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${LEVEL_STYLE[level]}`}
    >
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

export function DiscreetBanner({ text = 'Private mode on — neutral labels, no medical details on screen.' }: { text?: string }) {
  return (
    <div data-testid="discreet-banner" className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-900 dark:text-violet-200">
      <EyeOff className="w-3.5 h-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}

export function ConsentToggle({
  purpose,
  data,
  retention,
  granted,
  onChange,
}: {
  purpose: string;
  data: string;
  retention: string;
  granted: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div data-testid="consent-toggle" className="rounded-xl border p-3 space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{purpose}</p>
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-label={purpose}
          onClick={() => onChange(!granted)}
          className={`relative w-11 h-6 rounded-full transition-colors ${granted ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${granted ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Data: {data}</p>
      <p className="text-xs text-muted-foreground">Kept: {retention} · revocable anytime</p>
    </div>
  );
}
