import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setStepUpPrompt } from '@/lib/stepUp';
import { api } from '@/lib/api';

/**
 * AUTHZ-M-03 (F7): the re-verification prompt behind STEP_UP_REQUIRED.
 *
 * 2FA at login proves who you are once; this proves it is still you at the
 * moment that moves money, amends a record, or walks out with an export.
 * The dialog collects the code and verifies it against /auth/step-up BEFORE
 * resolving, so a typo shows here (where the user can fix it) instead of
 * surfacing as a failed action.
 */

const SCOPE_LABELS: Record<string, string> = {
  'export:full': 'a bulk data export',
  'records:amend': 'a medical record amendment',
  'users:role-change': 'a staff role change',
  'payouts:add': 'a payout account change',
  'refunds:issue': 'a refund',
};

const labelFor = (scope: string): string => SCOPE_LABELS[scope] || 'this action';

export default function StepUpDialog() {
  const [scope, setScope] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const resolver = useRef<{ resolve: (code: string) => void; reject: (reason: Error) => void } | null>(null);

  useEffect(() => {
    setStepUpPrompt(
      (s: string) =>
        new Promise<string>((resolve, reject) => {
          resolver.current = { resolve, reject };
          setCode('');
          setError('');
          setScope(s);
        })
    );
    return () => setStepUpPrompt(null);
  }, []);

  const close = (result: string | Error) => {
    const r = resolver.current;
    resolver.current = null;
    setScope(null);
    setCode('');
    setError('');
    if (r) {
      if (result instanceof Error) r.reject(result);
      else r.resolve(result);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean || busy || !scope) return;
    setBusy(true);
    setError('');
    try {
      // Verify here so an incorrect code is fixable in the dialog; each
      // waiting request then exchanges the same (stateless) code for its own
      // single-use token.
      await api.stepUp(scope, clean);
      close(clean);
    } catch (err: any) {
      setError(err?.message || 'Incorrect verification code');
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!scope} onOpenChange={(open) => { if (!open) close(new Error('Verification cancelled')); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle>Verify it is you</DialogTitle>
          <DialogDescription>
            {scope
              ? `Enter your 6-digit authenticator code (or a backup code) to confirm ${labelFor(scope)}.`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={64}
            aria-label="Verification code"
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => close(new Error('Verification cancelled'))} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !code.trim()} className="gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
