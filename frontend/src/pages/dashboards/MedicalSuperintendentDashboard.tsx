/** Wave 2 — MedicalSuperintendentDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'medical_superintendent',
  title: '🏥 Medical Superintendent Command Center',
  subtitle: 'Hospital-wide clinical KPIs, bed capacity, OT utilization & compliance',
  permissions: ['records:read', 'reports:read', 'audit:read', 'appointments:read', 'patients:read', 'hospital:manage'],
  kpis: [
    { label: 'Hospital Census', value: '186 / 220', hint: '84.5% overall occupancy' },
    { label: 'OT Utilization', value: '88.2%', hint: '7 tables operational today' },
    { label: 'Average ALOS', value: '3.8 days', hint: 'Within benchmark < 4.2' },
    { label: 'Clinical Incidents', value: '0', hint: 'Zero sentinel events' },
  ],
  tasks: [
    { id: 't1', text: 'Convene monthly hospital infection control committee (HICC)' },
    { id: 't2', text: 'Sign off high-risk surgical consent protocol update' },
    { id: 't3', text: 'Review cross-department mortality & clinical audit deck' },
  ],
  alerts: [
    { id: 'a1', text: 'ICU capacity peaked at 92% — step-down protocol activated', level: 'warn' },
    { id: 'a2', text: 'State health department inspection checklist cleared 100%', level: 'info' },
  ],
  domainModules: [
    { key: 'hospital-v2', emoji: '🏢', label: 'Hospital Command Console', description: 'Real-time overview of admissions, emergency tokens, revenues and staff rosters.', ctaLabel: 'Hospital Command', ctaHref: '/dashboard/v2' },
    { key: 'quality-board', emoji: '🏅', label: 'Clinical Quality & NABH', description: 'Infection rates, needle-stick incidents, fall prevention and hand-hygiene audits.', ctaLabel: 'Quality Board', ctaHref: '/hospital/quality' },
    { key: 'ot-board', emoji: '🔪', label: 'Operation Theatre Board', description: 'Live surgical suite status, PAC clearance and post-op recovery tracking.', ctaLabel: 'OT Board', ctaHref: '/ot/board' },
  ],
};

export default function MedicalSuperintendentDashboard() {
  return <RoleDashboardShell config={config} />;
}
