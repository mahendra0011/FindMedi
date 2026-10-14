import { mountApp } from '../helpers/appHarness.js';
import {
  LIS_SECTIONS,
  LIS_MODULES_46,
  LIS_ROLE_SPECS,
  getAllLisRoles,
  getLisDashboardSpec,
} from '../../src/config/lisDashboardSpec.js';
import {
  RIS_MODALITIES,
  RIS_MODULES_41,
  RIS_ROLE_SPECS,
  getAllRisRoles,
  getRisDashboardSpec,
} from '../../src/config/risDashboardSpec.js';

const { as } = await mountApp('dashboard', {}, { enforceAuthorize: true });

const labAdmin = { _id: '507f1f77bcf86cd799439050', role: 'lab_admin', hospitalId: '507f1f77bcf86cd799439090' };
const pathologistUser = { _id: '507f1f77bcf86cd799439051', role: 'pathologist', hospitalId: '507f1f77bcf86cd799439090' };
const radiologistUser = { _id: '507f1f77bcf86cd799439052', role: 'radiologist', hospitalId: '507f1f77bcf86cd799439090' };
const radAdmin = { _id: '507f1f77bcf86cd799439053', role: 'radiology_admin', hospitalId: '507f1f77bcf86cd799439090' };

describe('Complete Diagnostic Systems: LIS (Pathology) & RIS (Radiology) Specifications', () => {
  describe('Pathology & Laboratory Management System (LIS)', () => {
    test('defines all 8 core laboratory departments', () => {
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

    test('contains the complete catalog of 46 LIS domain modules', () => {
      expect(LIS_MODULES_46.length).toBe(46);
      expect(LIS_MODULES_46[0].code).toBe('LAB_OVERVIEW');
      expect(LIS_MODULES_46[45].code).toBe('ENTERPRISE_QA');

      const moduleNames = LIS_MODULES_46.map((m) => m.name);
      expect(moduleNames).toContain('Test Catalog & Reference Range Master');
      expect(moduleNames).toContain('Phlebotomy & Sample Collection');
      expect(moduleNames).toContain('Sample Intake, Accession & Rejection');
      expect(moduleNames).toContain('Pathologist Verification & Signing');
      expect(moduleNames).toContain('Biochemistry Workbench');
      expect(moduleNames).toContain('Microbiology & AST Workbench');
      expect(moduleNames).toContain('Histopathology Biopsy Workbench');
      expect(moduleNames).toContain('Critical Value Alert & Communication Log');
    });

    test('contains complete dashboard specifications for all laboratory roles', () => {
      const roles = getAllLisRoles();
      expect(roles.length).toBeGreaterThanOrEqual(18);

      for (const roleKey of roles) {
        const spec = LIS_ROLE_SPECS[roleKey];
        expect(spec).toBeDefined();
        expect(spec.roleKey).toBe(roleKey);
        expect(spec.title).toBeTruthy();
        expect(spec.subtitle).toBeTruthy();
        expect(Array.isArray(spec.permissions)).toBe(true);
        expect(Array.isArray(spec.sidebarSections)).toBe(true);

        expect(Array.isArray(spec.kpis)).toBe(true);
        expect(spec.kpis.length).toBeGreaterThanOrEqual(4);

        expect(Array.isArray(spec.workQueues)).toBe(true);
        expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);

        expect(Array.isArray(spec.quickActions)).toBe(true);
        expect(spec.quickActions.length).toBeGreaterThanOrEqual(3);

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

    test('GET /lis-spec/:roleKey returns specific role dashboard spec', async () => {
      const res = await as(pathologistUser).get('/lis-spec/pathologist');
      expect(res.status).toBe(200);
      expect(res.body.spec.roleKey).toBe('pathologist');
      expect(res.body.spec.title).toBe('Consultant Pathologist');
      expect(res.body.spec.workQueues).toContain('Critical Values Immediate Verification Queue');
    });
  });

  describe('Radiology & Imaging Management System (RIS/PACS)', () => {
    test('defines all 8 core imaging modalities', () => {
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
      expect(moduleNames).toContain('Critical Findings Escalation & Communication');
    });

    test('contains complete dashboard specifications for all radiology roles', () => {
      const roles = getAllRisRoles();
      expect(roles.length).toBeGreaterThanOrEqual(16);

      for (const roleKey of roles) {
        const spec = RIS_ROLE_SPECS[roleKey];
        expect(spec).toBeDefined();
        expect(spec.roleKey).toBe(roleKey);
        expect(spec.title).toBeTruthy();
        expect(spec.subtitle).toBeTruthy();
        expect(Array.isArray(spec.permissions)).toBe(true);
        expect(Array.isArray(spec.sidebarSections)).toBe(true);

        expect(Array.isArray(spec.kpis)).toBe(true);
        expect(spec.kpis.length).toBeGreaterThanOrEqual(4);

        expect(Array.isArray(spec.workQueues)).toBe(true);
        expect(spec.workQueues.length).toBeGreaterThanOrEqual(2);

        expect(Array.isArray(spec.quickActions)).toBe(true);
        expect(spec.quickActions.length).toBeGreaterThanOrEqual(3);

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

    test('GET /ris-spec/:roleKey returns specific role dashboard spec', async () => {
      const res = await as(radiologistUser).get('/ris-spec/radiologist');
      expect(res.status).toBe(200);
      expect(res.body.spec.roleKey).toBe('radiologist');
      expect(res.body.spec.title).toBe('Consultant Radiologist');
      expect(res.body.spec.workQueues).toContain('STAT Emergency & Critical Reporting Queue');
    });
  });

  describe('Unified Diagnostic Lifecycle Workflow Tracker', () => {
    test('GET /diagnostic-workflow returns active LIS & RIS pipeline counts', async () => {
      const res = await as(labAdmin).get('/diagnostic-workflow');
      expect(res.status).toBe(200);
      expect(res.body.pathology).toBeDefined();
      expect(res.body.pathology.pendingCollection).toBeGreaterThanOrEqual(0);
      expect(res.body.pathology.processing).toBeGreaterThanOrEqual(0);
      expect(res.body.pathology.finalized).toBeGreaterThanOrEqual(0);

      expect(res.body.radiology).toBeDefined();
      expect(res.body.radiology.scheduledToday).toBeGreaterThanOrEqual(0);
      expect(res.body.radiology.pacsTransferDone).toBeGreaterThanOrEqual(0);
      expect(res.body.radiology.signedReports).toBeGreaterThanOrEqual(0);
      expect(res.body.updatedAt).toBeTruthy();
    });
  });
});
