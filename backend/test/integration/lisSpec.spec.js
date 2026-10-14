import { mountApp } from '../helpers/appHarness.js';
import {
  LIS_SECTIONS,
  LIS_MODULES_46,
  LIS_ROLE_SPECS,
  getAllLisRoles,
  getLisDashboardSpec,
} from '../../src/config/lisDashboardSpec.js';

const { as } = await mountApp('dashboard', {}, { enforceAuthorize: true });

const labAdmin = { _id: '507f1f77bcf86cd799439050', role: 'lab_admin', hospitalId: '507f1f77bcf86cd799439090' };
const pathologistUser = { _id: '507f1f77bcf86cd799439051', role: 'pathologist', hospitalId: '507f1f77bcf86cd799439090' };
const serologyTech = { _id: '507f1f77bcf86cd799439054', role: 'serology_tech', hospitalId: '507f1f77bcf86cd799439090' };
const molecularTech = { _id: '507f1f77bcf86cd799439055', role: 'molecular_tech', hospitalId: '507f1f77bcf86cd799439090' };

describe('LIS Dashboard Master Specification (Backend Integration)', () => {
  test('defines all 8 core laboratory departments', () => {
    const keys = Object.keys(LIS_SECTIONS);
    expect(keys.length).toBe(8);
    expect(LIS_SECTIONS.BIOCHEMISTRY.name).toBe('Clinical Biochemistry');
    expect(LIS_SECTIONS.HEMATOLOGY.name).toBe('Hematology & Hemostasis');
    expect(LIS_SECTIONS.CLINICAL_PATHOLOGY.name).toBe('Clinical Pathology');
    expect(LIS_SECTIONS.MICROBIOLOGY.name).toBe('Microbiology & Infectious Diseases');
    expect(LIS_SECTIONS.HISTOPATHOLOGY.name).toBe('Histopathology & Surgical Biopsy');
    expect(LIS_SECTIONS.CYTOLOGY.name).toBe('Cytopathology (FNAC & Exfoliative)');
    expect(LIS_SECTIONS.SEROLOGY.name).toBe('Serology & Clinical Immunology');
    expect(LIS_SECTIONS.MOLECULAR.name).toBe('Molecular Diagnostics & RT-PCR');
  });

  test('contains the complete catalog of 46 LIS domain modules', () => {
    expect(LIS_MODULES_46.length).toBe(46);
    expect(LIS_MODULES_46[0].code).toBe('LAB_OVERVIEW');
    expect(LIS_MODULES_46[45].code).toBe('ENTERPRISE_QA');

    const moduleNames = LIS_MODULES_46.map((m) => m.name);
    expect(moduleNames).toContain('Test Catalog & Reference Range Master');
    expect(moduleNames).toContain('Phlebotomy & Sample Collection');
    expect(moduleNames).toContain('Biochemistry Workbench');
    expect(moduleNames).toContain('Serology & Immunoassay Workbench');
    expect(moduleNames).toContain('Molecular Diagnostics & RT-PCR');
    expect(moduleNames).toContain('Pathologist Verification & Signing');
  });

  test('contains 20+ laboratory roles adhering to the 4-part dashboard architecture with tasks and layer', () => {
    const roles = getAllLisRoles();
    expect(roles.length).toBeGreaterThanOrEqual(20);
    expect(roles).toContain('serology_tech');
    expect(roles).toContain('molecular_tech');

    for (const roleKey of roles) {
      const spec = getLisDashboardSpec(roleKey);
      expect(spec).toBeDefined();
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.title).toBeTruthy();
      expect(spec.subtitle).toBeTruthy();
      expect(spec.layer).toBe('Pathology & Laboratory Information System (LIS)');
      expect(Array.isArray(spec.tasks)).toBe(true);
      expect(spec.tasks.length).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(spec.permissions)).toBe(true);
      expect(Array.isArray(spec.sidebarSections)).toBe(true);

      // Part 1: Overview KPIs
      expect(Array.isArray(spec.kpis)).toBe(true);
      expect(spec.kpis.length).toBeGreaterThanOrEqual(4);

      // Part 2: Work Queues
      expect(Array.isArray(spec.workQueues)).toBe(true);
      expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);

      // Part 3: Quick Actions
      expect(Array.isArray(spec.quickActions)).toBe(true);
      expect(spec.quickActions.length).toBeGreaterThanOrEqual(3);

      // Part 4: Alerts & Domain Modules
      expect(Array.isArray(spec.alerts)).toBe(true);
      expect(Array.isArray(spec.domainModules)).toBe(true);
    }
  });

  test('GET /lis-spec returns full 46-module, 8-department, multi-role catalog', async () => {
    const res = await as(labAdmin).get('/lis-spec');
    expect(res.status).toBe(200);
    expect(res.body.sections).toBeDefined();
    expect(res.body.modules).toHaveLength(46);
    expect(res.body.totalModules).toBe(46);
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.specs).toBeDefined();
  });

  test('GET /lis-spec/:roleKey returns specific enriched spec for pathologist', async () => {
    const res = await as(pathologistUser).get('/lis-spec/pathologist');
    expect(res.status).toBe(200);
    expect(res.body.spec.roleKey).toBe('pathologist');
    expect(res.body.spec.layer).toBe('Pathology & Laboratory Information System (LIS)');
    expect(res.body.spec.tasks.length).toBeGreaterThanOrEqual(4);
    expect(res.body.spec.workQueues).toContain('Critical Values Immediate Verification Queue');
  });

  test('GET /lis-spec/:roleKey returns specific enriched spec for serology_tech & molecular_tech', async () => {
    const res1 = await as(serologyTech).get('/lis-spec/serology_tech');
    expect(res1.status).toBe(200);
    expect(res1.body.spec.title).toBe('Serology & Immunology Technician');
    expect(res1.body.spec.workQueues).toContain('Viral Marker Screening');

    const res2 = await as(molecularTech).get('/lis-spec/molecular_tech');
    expect(res2.status).toBe(200);
    expect(res2.body.spec.title).toBe('Molecular Diagnostics Technician');
    expect(res2.body.spec.workQueues).toContain('Thermal Cycler Runs');
  });
});
