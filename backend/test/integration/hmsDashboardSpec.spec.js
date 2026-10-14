import { mountApp } from '../helpers/appHarness.js';
import {
  HMS_LAYERS,
  HMS_ROLE_SPECS,
  getHmsDashboardSpec,
  getAllHmsRoles,
  getHmsRolesByLayer,
} from '../../src/config/hmsDashboardSpec.js';

const { as } = await mountApp('dashboard', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const hospitalAdmin = { _id: '507f1f77bcf86cd799439012', role: 'hospital_admin', hospitalId: '507f1f77bcf86cd799439090' };
const doctor = { _id: '507f1f77bcf86cd799439013', role: 'doctor', hospitalId: '507f1f77bcf86cd799439090' };

describe('HMS Dashboard Blueprint Master Specification (Backend)', () => {
  test('defines all 6 structural architectural layers', () => {
    expect(HMS_LAYERS).toBeDefined();
    const layerKeys = Object.keys(HMS_LAYERS);
    expect(layerKeys).toHaveLength(6);

    const layerIds = Object.values(HMS_LAYERS).map((l) => l.id);
    expect(layerIds).toEqual([1, 2, 3, 4, 5, 6]);

    expect(HMS_LAYERS.LAYER_1_EXECUTIVE.name).toBe('Executive Dashboards');
    expect(HMS_LAYERS.LAYER_2_CLINICAL.name).toBe('Clinical Dashboards');
    expect(HMS_LAYERS.LAYER_3_CRITICAL_CARE.name).toBe('Critical Care & Procedure Dashboards');
    expect(HMS_LAYERS.LAYER_4_DIAGNOSTICS.name).toBe('Diagnostic & Treatment Support');
    expect(HMS_LAYERS.LAYER_5_BUSINESS_OPERATIONS.name).toBe('Business & Operations');
    expect(HMS_LAYERS.LAYER_6_FACILITY_QUALITY_DIGITAL.name).toBe('Facility, Quality & Digital');
  });

  test('contains comprehensive role definitions covering the complete HMS blueprint', () => {
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

  test('ensures each role specification adheres to the 4-part dashboard architecture', () => {
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
      for (const kpi of spec.kpis) {
        expect(typeof kpi.label).toBe('string');
        expect(typeof kpi.value).toBe('string');
      }

      // Part 2: Work queues / tasks
      expect(Array.isArray(spec.tasks)).toBe(true);
      expect(spec.tasks.length).toBeGreaterThanOrEqual(2);
      for (const task of spec.tasks) {
        expect(typeof task.id).toBe('string');
        expect(typeof task.text).toBe('string');
      }
      expect(Array.isArray(spec.workQueues)).toBe(true);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);

      // Part 3: Quick actions (minimum 2 workflow actions)
      expect(Array.isArray(spec.quickActions)).toBe(true);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(2);

      // Part 4: Alerts
      expect(Array.isArray(spec.alerts)).toBe(true);

      // Canonical Sidebar Navigation (Section 53)
      expect(Array.isArray(spec.sidebarSections)).toBe(true);
      expect(spec.sidebarSections.length).toBeGreaterThanOrEqual(3);
      expect(spec.sidebarSections[0]).toBe('Dashboard');

      // Permissions
      expect(Array.isArray(spec.permissions)).toBe(true);
      expect(spec.permissions.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('resolves roles by architectural layer correctly', () => {
    for (let layer = 1; layer <= 6; layer++) {
      const layerRoles = getHmsRolesByLayer(layer);
      expect(layerRoles.length).toBeGreaterThanOrEqual(3);
      for (const r of layerRoles) {
        expect(r.layer).toBe(layer);
      }
    }
  });

  test('getHmsDashboardSpec resolves aliases correctly', () => {
    expect(getHmsDashboardSpec('doctor')?.title).toContain('Doctor Consultation');
    expect(getHmsDashboardSpec('cmo')?.title).toContain('Medical Superintendent');
    expect(getHmsDashboardSpec('front_desk')?.title).toContain('Reception');
    expect(getHmsDashboardSpec('insurance_desk')?.title).toContain('Insurance & TPA');
    expect(getHmsDashboardSpec('ward_nurse')?.title).toContain('Ward Nursing');
    expect(getHmsDashboardSpec('casualty')?.title).toContain('Emergency');
    expect(getHmsDashboardSpec('non_existent_role')).toBeUndefined();
  });

  test('GET /api/dashboard/hms-spec returns 200 with layers, roles, and specs', async () => {
    const res = await as(doctor).get('/hms-spec').expect(200);
    expect(res.body.layers).toBeDefined();
    expect(res.body.roles.length).toBeGreaterThanOrEqual(35);
    expect(res.body.specs.doctor).toBeDefined();
  });

  test('GET /api/dashboard/hms-spec/:roleKey returns specific role spec', async () => {
    const res = await as(hospitalAdmin).get('/hms-spec/emergency').expect(200);
    expect(res.body.spec.roleKey).toBe('emergency');
    expect(res.body.spec.layer).toBe(3);
    expect(res.body.spec.title).toContain('Emergency');
  });

  test('GET /api/dashboard/hms-spec/invalid_xyz returns 404', async () => {
    await as(hospitalAdmin).get('/hms-spec/invalid_xyz').expect(404);
  });
});
