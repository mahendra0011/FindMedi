import { mountApp } from '../helpers/appHarness.js';
import {
  INFRA_STAGES,
  ENV_TOPOLOGY,
  CI_CD_PIPELINE,
  SLO_DEFINITIONS,
  ALERTING_RULES,
  COST_BUCKETS,
  DISASTER_RECOVERY_TIERS,
  SRE_RUNBOOKS,
  HARDENING_GUARDRAILS,
  calculateCostPerThousandBookings,
  evaluateSloCompliance,
  getAlertRunbookGuide,
} from '../../src/config/devOpsScaling.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 19: DevOps, Scaling & Cost Plan Spec API', () => {
  test('Patients cannot access devops-scaling-spec (403)', async () => {
    await as(patient).get('/devops-scaling-spec').expect(403);
  });

  test('Superadmin receives full DevOps scaling & cost specification (200)', async () => {
    const res = await as(superadmin).get('/devops-scaling-spec').expect(200);

    expect(res.body).toHaveProperty('infraStages');
    expect(res.body).toHaveProperty('envTopology');
    expect(res.body).toHaveProperty('ciCdPipeline');
    expect(res.body).toHaveProperty('sloDefinitions');
    expect(res.body).toHaveProperty('alertingRules');
    expect(res.body).toHaveProperty('costBuckets');
    expect(res.body).toHaveProperty('disasterRecoveryTiers');
    expect(res.body).toHaveProperty('sreRunbooks');
    expect(res.body).toHaveProperty('hardeningGuardrails');

    // S0 Pilot stack checks
    expect(res.body.infraStages.S0_PILOT.skipForNow).toContain('Full Kubernetes k8s cluster (avoid unnecessary ops complexity until multi-city scale)');
    expect(res.body.infraStages.S0_PILOT.skipForNow).toContain('Self-hosted Apache Kafka (use BullMQ over Redis instead)');

    // 7 SRE Runbooks present
    expect(res.body.sreRunbooks).toHaveLength(7);
    const runbookIds = res.body.sreRunbooks.map((r) => r.id);
    expect(runbookIds).toContain('RB-01');
    expect(runbookIds).toContain('RB-06');
    expect(runbookIds).toContain('RB-07');

    // SLO targets
    expect(res.body.sloDefinitions.apiAvailability.targetPct).toBe(99.9);
    expect(res.body.sloDefinitions.bookingSuccess.targetPct).toBe(98.0);
    expect(res.body.sloDefinitions.sosAvailability.targetPct).toBe(99.95);
  });

  test('City manager with crm:read can access devops-scaling-spec (200)', async () => {
    await as(cityManager).get('/devops-scaling-spec').expect(200);
  });

  describe('DevOps & Cost Helper Functions', () => {
    test('calculateCostPerThousandBookings computes accurate unit metrics', () => {
      const sampleCosts = {
        compute: 15000,
        database: 12000,
        search: 8000,
        cacheAndQueue: 4000,
        objectStorage: 5000,
        messaging: 8000,
        video: 6000,
        maps: 3000,
        payments: 4000,
        verification: 3000,
        observability: 3000,
        operations: 25000,
      };

      const result = calculateCostPerThousandBookings(sampleCosts, 1000);
      expect(result.bookingCount).toBe(1000);
      expect(result.totalMonthlyCost).toBe(96000);
      expect(result.costPerBooking).toBe(96.0);
      expect(result.costPerThousandBookings).toBe(96000.0);
      expect(result.breakdown).toHaveLength(12);
    });

    test('calculateCostPerThousandBookings gracefully handles 0 bookings without divide-by-zero', () => {
      const result = calculateCostPerThousandBookings({ compute: 10000 }, 0);
      expect(result.totalMonthlyCost).toBe(10000);
      expect(result.costPerBooking).toBe(0);
      expect(result.costPerThousandBookings).toBe(0);
    });

    test('evaluateSloCompliance correctly flags compliant vs breached metrics', () => {
      // API Availability target is >= 99.9%
      const compliantApi = evaluateSloCompliance('apiAvailability', 99.95);
      expect(compliantApi.compliant).toBe(true);
      expect(compliantApi.found).toBe(true);

      const breachedApi = evaluateSloCompliance('apiAvailability', 99.5);
      expect(breachedApi.compliant).toBe(false);

      // Search Latency target is <= 500ms
      const compliantSearch = evaluateSloCompliance('searchLatency', 420);
      expect(compliantSearch.compliant).toBe(true);

      const breachedSearch = evaluateSloCompliance('searchLatency', 650);
      expect(breachedSearch.compliant).toBe(false);

      // Unknown SLO
      const unknown = evaluateSloCompliance('nonExistentMetric', 100);
      expect(unknown.found).toBe(false);
      expect(unknown.compliant).toBe(false);
    });

    test('getAlertRunbookGuide matches PAGE and TICKET alerts to their runbooks', () => {
      const pageGuide = getAlertRunbookGuide('PAGE-01');
      expect(pageGuide.found).toBe(true);
      expect(pageGuide.type).toBe('PAGE');
      expect(pageGuide.runbook).toBeDefined();

      const ticketGuide = getAlertRunbookGuide('TCK-01');
      expect(ticketGuide.found).toBe(true);
      expect(ticketGuide.type).toBe('TICKET');
      expect(ticketGuide.runbook.id).toBe('RB-02');

      const missing = getAlertRunbookGuide('UNKNOWN-999');
      expect(missing.found).toBe(false);
    });
  });
});
