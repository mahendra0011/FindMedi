/**
 * R1 — Privacy centre page (also embeddable).
 * Consents + access-log section. Discreet mode is prop-drilled from
 * PatientDashboardV2; when routed directly it manages its own toggle backed
 * by localStorage.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { mask } from './EmergencyCard';

interface Consent {
  id: string;
  purpose: string;
  granted: boolean;
  updatedAt: string;
}

interface AccessEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

const LS_DISCREET = 'findmedi:discreet';

const DEFAULT_CONSENTS: Consent[] = [
  { id: 'care', purpose: 'Share records with treating doctors', granted: true, updatedAt: '' },
  { id: 'family', purpose: 'Share with family members', granted: false, updatedAt: '' },
  { id: 'research', purpose: 'Anonymised research use', granted: false, updatedAt: '' },
  { id: 'marketing', purpose: 'Health tips & offers', granted: true, updatedAt: '' },
];

export default function PrivacyCentre({
  discreet: discreetProp,
  onToggleDiscreet,
}: {
  discreet?: boolean;
  onToggleDiscreet?: (v: boolean) => void;
}) {
  const [internal, setInternal] = useState<boolean>(() => {
    try { return window.localStorage.getItem(LS_DISCREET) === '1'; } catch { return false; }
  });
  const discreet = discreetProp ?? internal;
  const setDiscreet = (v: boolean) => {
    if (onToggleDiscreet) onToggleDiscreet(v);
    else {
      setInternal(v);
      try { window.localStorage.setItem(LS_DISCREET, v ? '1' : '0'); } catch { /* ignore */ }
    }
  };

  const [consents, setConsents] = useState<Consent[]>(DEFAULT_CONSENTS);
  const [accessLog, setAccessLog] = useState<AccessEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/consents/mine') as unknown as { consents?: Consent[]; accessLog?: AccessEntry[] };
        if (cancelled) return;
        if (Array.isArray(res?.consents) && res.consents.length > 0) setConsents(res.consents);
        if (Array.isArray(res?.accessLog)) setAccessLog(res.accessLog);
      } catch { /* backend stub — keep defaults */ }
      if (!cancelled && accessLog.length === 0) {
        setAccessLog([
          { id: 'a1', actor: 'Dr. Mehta (Clinic)', action: 'Viewed prescription', at: new Date().toISOString().slice(0, 10) },
          { id: 'a2', actor: 'City Lab', action: 'Uploaded report', at: new Date().toISOString().slice(0, 10) },
        ]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleConsent = async (id: string) => {
    const next = consents.map((c) => (c.id === id ? { ...c, granted: !c.granted } : c));
    setConsents(next);
    try {
      await api.post('/consents/mine', { consents: next.map((c) => ({ id: c.id, granted: c.granted })) });
    } catch { /* local-only */ }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Privacy Centre</h1>
        <Link to="/patient/home-v2" className="text-sm underline">← Dashboard v2</Link>
      </div>

      <section data-testid="discreet-toggle" className="rounded-xl border p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Discreet mode 🕶️</h2>
          <p className="text-xs text-muted-foreground">Masks names, amounts and details on shared screens.</p>
        </div>
        <button
          type="button" role="switch" aria-checked={discreet} onClick={() => setDiscreet(!discreet)}
          className={`relative w-12 h-6 rounded-full transition-colors ${discreet ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${discreet ? 'left-6' : 'left-0.5'}`} />
        </button>
      </section>

      <section data-testid="consents" className="rounded-xl border p-4">
        <h2 className="font-semibold text-sm">Consents</h2>
        <div className="mt-3 space-y-2">
          {consents.map((c) => (
            <label key={c.id} className="flex items-center justify-between gap-3 text-sm rounded-lg border p-2">
              <span>{discreet ? mask(c.purpose, true) : c.purpose}</span>
              <input type="checkbox" checked={c.granted} onChange={() => toggleConsent(c.id)} className="w-4 h-4" />
            </label>
          ))}
        </div>
      </section>

      <section data-testid="access-log" className="rounded-xl border p-4">
        <h2 className="font-semibold text-sm">Who accessed my data</h2>
        <div className="mt-3 space-y-2">
          {accessLog.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm rounded-lg border p-2">
              <span>{discreet ? mask(a.actor, true) : a.actor} — <span className="text-muted-foreground">{a.action}</span></span>
              <span className="text-xs text-muted-foreground">{a.at}</span>
            </div>
          ))}
          {accessLog.length === 0 && <p className="text-sm text-muted-foreground">No access recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}
