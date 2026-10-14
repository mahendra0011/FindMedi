import { jest as jestApi } from '@jest/globals';
import { mountApp } from '../helpers/appHarness.js';
import {
  TEST_PYRAMID,
  TEST_ENVIRONMENTS,
  CRITICAL_E2E_JOURNEYS,
  FEATURE_TEST_MATRICES,
  NON_FUNCTIONAL_TRACKS,
  CLINICAL_SAFETY_QA,
  RELEASE_GATES,
  UAT_PLAN,
  DEFECT_SEVERITIES,
  QA_RELEASE_CHECKLIST,
  validateReleaseReadiness,
  checkPerformanceBenchmark,
  getDefectSla,
  getRedFlagEscalation,
} from '../../src/config/qaTestPlan.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 18: QA & Test Plan (incl. UAT) Spec API', () => {
  test('Patients cannot access qa-test-plan-spec (403)', async () => {
    await as(patient).get('/qa-test-plan-spec').expect(403);
  });

  test('Superadmin receives full QA test plan specification (200)', async () => {
    const res = await as(superadmin).get('/qa-test-plan-spec').expect(200);

    expect(res.body).toHaveProperty('testPyramid');
    expect(res.body).toHaveProperty('testEnvironments');
    expect(res.body).toHaveProperty('criticalE2eJourneys');
    expect(res.body).toHaveProperty('featureMatrices');
    expect(res.body).toHaveProperty('nonFunctionalTracks');
    expect(res.body).toHaveProperty('clinicalSafetyQa');
    expect(res.body).toHaveProperty('releaseGates');
    expect(res.body).toHaveProperty('uatPlan');
    expect(res.body).toHaveProperty('defectSeverities');
    expect(res.body).toHaveProperty('qaChecklist');

    // Test pyramid layer targets sum to 100%
    const pyramid = res.body.testPyramid;
    const totalShare = Object.values(pyramid).reduce((acc, curr) => acc + curr.targetSharePct, 0);
    expect(totalShare).toBe(100);
    expect(pyramid.unit.targetSharePct).toBe(50);
    expect(pyramid.integration.targetSharePct).toBe(25);
    expect(pyramid.contractAndAuthz.targetSharePct).toBe(15);
    expect(pyramid.e2e.targetSharePct).toBe(10);

    // 14 Critical E2E Journeys present
    expect(res.body.criticalE2eJourneys).toHaveLength(14);
    const ids = res.body.criticalE2eJourneys.map((j) => j.id);
    expect(ids).toContain('E2E-01');
    expect(ids).toContain('E2E-02');
    expect(ids).toContain('E2E-11');
    expect(ids).toContain('E2E-14');

    // Performance benchmarks
    const benchmarks = res.body.nonFunctionalTracks.performance.benchmarks;
    expect(benchmarks.length).toBeGreaterThanOrEqual(4);
    const searchBm = benchmarks.find((b) => b.metric.includes('Search'));
    expect(searchBm.targetP95Ms).toBeLessThanOrEqual(500);

    // Clinical Safety rules & Red-flag triggers
    expect(res.body.clinicalSafetyQa.redFlagKeywords.length).toBeGreaterThanOrEqual(4);
    const redFlagSymptoms = res.body.clinicalSafetyQa.redFlagKeywords.map((r) => r.symptom.toLowerCase());
    expect(redFlagSymptoms.some((s) => s.includes('chest pain'))).toBe(true);
    expect(redFlagSymptoms.some((s) => s.includes('stroke'))).toBe(true);
    expect(redFlagSymptoms.some((s) => s.includes('suicid'))).toBe(true);

    // UAT Plan scripts
    expect(res.body.uatPlan.scripts.length).toBeGreaterThanOrEqual(9);
    expect(res.body.uatPlan.exitCriteria.length).toBeGreaterThanOrEqual(4);

    // Defect Severities (Sev-1 to Sev-4)
    expect(res.body.defectSeverities).toHaveProperty('SEV_1');
    expect(res.body.defectSeverities).toHaveProperty('SEV_2');
    expect(res.body.defectSeverities).toHaveProperty('SEV_3');
    expect(res.body.defectSeverities).toHaveProperty('SEV_4');
  });

  test('City manager has crm:read and can access qa-test-plan-spec (200)', async () => {
    const res = await as(cityManager).get('/qa-test-plan-spec').expect(200);
    expect(res.body.criticalE2eJourneys.length).toBe(14);
  });

  describe('QA & Release Helper Functions', () => {
    test('validateReleaseReadiness blocks release when Sev-1 bugs exist', () => {
      const result = validateReleaseReadiness({ openSev1Count: 1 });
      expect(result.canRelease).toBe(false);
      expect(result.blockers.some((b) => b.includes('Sev-1'))).toBe(true);
    });

    test('validateReleaseReadiness blocks release when Critical E2E journeys fail', () => {
      const result = validateReleaseReadiness({ criticalE2ePassing: false });
      expect(result.canRelease).toBe(false);
      expect(result.blockers.some((b) => b.includes('Critical E2E'))).toBe(true);
    });

    test('validateReleaseReadiness blocks release when Clinical Signoff is missing', () => {
      const result = validateReleaseReadiness({ clinicalAdvisorSignoff: false });
      expect(result.canRelease).toBe(false);
      expect(result.blockers.some((b) => b.includes('Clinical Safety Advisor'))).toBe(true);
    });

    test('validateReleaseReadiness approves clean candidate', () => {
      const result = validateReleaseReadiness({
        openSev1Count: 0,
        openSev2Count: 0,
        criticalE2ePassing: true,
        clinicalAdvisorSignoff: true,
      });
      expect(result.canRelease).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    test('checkPerformanceBenchmark correctly evaluates latencies', () => {
      const fastSearch = checkPerformanceBenchmark('Search API Latency', 350);
      expect(fastSearch.passed).toBe(true);

      const slowSearch = checkPerformanceBenchmark('Search API Latency', 650);
      expect(slowSearch.passed).toBe(false);
    });

    test('getDefectSla returns correct SLAs for Sev-1 and Sev-2', () => {
      const sev1 = getDefectSla('SEV_1');
      expect(sev1.sla).toContain('Immediate hotfix');

      const sev2 = getDefectSla('sev-2');
      expect(sev2.sla).toContain('48 hours');
    });

    test('getRedFlagEscalation detects acute medical emergencies and halts bot', () => {
      const chestPain = getRedFlagEscalation('I have acute chest pain and dizziness');
      expect(chestPain.isEmergency).toBe(true);
      expect(chestPain.urgency).toBe('CRITICAL');
      expect(chestPain.action).toBe('HALT_BOT_AND_ESCALATE_EMERGENCY');

      const routine = getRedFlagEscalation('Need to book routine dental cleaning');
      expect(routine.isEmergency).toBe(false);
      expect(routine.action).toBe('PROCEED_STANDARD_TRIAGE');
    });
  });
});
