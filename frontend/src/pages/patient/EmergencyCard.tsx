/**
 * R1 — Emergency card (shared by PatientDashboardV2, Timeline, PrivacyCentre).
 * Discreet mode (prop-drilled) masks identity/PHI-ish details.
 */
import { Link } from 'react-router-dom';

export function mask(value: string, discreet: boolean): string {
  if (!discreet) return value;
  if (value.length <= 2) return '••';
  return `${value.slice(0, 1)}•••${value.slice(-1)}`;
}

export default function EmergencyCard({
  discreet = false,
  compact = false,
  bloodGroup = 'B+',
  contactName = 'Aarav Sharma',
  contactPhone = '9876543210',
}: {
  discreet?: boolean;
  compact?: boolean;
  bloodGroup?: string;
  contactName?: string;
  contactPhone?: string;
}) {
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
          <p className="font-semibold">{discreet ? '••' : bloodGroup}</p>
        </div>
        <div className="rounded-lg bg-background border p-2">
          <p className="text-xs text-muted-foreground">Emergency contact</p>
          <p className="font-semibold">{mask(contactName, discreet)}</p>
        </div>
        <div className="rounded-lg bg-background border p-2">
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="font-semibold">{discreet ? '••••••' : contactPhone}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href="tel:108" className="rounded-lg bg-destructive text-white px-4 py-2 text-sm font-semibold">
          Call 108
        </a>
        <a href="tel:14416" className="rounded-lg border px-4 py-2 text-sm">
          Tele-MANAS 14416
        </a>
      </div>
    </section>
  );
}
