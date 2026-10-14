import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  RIS_MODALITIES,
  RIS_MODULES_41,
  RIS_ROLE_SPECS,
  getAllRisRoles,
  getRisDashboardSpec,
} from '@/lib/risDashboardSpec';
import UniversalHmsDashboard from './UniversalHmsDashboard';
import UniversalRisDashboard from './UniversalRisDashboard';

describe('RIS / PACS Dashboard Master Specification (Frontend Client)', () => {
  it('covers all 8 diagnostic radiology imaging modalities', () => {
    const keys = Object.keys(RIS_MODALITIES);
    expect(keys).toEqual([
      'MRI',
      'XRAY',
      'CT_SCAN',
      'ULTRASOUND',
      'DOPPLER',
      'MAMMOGRAPHY',
      'OPG',
      'FLUOROSCOPY',
    ]);
    expect(RIS_MODALITIES.MRI.name).toBe('Magnetic Resonance Imaging');
    expect(RIS_MODALITIES.XRAY.name).toBe('Digital Radiography (X-Ray)');
    expect(RIS_MODALITIES.CT_SCAN.name).toBe('Computed Tomography (CT Scan)');
    expect(RIS_MODALITIES.MAMMOGRAPHY.name).toBe('Digital Mammography & Tomosynthesis');
  });

  it('contains exactly 41 canonical RIS/PACS domain modules', () => {
    expect(RIS_MODULES_41).toHaveLength(41);
    expect(RIS_MODULES_41[0].code).toBe('RAD_OVERVIEW');
    expect(RIS_MODULES_41[40].code).toBe('ENTERPRISE_RIS');
    // Ensure unique module IDs
    const ids = new Set(RIS_MODULES_41.map((m) => m.id));
    expect(ids.size).toBe(41);
  });

  it('provides complete specification with layer and tasks for every registered RIS role', () => {
    const roles = getAllRisRoles();
    expect(roles.length).toBeGreaterThanOrEqual(16);

    roles.forEach((roleKey) => {
      const spec = getRisDashboardSpec(roleKey);
      expect(spec).toBeDefined();
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.title).toBeTruthy();
      expect(spec.subtitle).toBeTruthy();
      expect(spec.layer).toBe('Radiology Information System & PACS (RIS)');
      expect(Array.isArray(spec.tasks)).toBe(true);
      expect(spec.tasks.length).toBeGreaterThanOrEqual(4);
      expect(spec.permissions.length).toBeGreaterThan(0);
      expect(spec.sidebarSections.length).toBeGreaterThan(0);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(3);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(2);
      expect(spec.alerts.length).toBeGreaterThanOrEqual(1);
      expect(spec.domainModules.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('correctly maps alias and modality technician roles', () => {
    expect(getRisDashboardSpec('radiologist').roleKey).toBe('radiologist');
    expect(getRisDashboardSpec('radiology_technician').roleKey).toBe('radiology_technician');
    expect(getRisDashboardSpec('mri_tech').roleKey).toBe('mri_tech');
    expect(getRisDashboardSpec('ct_tech').roleKey).toBe('ct_tech');
    expect(getRisDashboardSpec('xray_tech').roleKey).toBe('xray_tech');
    expect(getRisDashboardSpec('pacs_admin').roleKey).toBe('pacs_admin');
    expect(getRisDashboardSpec('radiology_cashier').roleKey).toBe('radiology_cashier');
    expect(getRisDashboardSpec('radiology_insurance').roleKey).toBe('radiology_insurance');
    expect(getRisDashboardSpec('radiology_inventory').roleKey).toBe('radiology_inventory');
    expect(getRisDashboardSpec('radiology_quality').roleKey).toBe('radiology_quality');
    expect(getRisDashboardSpec('radiology_accountant').roleKey).toBe('radiology_accountant');
    expect(getRisDashboardSpec('radiology_patient').roleKey).toBe('radiology_patient');
    expect(getRisDashboardSpec('radiology_unknown_role').roleKey).toBe('radiology_unknown_role');
  });

  it('renders UniversalHmsDashboard for radiologist with verified imaging queues', () => {
    render(
      <MemoryRouter>
        <UniversalHmsDashboard roleKey="radiologist" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('universal-hms-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Consultant Radiologist/i)).toBeInTheDocument();
    expect(screen.getByText(/STAT Emergency & Critical/i)).toBeInTheDocument();
  });

  it('renders UniversalRisDashboard for MRI technologist with protocol worklist and tasks', () => {
    render(
      <MemoryRouter>
        <UniversalRisDashboard roleKey="mri_technician" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('universal-ris-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/MRI Specialist Radiographer/i)).toBeInTheDocument();
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument();
  });
});
