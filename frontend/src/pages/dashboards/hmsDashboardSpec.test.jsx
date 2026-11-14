import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error('offline'))),
    post: vi.fn(() => Promise.reject(new Error('offline'))),
  },
}));

import {
  HMS_LAYERS,
  HMS_ROLE_SPECS,
  getHmsDashboardSpec,
  getAllHmsRoles,
  getHmsRolesByLayer,
} from '@/lib/hmsDashboardSpec';

import UniversalHmsDashboard from './UniversalHmsDashboard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HMS Dashboard Blueprint Specification (Frontend Catalog)', () => {
  it('defines all 6 structural architectural layers', () => {
    expect(HMS_LAYERS).toBeDefined();
    expect(Object.keys(HMS_LAYERS)).toHaveLength(6);
    expect(HMS_LAYERS.LAYER_1_EXECUTIVE.name).toBe('Executive Dashboards');
    expect(HMS_LAYERS.LAYER_2_CLINICAL.name).toBe('Clinical Dashboards');
    expect(HMS_LAYERS.LAYER_3_CRITICAL_CARE.name).toBe('Critical Care & Procedure Dashboards');
    expect(HMS_LAYERS.LAYER_4_DIAGNOSTICS.name).toBe('Diagnostic & Treatment Support');
    expect(HMS_LAYERS.LAYER_5_BUSINESS_OPERATIONS.name).toBe('Business & Operations');
    expect(HMS_LAYERS.LAYER_6_FACILITY_QUALITY_DIGITAL.name).toBe('Facility, Quality & Digital');
  });

  it('contains comprehensive role definitions covering the complete HMS blueprint', () => {
    const roles = getAllHmsRoles();
    expect(roles.length).toBeGreaterThanOrEqual(35);

    // Layer 1
    expect(roles).toEqual(expect.arrayContaining(['superadmin', 'hospital_owner', 'hospital_admin']));
    // Layer 2
    expect(roles).toEqual(expect.arrayContaining(['medical_superintendent', 'hod', 'doctor', 'resident_doctor', 'nurse']));
    // Layer 3
    expect(roles).toEqual(expect.arrayContaining(['emergency', 'icu_doctor', 'icu_nurse', 'ot_coordinator', 'surgeon', 'anaesthetist', 'dialysis_admin']));
    // Layer 4
    expect(roles).toEqual(expect.arrayContaining(['lab_technician', 'pathologist', 'radiology_technician', 'radiologist', 'pharmacist', 'blood_bank_admin']));
    // Layer 5
    expect(roles).toEqual(expect.arrayContaining([
      'receptionist', 'opd_coordinator', 'admission_coordinator', 'bed_manager',
      'billing_executive', 'cashier', 'tpa_agent', 'corporate_admin',
      'accountant', 'store_keeper', 'purchase_officer', 'hr_manager',
    ]));
    // Layer 6
    expect(roles).toEqual(expect.arrayContaining([
      'housekeeping_supervisor', 'cssd_technician', 'diet_kitchen_admin', 'dietitian',
      'biomedical_engineer', 'facility_manager', 'ambulance', 'quality_officer',
      'infection_control_nurse', 'patient_relations', 'security', 'discharge_coordinator',
      'mortuary_attendant', 'it_admin', 'auditor', 'mis_reporting', 'patient', 'doctor_portal',
    ]));
  });

  it('ensures each role specification adheres to the 4-part dashboard architecture', () => {
    for (const [roleKey, spec] of Object.entries(HMS_ROLE_SPECS)) {
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.layer).toBeGreaterThanOrEqual(1);
      expect(spec.layer).toBeLessThanOrEqual(6);
      expect(typeof spec.layerName).toBe('string');
      expect(typeof spec.title).toBe('string');
      expect(typeof spec.subtitle).toBe('string');

      // Part 1: KPIs (minimum 4 overview metrics)
      expect(Array.isArray(spec.kpis)).toBe(true);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(4);

      // Part 2: Tasks & work queues
      expect(Array.isArray(spec.tasks)).toBe(true);
      expect(spec.tasks.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(spec.workQueues)).toBe(true);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);

      // Part 3: Quick actions
      expect(Array.isArray(spec.quickActions)).toBe(true);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(2);

      // Part 4: Alerts
      expect(Array.isArray(spec.alerts)).toBe(true);

      // Section 53: Sidebar sections
      expect(Array.isArray(spec.sidebarSections)).toBe(true);
      expect(spec.sidebarSections.length).toBeGreaterThanOrEqual(3);
      expect(spec.sidebarSections[0]).toBe('Dashboard');
    }
  });

  it('resolves aliases and layer groups correctly', () => {
    expect(getHmsDashboardSpec('doctor')?.title).toContain('Doctor Consultation');
    expect(getHmsDashboardSpec('cmo')?.title).toContain('Medical Superintendent');
    expect(getHmsDashboardSpec('front_desk')?.title).toContain('Reception');
    expect(getHmsDashboardSpec('casualty')?.title).toContain('Emergency');
    expect(getHmsDashboardSpec('unknown_role')).toBeUndefined();

    for (let l = 1; l <= 6; l++) {
      expect(getHmsRolesByLayer(l).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('UniversalHmsDashboard Component Rendering', () => {
  it('renders UniversalHmsDashboard for roleKey="emergency" with 4 KPIs, tasks and alerts', async () => {
    render(
      <MemoryRouter>
        <UniversalHmsDashboard roleKey="emergency" />
      </MemoryRouter>
    );
    await act(async () => {});

    expect(screen.getByTestId('universal-hms-dashboard')).toBeInTheDocument();
    expect(screen.getByText('Emergency / Casualty Dashboard')).toBeInTheDocument();
    expect(screen.getAllByTestId('role-kpi')).toHaveLength(4);
    expect(screen.getByText('Patients in ER')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('renders UniversalHmsDashboard from URL route params /dashboards/:roleKey', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboards/icu_doctor']}>
        <Routes>
          <Route path="/dashboards/:roleKey" element={<UniversalHmsDashboard />} />
        </Routes>
      </MemoryRouter>
    );
    await act(async () => {});

    expect(screen.getByText('ICU Intensivist Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Active ICU Beds')).toBeInTheDocument();
  });

  it('renders Doctor Consultation Dashboard with live work queue table and quick actions', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboards/doctor']}>
        <Routes>
          <Route path="/dashboards/:roleKey" element={<UniversalHmsDashboard />} />
        </Routes>
      </MemoryRouter>
    );
    await act(async () => {});

    expect(screen.getByText('Doctor Consultation Dashboard')).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText('Patients Waiting')).toBeInTheDocument();
    expect(screen.getByText('Inpatients (IPD)')).toBeInTheDocument();
    expect(screen.getByText('Pending Rx/Orders')).toBeInTheDocument();

    // Work Queue Table
    expect(screen.getByTestId('role-work-queue-table')).toBeInTheDocument();
    expect(screen.getByText('Live Work Queue')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Start Next Consultation')).toBeInTheDocument();
    expect(screen.getByText('Write Prescription')).toBeInTheDocument();
  });
});

const SPECIALIZED_NEW_DASHBOARDS = [
];

describe.each(SPECIALIZED_NEW_DASHBOARDS)('$name Dashboard Component', ({ Comp, title, kpi }) => {
  it(`renders ${title} with sidebar, 4 KPIs, tasks, alerts and modules`, async () => {
    render(
      <MemoryRouter>
        <Comp />
      </MemoryRouter>
    );
    await act(async () => {});

    expect(screen.getByTestId('role-sidebar')).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getAllByTestId('role-kpi')).toHaveLength(4);
    expect(screen.getByText(kpi)).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
    expect(screen.getByText('Modules')).toBeInTheDocument();
  });
});
