import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyRound, Lock, Unlock, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';

/**
 * File 22 P2-31: idle-PIN lock + WebAuthn passkey management.
 * - Idle timer: after N minutes of no pointer/keyboard activity, locks.
 * - PIN: 4–8 digits, bcrypt-hashed server-side (never stored in state).
 * - Passkeys: WebAuthn registration/removal against /api/webauthn.
 */

const IDLE_MS = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

function genChallenge(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return buf;
}

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export default function SecuritySection() {
  const [locked, setLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const idleTimer = useRef(null);

  // ── Idle detection ─────────────────────────────────────────────────────
  const poke = useCallback(() => {
    if (locked) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setLocked(true), IDLE_MS);
  }, [locked]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    poke();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, poke));
      clearTimeout(idleTimer.current);
    };
  }, [poke]);

  // ── PIN set ────────────────────────────────────────────────────────────
  const setPin = async () => {
    if (!/^\d{4,8}$/.test(pinInput)) return;
    try {
      await api.setPin(pinInput);
      setPinInput('');
      setSettingPin(false);
      toast.success('PIN set — you will need it after idle');
    } catch { toast.error('Could not set PIN'); }
  };

  // ── PIN unlock ─────────────────────────────────────────────────────────
  const unlock = async () => {
    try {
      await api.unlockWithPin(pinInput);
      setPinInput('');
      setLocked(false);
      poke();
    } catch { toast.error('Wrong PIN'); }
  };

  // ── Passkey registration ───────────────────────────────────────────────
  const registerPasskey = async () => {
    try {
      const { default: WebAuthnClient } = await import('@simplewebauthn/browser');
      const optsResp = await fetch('/api/webauthn/register/options', { credentials: 'include' });
      const opts = await optsResp.json();
      opts.user.id = b64url(fromB64url(opts.user.id));
      opts.challenge = fromB64url(opts.challenge);
      if (opts.excludeCredentials) {
        opts.excludeCredentials = opts.excludeCredentials.map((c) => ({ ...c, id: fromB64url(c.id) }));
      }
      const att = await WebAuthnClient.startRegistration({ optionsJSON: opts });
      const verResp = await fetch('/api/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(att),
      });
      const ver = await verResp.json();
      if (ver?.verified) {
        setHasPasskey(true);
        toast.success('Passkey added');
      }
    } catch { toast.error('Registration failed or was cancelled'); }
  };

  const removePasskey = async () => {
    try {
      await api.removePasskey();
      setHasPasskey(false);
      toast.success('Passkey removed');
    } catch { toast.error('Could not remove passkey'); }
  };

  if (locked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md">
        <div className="flex w-72 flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-2xl">
          <Lock className="text-primary" size={32} />
          <h2 className="font-heading text-lg font-bold">Session locked</h2>
          <p className="text-center text-xs text-muted-foreground">Enter your PIN to continue</p>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          <Button onClick={unlock} className="w-full" disabled={!pinInput}>Unlock</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <ShieldCheck size={16} /> Security
      </h3>

      {/* PIN */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <KeyRound size={16} className="text-muted-foreground" />
        <span className="text-xs font-medium">Idle PIN lock (5 min)</span>
        <span className="flex-1" />
        {!settingPin ? (
          <Button size="sm" variant="outline" onClick={() => setSettingPin(true)}>Set PIN</Button>
        ) : (
          <>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="4–8 digits"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="h-8 w-32 text-xs"
              autoFocus
            />
            <Button size="sm" onClick={setPin} disabled={!/^\d{4,8}$/.test(pinInput)}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setSettingPin(false); setPinInput(''); }}>Cancel</Button>
          </>
        )}
      </div>

      {/* Passkey */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <ShieldCheck size={16} className="text-muted-foreground" />
        <span className="text-xs font-medium">Passkey (WebAuthn)</span>
        {hasPasskey ? <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">ENABLED</span> : null}
        <span className="flex-1" />
        {hasPasskey ? (
          <Button size="sm" variant="destructive" onClick={removePasskey}><Trash2 size={13} /> Remove</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={registerPasskey}>Add passkey</Button>
        )}
      </div>

      {/* Allowed IPs */}
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-xs font-medium">Allowed IPs / CIDR</p>
        <IPAllowlistEditor />
      </div>
    </div>
  );
}

function IPAllowlistEditor() {
  const [ips, setIps] = useState([]);
  const [val, setVal] = useState('');

  const add = () => {
    const v = val.trim();
    if (!/^(\d{1,3}\.){3}\d{1,3}(\/(16|24))?$/.test(v)) return;
    if (ips.includes(v)) return;
    setIps([...ips, v]);
    setVal('');
    void ipCall('put', { allowedIps: [...ips, v] });
  };

  const remove = (ip) => {
    const next = ips.filter((x) => x !== ip);
    setIps(next);
    void ipCall('put', { allowedIps: next });
  };

  const ipCall = async (method, body) => {
    try {
      const r = await fetch('/api/auth/allowed-ips', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      return r.ok;
    } catch { return false; }
  };

  return (
    <div className="space-y-1.5">
      {ips.map((ip) => (
        <div key={ip} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 font-mono text-[11px]">
          <span>{ip}</span>
          <button onClick={() => remove(ip)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
        </div>
      ))}
      <div className="flex gap-1">
        <Input className="h-8 font-mono text-xs" placeholder="10.0.0.0/24" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button size="sm" variant="outline" onClick={add} disabled={!/^(\d{1,3}\.){3}\d{1,3}(\/(16|24))?$/.test(val.trim())}>Add</Button>
      </div>
    </div>
  );
}
