import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/**
 * Checklist I8 — global idle PIN-lock overlay.
 *
 * The axios interceptor dispatches `idle-lock` whenever the API answers
 * 403 IDLE_LOCK (server-side IDLE_LOCK_WINDOW_MS of inactivity). This
 * component blocks the whole UI until the user re-enters their PIN; a
 * successful unlock re-stamps lastActivityAt on the server so the next
 * request is not bounced straight back into the lock. There is deliberately
 * no close/cancel affordance — the lock is the point.
 */
export default function IdleLockOverlay() {
  const [locked, setLocked] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onLock = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setIdleMinutes(typeof detail.idleMinutes === 'number' ? detail.idleMinutes : null);
      setLocked(true);
      setError('');
      setPin('');
      // Focus after paint so the overlay input wins over whatever had focus.
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    window.addEventListener('idle-lock', onLock);
    return () => window.removeEventListener('idle-lock', onLock);
  }, []);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!/^\d{4,8}$/.test(pin) || busy) {
      setError('PIN must be 4–8 digits.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.unlockPin(pin);
      setLocked(false);
      setPin('');
      toast.success('Device unlocked');
    } catch (err: any) {
      const code = err?.data?.code || err?.response?.data?.code;
      if (code === 'PIN_NOT_SET') {
        setError('No PIN set on this account — set one in Settings → Security first.');
      } else if (code === 'PIN_LOCKED' || err?.status === 429) {
        setError(err?.message || 'Too many failed attempts — try again later.');
      } else {
        setError(err?.message || 'Wrong PIN.');
      }
      setPin('');
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
      data-testid="idle-lock-overlay"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm mx-4 rounded-xl border bg-card p-6 shadow-lg space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-heading font-semibold">Session locked</h2>
            <p className="text-sm text-muted-foreground">
              {idleMinutes !== null
                ? `Idle for ${idleMinutes} minute${idleMinutes === 1 ? '' : 's'}.`
                : 'Device locked after inactivity.'}{' '}
              Enter your PIN to continue.
            </p>
          </div>
        </div>
        <Input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{4,8}"
          maxLength={8}
          placeholder="••••"
          aria-label="PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          disabled={busy}
        />
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Shared device? Lock is per-user — your session stays yours.
        </p>
      </form>
    </div>
  );
}