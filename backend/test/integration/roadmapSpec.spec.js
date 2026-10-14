import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import {
  ROADMAP_PHASES,
  DEFINITION_OF_DONE,
  INITIALLY_EXCLUDED_FEATURES,
  TOP_RISKS_REGISTER,
} from '../../src/config/roadmap.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const platformAdmin = { _id: '507f1f77bcf86cd799439012', role: 'platform_admin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 14: Implementation Roadmap & Governance Spec API', () => {
  test('Patients cannot read roadmap-spec (403)', async () => {
    await as(patient).get('/roadmap-spec').expect(403);
  });

  test('Superadmin receives all Document 14 phases with exit gates (200)', async () => {
    const res = await as(superadmin).get('/roadmap-spec').expect(200);

    expect(res.body).toHaveProperty('phases');
    expect(res.body).toHaveProperty('definitionOfDone');
    expect(res.body).toHaveProperty('initiallyExcluded');
    expect(res.body).toHaveProperty('topRisks');

    // Verify canonical phase codes: R-1 through R4
    const phaseCodes = res.body.phases.map((p) => p.code);
    expect(phaseCodes).toEqual(['R-1', 'R0', 'R1', 'R2', 'R3', 'R4']);

    // Verify each phase defines a mandatory exit gate
    res.body.phases.forEach((phase) => {
      expect(phase.exitGate).toBeTruthy();
      expect(phase.outcome).toBeTruthy();
      expect(phase.duration).toBeTruthy();
      expect(phase.tasks.length).toBeGreaterThan(0);
    });

    // Check specific critical gates
    const rMinus1 = res.body.phases.find((p) => p.code === 'R-1');
    expect(rMinus1.exitGate).toContain('Security P0 completed');

    const r0 = res.body.phases.find((p) => p.code === 'R0');
    expect(r0.exitGate).toContain('Dentist');

    const r1 = res.body.phases.find((p) => p.code === 'R1');
    expect(r1.exitGate).toContain('95%');

    const r4 = res.body.phases.find((p) => p.code === 'R4');
    expect(r4.exitGate).toContain('pentest');
  });

  test('City manager can also access roadmap-spec (crm:read)', async () => {
    const res = await as(cityManager).get('/roadmap-spec').expect(200);
    expect(res.body.phases).toHaveLength(6);
  });

  test('returns 8 statutory and engineering criteria in definitionOfDone', async () => {
    const res = await as(platformAdmin).get('/roadmap-spec').expect(200);
    expect(res.body.definitionOfDone).toHaveLength(8);

    const items = res.body.definitionOfDone.map((d) => d.item);
    expect(items).toContain('Specification Review & Accessibility');
    expect(items).toContain('Authorization & Data Isolation');
    expect(items).toContain('Input Validation & PHI Shielding');
    expect(items).toContain('Internationalization (i18n)');
    expect(items).toContain('Automated Test Coverage');
    expect(items).toContain('Rollout Safety & Telemetry');
    expect(items).toContain('Documentation & Playbooks');
    expect(items).toContain('Security & Clinical Sign-off');
  });

  test('lists initial scope exclusions to prevent premature scope creep', async () => {
    const res = await as(superadmin).get('/roadmap-spec').expect(200);
    expect(res.body.initiallyExcluded.length).toBeGreaterThanOrEqual(5);

    const joined = res.body.initiallyExcluded.join(' ');
    expect(joined).toContain('24 role dashboards');
    expect(joined).toContain('native mobile apps');
    expect(joined).toContain('LiveKit');
    expect(joined).toContain('R4');
  });

  test('in-memory module exports match schema definitions', () => {
    expect(ROADMAP_PHASES).toHaveLength(6);
    expect(DEFINITION_OF_DONE).toHaveLength(8);
    expect(INITIALLY_EXCLUDED_FEATURES.length).toBeGreaterThan(0);
    expect(TOP_RISKS_REGISTER.length).toBeGreaterThan(0);
  });
});
