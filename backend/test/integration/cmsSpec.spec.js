import { mountApp } from '../helpers/appHarness.js';
import {
  CMS_CATEGORIES,
  CMS_MODULES_70,
  CMS_ROLE_SPECS,
  getAllCmsRoles,
  getAllCmsModules,
  getCmsDashboardSpec,
} from '../../src/config/cmsDashboardSpec.js';

const { as } = await mountApp('dashboard', {}, { enforceAuthorize: true });

const clinicAdmin = { _id: '507f1f77bcf86cd799439011', role: 'clinic_admin', hospitalId: '507f1f77bcf86cd799439090' };
const clinicDoctor = { _id: '507f1f77bcf86cd799439012', role: 'clinic_doctor', hospitalId: '507f1f77bcf86cd799439090' };

describe('CMS Dashboard Blueprint Master Specification (Backend)', () => {
  test('defines all 12 core CMS functional categories', () => {
    const categories = Object.values(CMS_CATEGORIES);
    expect(categories.length).toBe(12);
    expect(categories.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  test('contains the complete catalog of 70 CMS modules', () => {
    const modules = getAllCmsModules();
    expect(modules.length).toBe(70);
    expect(CMS_MODULES_70.length).toBe(70);

    const moduleNames = modules.map((m) => m.name);
    expect(moduleNames).toContain('Patient Registration');
    expect(moduleNames).toContain('Token / Queue Management');
    expect(moduleNames).toContain('Vitals Management');
    expect(moduleNames).toContain('OPD / Consultation Management');
    expect(moduleNames).toContain('Prescription Management');
    expect(moduleNames).toContain('Lab Management');
    expect(moduleNames).toContain('Pharmacy Management');
    expect(moduleNames).toContain('Billing Management');
    expect(moduleNames).toContain('Cashier Management');
    expect(moduleNames).toContain('Follow-up Management');
    expect(moduleNames).toContain('Patient Journey (Start to End)');
  });

  test('contains 20+ clinic roles adhering to the 4-part dashboard architecture', () => {
    const roles = getAllCmsRoles();
    expect(roles.length).toBeGreaterThanOrEqual(20);

    for (const roleKey of roles) {
      const spec = CMS_ROLE_SPECS[roleKey];
      expect(spec).toBeDefined();
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.title).toBeTruthy();
      expect(spec.subtitle).toBeTruthy();
      expect(Array.isArray(spec.permissions)).toBe(true);
      expect(Array.isArray(spec.sidebarSections)).toBe(true);

      // Part 1: Overview KPIs
      expect(Array.isArray(spec.kpis)).toBe(true);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(4);
      spec.kpis.forEach((k) => {
        expect(k.label).toBeTruthy();
        expect(k.value).toBeDefined();
      });

      // Part 2: Work Queue
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

  test('resolves aliases correctly via getCmsDashboardSpec', () => {
    expect(getCmsDashboardSpec('doctor')?.roleKey).toBe('clinic_doctor');
    expect(getCmsDashboardSpec('receptionist')?.roleKey).toBe('clinic_receptionist');
    expect(getCmsDashboardSpec('nurse')?.roleKey).toBe('clinic_nurse');
    expect(getCmsDashboardSpec('cashier')?.roleKey).toBe('clinic_cashier');
    expect(getCmsDashboardSpec('admin')?.roleKey).toBe('clinic_admin');
    expect(getCmsDashboardSpec('unknown_xyz')).toBeNull();
  });

  test('GET /api/dashboard/cms-spec returns 200 with categories, 70 modules, roles, and specs', async () => {
    const res = await as(clinicAdmin).get('/cms-spec');
    expect(res.status).toBe(200);
    expect(res.body.totalModules).toBe(70);
    expect(res.body.modules.length).toBe(70);
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.specs.clinic_doctor).toBeDefined();
  });

  test('GET /api/dashboard/cms-spec/:roleKey returns specific role spec', async () => {
    const res = await as(clinicDoctor).get('/cms-spec/clinic_doctor');
    expect(res.status).toBe(200);
    expect(res.body.spec.title).toContain('Doctor Clinical Workstation');
    expect(res.body.spec.kpis.length).toBeGreaterThanOrEqual(4);
  });

  test('GET /api/dashboard/cms-workflow returns 10-step patient journey tracker', async () => {
    const res = await as(clinicAdmin).get('/cms-workflow');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.workflowSteps)).toBe(true);
    expect(res.body.workflowSteps.length).toBe(8);
    expect(res.body.workflowSteps[0].name).toBe('Patient Registration');
  });
});
