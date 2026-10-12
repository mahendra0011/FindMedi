/** Wave 2 — ResidentDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'resident',
  title: '🥼 Resident Doctor Dashboard',
  subtitle: 'Duty rota, inpatient rounds, progress notes & case logs',
  permissions: ['records:read', 'records:write', 'prescriptions:write', 'patients:read', 'lab:order'],
  kpis: [
    { label: 'Assigned Patients', value: '16', hint: 'Ward 3B & Step-down ICU' },
    { label: 'Pending Rounds', value: '4', hint: 'Due before 14:00' },
    { label: 'Stat Lab Orders', value: '3', hint: 'ABG, Troponin, CBC' },
    { label: 'Duty Hours', value: '8.5 / 12', hint: 'Night handover at 20:00' },
  ],
  tasks: [
    { id: 't1', text: 'Document post-op day 1 notes for Bed 312' },
    { id: 't2', text: 'Review critical electrolyte report for Bed 204' },
    { id: 't3', text: 'Prepare discharge summary draft for Room 108' },
  ],
  alerts: [
    { id: 'a1', text: 'Bed 305 potassium value flagged 2.9 mEq/L (Critical)', level: 'warn' },
    { id: 'a2', text: 'Senior consultant rounds starting in 30 minutes', level: 'info' },
  ],
  domainModules: [
    { key: 'ipd-console', emoji: '🏥', label: 'IPD Ward Console', description: 'Patient charts, clinical vitals timeline, and doctor orders.', ctaLabel: 'Open IPD', ctaHref: '/ipd' },
    { key: 'doctor-consult', emoji: '📝', label: 'Clinical Documentation', description: 'Enter progress notes, provisional diagnosis and discharge orders.', ctaLabel: 'Clinical Workstation', ctaHref: '/doctor-consultation' },
    { key: 'vital-station', emoji: '❤️', label: 'Ward Vitals & Monitors', description: 'Live telemetry, fluid balances and nurse charting sheets.', ctaLabel: 'Vitals Station', ctaHref: '/hospital/vitals' },
  ],
};

export default function ResidentDashboard() {
  return <RoleDashboardShell config={config} />;
}
