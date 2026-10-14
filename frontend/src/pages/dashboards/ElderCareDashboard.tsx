/**
 * File 07 §3.25 — Elder-care home & hospice operations dashboard.
 * Residents, care plans, MAR logs, bed occupancy, family updates & palliative notes.
 */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'elder_care_admin',
  title: '🏡 Elder-Care Home & Hospice Dashboard',
  subtitle: 'Resident care plans, MAR dose records, palliative care & family portal updates',
  permissions: ['profile:view', 'calendar:view', 'bookings:manage', 'earnings:view', 'reviews:view', 'staff:manage', 'docs:upload', 'support:contact'],
  kpis: [
    { label: 'Active Residents', value: '42', hint: '38 Long-term · 4 Respite' },
    { label: 'Bed Occupancy', value: '91%', hint: '4 beds available' },
    { label: 'MAR Adherence', value: '99.2%', hint: '0 missed doses today' },
    { label: 'Family Updates Sent', value: '18', hint: 'Daily photos & vitals' },
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

export default function ElderCareDashboard() {
  return <RoleDashboardShell config={config} />;
}
