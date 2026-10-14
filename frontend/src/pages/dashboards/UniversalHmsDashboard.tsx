/**
 * Universal HMS Dashboard Component
 *
 * Renders any role dashboard from the 6-layer HMS Blueprint specification
 * using RoleDashboardShell. Can be rendered directly with a `roleKey` prop
 * or mounted on a route with useParams (`/dashboards/:roleKey`).
 */
import { useParams } from 'react-router-dom';
import RoleDashboardShell from './RoleDashboardShell';
import { getHmsDashboardSpec } from '@/lib/hmsDashboardSpec';
import { getCmsDashboardSpec } from '@/lib/cmsDashboardSpec';
import { getLisDashboardSpec } from '@/lib/lisDashboardSpec';
import { getRisDashboardSpec } from '@/lib/risDashboardSpec';
import { useLiveKpis, fetchRoleLiveKpis } from './useLiveKpis';

export interface UniversalHmsDashboardProps {
  roleKey?: string;
}

export default function UniversalHmsDashboard({ roleKey: propRoleKey }: UniversalHmsDashboardProps) {
  const { roleKey: paramRoleKey } = useParams<{ roleKey?: string }>();
  const activeRole = propRoleKey || paramRoleKey || 'hospital_admin';

  const isClinicRole = activeRole.startsWith('clinic_') || activeRole === 'super_admin';
  const isLisRole = activeRole.startsWith('lab_') || [
    'pathologist', 'phlebotomist', 'biochem_tech', 'hematology_tech',
    'clinical_pathology_tech', 'microbiology_tech', 'histopathology_tech',
    'cytology_tech', 'serology_tech', 'molecular_tech', 'analyzer_staff',
    'home_collection_staff', 'report_coordinator',
  ].includes(activeRole);
  const isRisRole = activeRole.startsWith('radiology_') || [
    'radiologist', 'mri_technician', 'xray_technician', 'ct_technician',
    'us_technician', 'mammo_technician', 'pacs_admin', 'reporting_assistant',
    'equipment_manager',
  ].includes(activeRole);

  let spec: any = null;
  if (isClinicRole) {
    spec = getCmsDashboardSpec(activeRole);
  } else if (isLisRole) {
    spec = getLisDashboardSpec(activeRole);
  } else if (isRisRole) {
    spec = getRisDashboardSpec(activeRole);
  } else {
    spec = getHmsDashboardSpec(activeRole);
  }

  if (!spec) {
    spec = (getLisDashboardSpec(activeRole) as any)
      || (getRisDashboardSpec(activeRole) as any)
      || (getCmsDashboardSpec(activeRole) as any)
      || getHmsDashboardSpec(activeRole)
      || getHmsDashboardSpec('hospital_admin')!;
  }

  // Role-aware live KPI hook: dynamically fetches metrics for doctor, admin, nurse, etc.
  const kpis = useLiveKpis(() => fetchRoleLiveKpis(activeRole), spec.kpis);

  return (
    <div data-testid="universal-hms-dashboard" data-role-key={activeRole}>
      <RoleDashboardShell config={{ ...spec, kpis }} />
    </div>
  );
}
