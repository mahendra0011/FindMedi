import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('offline'))),
    post: vi.fn(() => Promise.reject(new Error('offline'))),
  },
}));

import {
  CMS_CATEGORIES,
  CMS_MODULES_70,
  CMS_ROLE_SPECS,
  getCmsDashboardSpec,
  getAllCmsRoles,
  getAllCmsModules,
} from '@/lib/cmsDashboardSpec';

import UniversalHmsDashboard from './UniversalHmsDashboard';
import WorkQueueTable from './WorkQueueTable';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CMS Dashboard Blueprint Specification (Frontend Catalog)', () => {
  it('defines all 12 core CMS functional categories', () => {
    expect(CMS_CATEGORIES).toBeDefined();
    expect(Object.keys(CMS_CATEGORIES)).toHaveLength(12);
    expect(CMS_CATEGORIES.CAT_1_ADMIN_MASTERS.name).toBe('Admin, Users & Masters');
    expect(CMS_CATEGORIES.CAT_2_PATIENT_IDENTITY.name).toBe('Patient Identity & 360° Profile');
    expect(CMS_CATEGORIES.CAT_3_APPOINTMENTS_QUEUE.name).toBe('Appointments & Queue Management');
    expect(CMS_CATEGORIES.CAT_4_OPD_EMR.name).toBe('OPD, EMR & Clinical Workstation');
    expect(CMS_CATEGORIES.CAT_5_DIAGNOSTICS.name).toBe('Pathology & Diagnostic Imaging');
    expect(CMS_CATEGORIES.CAT_6_PROCEDURES_VACCINES.name).toBe('Procedures & Immunization');
    expect(CMS_CATEGORIES.CAT_7_PHARMACY_INVENTORY.name).toBe('Pharmacy & Medical Store');
    expect(CMS_CATEGORIES.CAT_8_BILLING_PAYMENTS.name).toBe('Billing, Cashier & Payments');
    expect(CMS_CATEGORIES.CAT_9_CONTINUITY_CRM.name).toBe('Continuity of Care & CRM');
    expect(CMS_CATEGORIES.CAT_10_FINANCE_SETTLEMENTS.name).toBe('Accounts & Doctor Settlements');
    expect(CMS_CATEGORIES.CAT_11_HR_STAFF.name).toBe('HR, Staff Roster & Tasks');
    expect(CMS_CATEGORIES.CAT_12_ANALYTICS_AUDIT.name).toBe('Analytics, MIS & Audit Trails');
  });

  it('contains the complete catalog of 70 CMS modules', () => {
    const modules = getAllCmsModules();
    expect(modules).toHaveLength(70);

    // Verify first and last modules
    expect(modules[0].id).toBe(1);
    expect(modules[0].code).toBe('CMS-01');
    expect(modules[0].name).toBe('Login + User Management');

    expect(modules[69].id).toBe(70);
    expect(modules[69].code).toBe('CMS-70');
    expect(modules[69].name).toBe('Complete Clinic System Structure');

    // Every module must have code, name, category, and features
    modules.forEach((mod) => {
      expect(typeof mod.id).toBe('number');
      expect(typeof mod.category).toBe('number');
      expect(mod.category).toBeGreaterThanOrEqual(1);
      expect(mod.category).toBeLessThanOrEqual(12);
      expect(typeof mod.name).toBe('string');
      expect(mod.code).toMatch(/^CMS-\d{2}$/);
      expect(Array.isArray(mod.features)).toBe(true);
      expect(mod.features.length).toBeGreaterThan(0);
    });
  });

  it('contains comprehensive clinic role definitions adhering to the 4-part dashboard architecture', () => {
    const roles = getAllCmsRoles();
    expect(roles.length).toBeGreaterThanOrEqual(20);

    const expectedRoles = [
      'super_admin',
      'clinic_admin',
      'clinic_branch_manager',
      'clinic_doctor',
      'clinic_receptionist',
      'clinic_nurse',
      'clinic_lab_tech',
      'clinic_radiology_tech',
      'clinic_pharmacist',
      'clinic_cashier',
      'clinic_accountant',
      'clinic_inventory_mgr',
      'clinic_purchase_officer',
      'clinic_hr_admin',
      'clinic_home_collection',
      'clinic_telemed_coord',
      'clinic_crm_staff',
      'clinic_quality_mgr',
      'clinic_patient_portal',
      'clinic_owner_analytics',
    ];

    expect(roles).toEqual(expect.arrayContaining(expectedRoles));

    for (const [roleKey, spec] of Object.entries(CMS_ROLE_SPECS)) {
      expect(spec.roleKey).toBe(roleKey);
      expect(typeof spec.title).toBe('string');
      expect(typeof spec.subtitle).toBe('string');

      // Part 1: KPIs (minimum 4 overview metrics)
      expect(Array.isArray(spec.kpis)).toBe(true);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(4);
      spec.kpis.forEach((k) => {
        expect(typeof k.label).toBe('string');
        expect(typeof k.value).toBe('string');
        expect(typeof k.hint).toBe('string');
      });

      // Part 2: Work Queue / Tasks
      expect(Array.isArray(spec.tasks)).toBe(true);
      expect(spec.tasks.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(spec.workQueues)).toBe(true);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(3);

      // Part 3: Quick Actions
      expect(Array.isArray(spec.quickActions)).toBe(true);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(3);

      // Part 4: Alerts
      expect(Array.isArray(spec.alerts)).toBe(true);
      expect(spec.alerts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('resolves aliases correctly via getCmsDashboardSpec', () => {
    // Exact match
    const docSpec = getCmsDashboardSpec('clinic_doctor');
    expect(docSpec).toBeDefined();
    expect(docSpec?.roleKey).toBe('clinic_doctor');

    // Alias matches
    expect(getCmsDashboardSpec('doctor')?.roleKey).toBe('clinic_doctor');
    expect(getCmsDashboardSpec('clinic_telemed_coordinator')?.roleKey).toBe('clinic_telemed_coord');
    expect(getCmsDashboardSpec('receptionist')?.roleKey).toBe('clinic_receptionist');
    expect(getCmsDashboardSpec('cashier')?.roleKey).toBe('clinic_cashier');
    expect(getCmsDashboardSpec('nurse')?.roleKey).toBe('clinic_nurse');
    expect(getCmsDashboardSpec('admin')?.roleKey).toBe('clinic_admin');

    // Null safety
    expect(getCmsDashboardSpec('')).toBeNull();
    expect(getCmsDashboardSpec(null)).toBeNull();
    expect(getCmsDashboardSpec(undefined)).toBeNull();
  });

  it('renders UniversalHmsDashboard for clinic roles without crashing', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboards/clinic_doctor']}>
        <Routes>
          <Route path="/dashboards/:roleKey" element={<UniversalHmsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    const dashboard = screen.getByTestId('universal-hms-dashboard');
    expect(dashboard).toBeInTheDocument();
    expect(dashboard).toHaveAttribute('data-role-key', 'clinic_doctor');
    expect(screen.getByText('Doctor Clinical Workstation')).toBeInTheDocument();
    unmount();
  });

  it('renders WorkQueueTable for clinic roles with curated items and /clinic/* routes', () => {
    const docSpec = getCmsDashboardSpec('clinic_doctor');
    expect(docSpec).toBeDefined();
    render(
      <MemoryRouter>
        <WorkQueueTable roleKey="clinic_doctor" workQueues={docSpec.workQueues} />
      </MemoryRouter>
    );

    // Verify first tab queue header or tab button exists
    expect(screen.getByText(/Live Patient Waiting Queue/i)).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getAllByText('Consult Patient').length).toBeGreaterThan(0);
  });
});
