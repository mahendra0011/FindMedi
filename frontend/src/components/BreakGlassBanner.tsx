import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * File 23 §4.2 — high-visibility BREAK-GLASS ACTIVE banner.
 * Mounted globally (App.tsx); polls the caller's own approved, unexpired,
 * unrevoked grants every 30s and shows a red banner with a live countdown
 * while a break-glass session is active. Every read under the grant is logged.
 */
export default function BreakGlassBanner() {
  const { user } = useAuth();
  const [grants, setGrants] = useState<Array<{ id: string; expiresAt: string; subjectType?: string }>>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const platformRoles = ['superadmin', 'super_admin', 'dpo', 'clinical_safety', 'security_admin'];
    if (!user || !platformRoles.includes(user.role as string)) { setGrants([]); return undefined; }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.getMyBreakGlass();
        if (cancelled) return;
        setGrants(Array.isArray(res?.grants) ? res.grants : []);
      } catch {
        if (!cancelled) setGrants([]);
      }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [user]);

  useEffect(() => {
    if (!grants.length) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [grants.length]);

  const soonest = grants.reduce<number | null>(
    (min, g) => (min === null || new Date(g.expiresAt).getTime() < min ? new Date(g.expiresAt).getTime() : min),
    null,
  );
  const remainingSeconds = soonest === null ? 0 : Math.max(0, (soonest - now) / 1000);

  if (!user || grants.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      data-testid="break-glass-banner"
      className="fixed top-0 left-0 right-0 z-[95] bg-red-700 text-white border-b-2 border-red-900 px-4 py-2 flex items-center justify-center gap-3 shadow-lg"
    >
      <ShieldAlert className="h-5 w-5 shrink-0 animate-pulse" aria-hidden="true" />
      <span className="text-sm font-semibold tracking-wide">
        BREAK-GLASS ACTIVE — {grants.length} grant{grants.length > 1 ? 's' : ''} open · every access is logged · expires in {fmt(remainingSeconds)}
      </span>
    </div>
  );
}
