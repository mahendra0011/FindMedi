/** Wave 2 — FacilityManagerDashboard thin wrapper over RoleDashboardShell. */
import RoleDashboardShell, { type RoleDashboardConfig } from './RoleDashboardShell';

const config: RoleDashboardConfig = {
  roleKey: 'facility_manager',
  title: '🏗️ Facility & Infrastructure Dashboard',
  subtitle: 'Asset uptime, biomedical preventive maintenance, AMC & work orders',
  permissions: ['equipment:read', 'inventory:manage', 'staff:view', 'reports:read'],
  kpis: [
    { label: 'Critical Asset Uptime', value: '99.4%', hint: 'Zero unaddressed breakdowns' },
    { label: 'Open Work Orders', value: '7', hint: '4 biomedical · 3 electrical' },
    { label: 'AMCs Due in 30 Days', value: '5', hint: 'CT Scanner, UPS, Chiller plant' },
    { label: 'Biomedical Waste Log', value: '100%', hint: 'All bags barcoded & cleared' },
  ],
  tasks: [
    { id: 't1', text: 'Approve vendor quote for MRI chiller pump preventive overhaul' },
    { id: 't2', text: 'Sign off weekly CBWTF hazardous waste manifest handover' },
    { id: 't3', text: 'Inspect medical gas manifold pressure logs (Oxygen / Nitrous)' },
  ],
  alerts: [
    { id: 'a1', text: 'DG Set 2 scheduled load test due tomorrow morning at 06:00', level: 'info' },
    { id: 'a2', text: 'Dialysis RO plant water conductivity sensor recalibration needed', level: 'warn' },
  ],
  domainModules: [
    { key: 'biomedical-hub', emoji: '🔧', label: 'Biomedical Engineering Hub', description: 'Equipment registry, breakdown logging, MTBF/MTTR metrics and work orders.', ctaLabel: 'Biomedical Assets', ctaHref: '/hospital/biomedical' },
    { key: 'enterprise-ops', emoji: '🏢', label: 'Enterprise Hub', description: 'Facility maintenance tickets, electrical infrastructure and asset lifecycle.', ctaLabel: 'Enterprise Console', ctaHref: '/hospital/enterprise' },
    { key: 'bmw-waste', emoji: '☣️', label: 'Biomedical Waste (BMW)', description: 'Color-coded bag segregation logs, daily weight manifests and CBWTF sync.', ctaLabel: 'BMW Tracker', ctaHref: '/hospital/bmw' },
  ],
};

export default function FacilityManagerDashboard() {
  return <RoleDashboardShell config={config} />;
}
