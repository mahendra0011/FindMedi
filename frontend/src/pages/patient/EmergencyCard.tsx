/**
 * R1 — Emergency card (shared by PatientDashboardV2, Timeline, PrivacyCentre).
 * Discreet mode (prop-drilled) masks identity/PHI-ish details.
 */
import React from 'react';
import { Link } from 'react-router-dom';

export function mask(value: string, discreet: boolean): string {
  if (!discreet) return value;
  if (value.length <= 2) return '••';
  return `${value.slice(0, 1)}•••${value.slice(-1)}`;
}

export default function EmergencyCard({
  discreet = false,
  compact = false,
  bloodGroup = '',
  contactName = '',
  contactPhone = '',
}: {
  discreet?: boolean;
  compact?: boolean;
  bloodGroup?: string;
  contactName?: string;
  contactPhone?: string;
}) {
  // No placeholder identity: empty props render an explicit "not set" state
  // with a CTA instead of someone else's name and number.
  const hasContact = contactName.trim() !== '' || contactPhone.trim() !== '';
  return (
    <section
      data-testid="emergency-card"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-destructive">🚨 Emergency / SOS</h2>
        {!compact && (
          <Link to="/patient/addresses" className="text-xs underline">
            Manage contacts
          </Link>
        )}
      </div>
      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-background border p-2">
          <p className="text-xs text-muted-foreground">Blood group</p>
          <p className="font-semibold">{discreet ? '••' : (bloodGroup || 'Not set')}</p>
        </div>
        <div className="rounded-lg bg-background border p-2">
          <p className="text-xs text-muted-foreground">Emergency contact</p>
          <p className="font-semibold">{hasContact ? mask(contactName || '—', discreet) : 'Not set'}</p>
        </div>
        <div className="rounded-lg bg-background border p-2">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-semibold">{discreet ? '••••••' : (contactPhone || '—')}</p>
        </div>
      </div>
      {!hasContact && !compact && (
        <p className="mt-2 text-xs text-muted-foreground">
          Add an emergency contact from <Link to="/patient/addresses" className="underline">Manage contacts</Link> so responders can reach them.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="tel:108" className="rounded-lg bg-destructive text-white px-4 py-2 text-sm font-semibold">
          Call 108
        </a>
        <a href="tel:14416" className="rounded-lg border px-4 py-2 text-sm">
          Tele-MANAS 14416
        </a>
      </div>
      {!compact && <FirstResponders />}
    </section>
  );
}

function FirstResponders() {
  const [responders, setResponders] = React.useState<import('@/lib/apiTypes').Unmodelled[]>([]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { api } = await import('@/lib/api');
        const res = await api.getFirstResponders();
        if (alive) setResponders(res.responders || []);
      } catch {
        /* offline — directory stays empty */
      }
    })();
    return () => { alive = false; };
  }, []);
  if (responders.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold mb-1">Trained first responders near you</p>
      <div className="flex flex-wrap gap-2">
        {responders.slice(0, 3).map((r) => (
          <a key={String(r.id)} href={String(r.phone || '') ? `tel:${String(r.phone)}` : undefined} className="rounded-lg border px-3 py-1.5 text-xs">
            {String(r.name)} · {Number(r.experienceYears || 0)} yrs
          </a>
        ))}
      </div>
    </div>
  );
}
