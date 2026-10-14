import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  LIS_SECTIONS,
  LIS_MODULES_46,
  LIS_ROLE_SPECS,
  getAllLisRoles,
  getLisDashboardSpec,
} from '@/lib/lisDashboardSpec';
import UniversalHmsDashboard from './UniversalHmsDashboard';

describe('LIS Dashboard Master Specification (Frontend Client)', () => {
  it('covers all 8 diagnostic laboratory departments', () => {
    const keys = Object.keys(LIS_SECTIONS);
    expect(keys).toEqual([
      'BIOCHEMISTRY',
      'HEMATOLOGY',
      'CLINICAL_PATHOLOGY',
      'MICROBIOLOGY',
      'HISTOPATHOLOGY',
      'CYTOLOGY',
      'SEROLOGY',
      'MOLECULAR',
    ]);
    expect(LIS_SECTIONS.BIOCHEMISTRY.name).toBe('Clinical Biochemistry');
    expect(LIS_SECTIONS.HEMATOLOGY.name).toBe('Hematology & Hemostasis');
    expect(LIS_SECTIONS.MICROBIOLOGY.name).toBe('Microbiology & Infectious Diseases');
    expect(LIS_SECTIONS.HISTOPATHOLOGY.name).toBe('Histopathology & Surgical Biopsy');
  });

  it('contains exactly 46 canonical LIS domain modules across all operational tiers', () => {
    expect(LIS_MODULES_46).toHaveLength(46);
    expect(LIS_MODULES_46[0].code).toBe('LAB_OVERVIEW');
    expect(LIS_MODULES_46[45].code).toBe('ENTERPRISE_QA');
    // Ensure unique module IDs
    const ids = new Set(LIS_MODULES_46.map((m) => m.id));
    expect(ids.size).toBe(46);
  });

  it('provides complete specification for every registered LIS role', () => {
    const roles = getAllLisRoles();
    expect(roles.length).toBeGreaterThanOrEqual(18);

    roles.forEach((roleKey) => {
      const spec = getLisDashboardSpec(roleKey);
      expect(spec).toBeDefined();
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.title).toBeTruthy();
      expect(spec.subtitle).toBeTruthy();
      expect(spec.permissions.length).toBeGreaterThan(0);
      expect(spec.sidebarSections.length).toBeGreaterThan(0);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(3);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(2);
      expect(spec.alerts.length).toBeGreaterThanOrEqual(1);
      expect(spec.domainModules.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('correctly maps alias and sub-specialty roles', () => {
    expect(getLisDashboardSpec('phlebotomist').roleKey).toBe('phlebotomist');
    expect(getLisDashboardSpec('pathologist').roleKey).toBe('pathologist');
    expect(getLisDashboardSpec('lab_biochemist').roleKey).toBe('lab_biochemist');
    expect(getLisDashboardSpec('biochem_tech').roleKey).toBe('biochem_tech');
    expect(getLisDashboardSpec('hematology_tech').roleKey).toBe('hematology_tech');
    expect(getLisDashboardSpec('microbiology_tech').roleKey).toBe('microbiology_tech');
    expect(getLisDashboardSpec('histopathology_tech').roleKey).toBe('histopathology_tech');
    expect(getLisDashboardSpec('lab_unknown_role').roleKey).toBe('lab_unknown_role');
  });

  it('renders UniversalHmsDashboard for pathologist with verified clinical queues and actions', () => {
    render(
      <MemoryRouter>
        <UniversalHmsDashboard roleKey="pathologist" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('universal-hms-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Consultant Pathologist/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Critical Values/i).length).toBeGreaterThan(0);
  });

  it('renders UniversalHmsDashboard for phlebotomist with sample collection worklist', () => {
    render(
      <MemoryRouter>
        <UniversalHmsDashboard roleKey="phlebotomist" />
      </MemoryRouter>
    );

    expect(screen.getByTestId('universal-hms-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Phlebotomist \/ Sample Collector/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Collection Queue/i).length).toBeGreaterThan(0);
  });
});
