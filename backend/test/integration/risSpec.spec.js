import { mountApp } from '../helpers/appHarness.js';
import {
  RIS_MODALITIES,
  RIS_MODULES_41,
  RIS_ROLE_SPECS,
  getAllRisRoles,
  getRisDashboardSpec,
} from '../../src/config/risDashboardSpec.js';

const { as } = await mountApp('dashboard', {}, { enforceAuthorize: true });

const radAdmin = { _id: '507f1f77bcf86cd799439053', role: 'radiology_admin', hospitalId: '507f1f77bcf86cd799439090' };
const radiologistUser = { _id: '507f1f77bcf86cd799439052', role: 'radiologist', hospitalId: '507f1f77bcf86cd799439090' };
const mriTech = { _id: '507f1f77bcf86cd799439056', role: 'mri_technician', hospitalId: '507f1f77bcf86cd799439090' };
const pacsAdmin = { _id: '507f1f77bcf86cd799439057', role: 'pacs_admin', hospitalId: '507f1f77bcf86cd799439090' };

describe('RIS Dashboard Master Specification (Backend Integration)', () => {
  test('defines all 8 core imaging modalities', () => {
    const keys = Object.keys(RIS_MODALITIES);
    expect(keys.length).toBe(8);
    expect(RIS_MODALITIES.MRI.name).toBe('Magnetic Resonance Imaging');
    expect(RIS_MODALITIES.XRAY.name).toBe('Digital Radiography (X-Ray)');
    expect(RIS_MODALITIES.CT_SCAN.name).toBe('Computed Tomography (CT Scan)');
    expect(RIS_MODALITIES.ULTRASOUND.name).toBe('Ultrasound & Sonography');
    expect(RIS_MODALITIES.DOPPLER.name).toBe('Color Doppler & Vascular Imaging');
    expect(RIS_MODALITIES.MAMMOGRAPHY.name).toBe('Digital Mammography & Tomosynthesis');
    expect(RIS_MODALITIES.OPG.name).toBe('Orthopantomogram & Dental CBCT');
    expect(RIS_MODALITIES.FLUOROSCOPY.name).toBe('Fluoroscopy & Dynamic Contrast');
  });

  test('contains the complete catalog of 41 RIS domain modules', () => {
    expect(RIS_MODULES_41.length).toBe(41);
    expect(RIS_MODULES_41[0].code).toBe('RAD_OVERVIEW');
    expect(RIS_MODULES_41[40].code).toBe('ENTERPRISE_RIS');

    const moduleNames = RIS_MODULES_41.map((m) => m.name);
    expect(moduleNames).toContain('Modality & Equipment Configuration Master');
    expect(moduleNames).toContain('Appointment Calendar & Slot Allocation');
    expect(moduleNames).toContain('MRI Unit & Protocol Management');
    expect(moduleNames).toContain('Patient Preparation & Safety Screening');
    expect(moduleNames).toContain('Radiology Technician Acquisition Worklist');
    expect(moduleNames).toContain('Radiologist Diagnostic Workspace');
    expect(moduleNames).toContain('DICOM Archive & PACS Management');
  });

  test('contains 16+ radiology roles adhering to the 4-part dashboard architecture with tasks and layer', () => {
    const roles = getAllRisRoles();
    expect(roles.length).toBeGreaterThanOrEqual(16);

    for (const roleKey of roles) {
      const spec = getRisDashboardSpec(roleKey);
      expect(spec).toBeDefined();
      expect(spec.roleKey).toBe(roleKey);
      expect(spec.title).toBeTruthy();
      expect(spec.subtitle).toBeTruthy();
      expect(spec.layer).toBe('Radiology Information System & PACS (RIS)');
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

  test('GET /ris-spec returns full 41-module, 8-modality, multi-role catalog', async () => {
    const res = await as(radAdmin).get('/ris-spec');
    expect(res.status).toBe(200);
    expect(res.body.modalities).toBeDefined();
    expect(res.body.modules).toHaveLength(41);
    expect(res.body.totalModules).toBe(41);
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.specs).toBeDefined();
  });

  test('GET /ris-spec/:roleKey returns specific enriched spec for radiologist', async () => {
    const res = await as(radiologistUser).get('/ris-spec/radiologist');
    expect(res.status).toBe(200);
    expect(res.body.spec.roleKey).toBe('radiologist');
    expect(res.body.spec.layer).toBe('Radiology Information System & PACS (RIS)');
    expect(res.body.spec.tasks.length).toBeGreaterThanOrEqual(4);
    expect(res.body.spec.workQueues).toContain('STAT Emergency & Critical Reporting Queue');
  });

  test('GET /ris-spec/:roleKey returns specific enriched spec for mri_technician and pacs_admin', async () => {
    const res1 = await as(mriTech).get('/ris-spec/mri_technician');
    expect(res1.status).toBe(200);
    expect(res1.body.spec.title).toBe('MRI Specialist Radiographer');
    expect(res1.body.spec.workQueues).toContain('MRI Modality Worklist (MWL)');

    const res2 = await as(pacsAdmin).get('/ris-spec/pacs_admin');
    expect(res2.status).toBe(200);
    expect(res2.body.spec.title).toBe('PACS & DICOM Systems Administrator');
    expect(res2.body.spec.workQueues).toContain('Orphaned / Unlinked Study Association List');
  });

  test('resolves aliases: cashier, insurance, inventory, quality, accountant, patient', () => {
    expect(getRisDashboardSpec('radiology_cashier')?.title).toBe('Radiology Billing Executive');
    expect(getRisDashboardSpec('radiology_insurance')?.title).toBe('Radiology Billing Executive');
    expect(getRisDashboardSpec('radiology_inventory')?.title).toBe('Biomedical & Equipment Manager');
    expect(getRisDashboardSpec('radiology_quality')?.title).toBe('Radiology Manager / Imaging HOD');
    expect(getRisDashboardSpec('radiology_accountant')?.title).toBe('Radiology Billing Executive');
    expect(getRisDashboardSpec('radiology_patient')?.title).toBe('Radiology Receptionist');
  });
});
