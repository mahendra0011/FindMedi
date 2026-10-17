/**
 * File 07 §3.25 — Elder-care home & hospice operations dashboard.
 * Residents, care plans, MAR logs, bed occupancy, family updates & palliative notes.
 *
 * Live KPIs: the roster count comes from the resident list itself and bed
 * occupancy from the hospital bed register — the only two of the four this
 * dashboard can honestly derive today. MAR adherence and family-update volume
 * have no aggregate endpoint, so those cards stay on their placeholder rather
 * than carrying a demo number that never changes.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';
import { useLiveKpis, api } from './useLiveKpis';

const config: RoleDashboardConfig = {
  roleKey: 'elder_care_admin',
  title: '🏡 Elder-Care Home & Hospice Dashboard',
  subtitle: 'Resident care plans, MAR dose records, palliative care & family portal updates',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Residents', value: '—', hint: 'Long-term & respite stays' },
    { label: 'Bed Occupancy', value: '—', hint: 'Occupied vs total beds' },
    { label: 'MAR Adherence', value: '—', hint: 'Doses due & given today' },
    { label: 'Family Updates Sent', value: '—', hint: 'Daily photos & vitals' },
  ],
  tasks: [
    { id: 'ec-t1', text: 'Review evening insulin administration for Room 104' },
    { id: 'ec-t2', text: 'Update monthly care plan review with visiting geriatrician' },
    { id: 'ec-t3', text: 'Schedule weekly physio mobility session for respite wing' },
  ],
  alerts: [
    { id: 'ec-a1', text: 'Room 208 resident vitals: mild fever recorded (99.8°F)', level: 'warn' },
    { id: 'ec-a2', text: 'Annual fire safety audit checklist submission due in 15 days', level: 'info' },
  ],
  domainModules: [
    {
      key: 'resident-care-plans',
      emoji: '🧓',
      label: 'Resident Care Plans & Family View',
      description: 'Daily ADL assistance levels, diet preferences, mobility charts and consent-based family updates.',
      ctaLabel: 'Open Care Plans',
      ctaHref: '/dashboard/elder-care?tab=bookings',
    },
    {
      key: 'medication-admin',
      emoji: '💊',
      label: 'MAR & Dose Tracking',
      description: 'Medication administration records with caregiver timestamp, dosage logs and pharmacy refills.',
      ctaLabel: 'Review MAR Chart',
      ctaHref: '/dashboard/elder-care?tab=bookings',
    },
    {
      key: 'palliative-notes',
      emoji: '🔒',
      label: 'Palliative & Hospice Notes',
      description: 'Encrypted end-of-life care notes, pain management scales, and family advance directives.',
      ctaLabel: 'Secure Care Notes',
      ctaHref: '/dashboard/elder-care?tab=docs',
    },
  ],
};

async function fetchLive(): Promise<Partial<Record<string, number | string>>> {
  const [residentsRes, bedsRes] = await Promise.all([
    api.get('/eldercare/residents').catch(() => null),
    api.get('/beds/stats').catch(() => null),
  ]);
  const out: Partial<Record<string, number | string>> = {};

  const body = residentsRes?.data ?? residentsRes;
  const residents = body?.residents;
  if (Array.isArray(residents)) {
    out['Active Residents'] = residents.filter((r: { status?: string }) => !r.status || r.status === 'active').length;
  }

  const beds = bedsRes?.data ?? bedsRes;
  const total = Number(beds?.total);
  const occupied = Number(beds?.occupied);
  if (Number.isFinite(total) && total > 0 && Number.isFinite(occupied)) {
    out['Bed Occupancy'] = `${Math.round((occupied / total) * 100)}%`;
  }
  return out;
}

export default function ElderCareDashboard() {
  const kpis = useLiveKpis(fetchLive, config.kpis);
  return <RoleDashboardShell config={{ ...config, kpis }} />;
}
