import { mountApp } from '../helpers/appHarness.js';
import {
  CRM_NAV_MODULES,
  HYBRID_ARCHITECTURE_DECISION,
  SUPPLY_PIPELINE_STAGES,
  LOST_REASONS,
  PARTNERSHIP_STAGES,
  LEAD_SCORING_WEIGHTS,
  PROVIDER_HEALTH_WEIGHTS,
  ROLE_BASED_KPIS,
  AUTOMATION_WORKFLOW_RULES,
  CRM_ROLE_PERMISSIONS_MATRIX,
  calculateLeadScore,
  calculateProviderHealthScore,
} from '../../src/config/crmOpsTeam.js';

const { as } = await mountApp('crm', {}, { enforceAuthorize: true });

const superadmin = { _id: '507f1f77bcf86cd799439011', role: 'superadmin' };
const cityManager = { _id: '507f1f77bcf86cd799439013', role: 'city_manager' };
const patient = { _id: '507f1f77bcf86cd799439099', role: 'patient' };

describe('Document 24: Ops CRM & Team Management Spec API', () => {
  test('Patients cannot access ops-team-spec (403)', async () => {
    await as(patient).get('/ops-team-spec').expect(403);
  });

  test('Superadmin receives full Ops CRM & Team specification (200)', async () => {
    const res = await as(superadmin).get('/ops-team-spec').expect(200);

    expect(res.body).toHaveProperty('modules');
    expect(res.body).toHaveProperty('hybridArchitecture');
    expect(res.body).toHaveProperty('supplyStages');
    expect(res.body).toHaveProperty('lostReasons');
    expect(res.body).toHaveProperty('partnershipStages');
    expect(res.body).toHaveProperty('leadScoringWeights');
    expect(res.body).toHaveProperty('providerHealthWeights');
    expect(res.body).toHaveProperty('roleKpis');
    expect(res.body).toHaveProperty('automationRules');
    expect(res.body).toHaveProperty('permissionsMatrix');

    // Exactly 13 Nav modules in CRM group
    expect(res.body.modules).toHaveLength(13);
    const moduleIds = res.body.modules.map((m) => m.id);
    expect(moduleIds).toContain('command_center');
    expect(moduleIds).toContain('supply_pipeline');
    expect(moduleIds).toContain('accounts_360');
    expect(moduleIds).toContain('partnerships');
    expect(moduleIds).toContain('field_ops');
    expect(moduleIds).toContain('tasks_followups');
    expect(moduleIds).toContain('campaigns_camps');
    expect(moduleIds).toContain('team_management');
    expect(moduleIds).toContain('goals_okrs');
    expect(moduleIds).toContain('projects_roadmap');
    expect(moduleIds).toContain('playbooks_knowledge');
    expect(moduleIds).toContain('reports');
    expect(moduleIds).toContain('crm_settings');

    // Hybrid Architecture definition
    expect(res.body.hybridArchitecture.buildInHouse).toHaveLength(6);
    expect(res.body.hybridArchitecture.buyOrIntegrate).toHaveLength(4);
    expect(res.body.hybridArchitecture.externalToolGuardrails).toHaveLength(5);
    expect(res.body.hybridArchitecture.externalToolGuardrails[0]).toContain('Zero PHI');

    // Supply pipeline: exactly 10 stages
    expect(res.body.supplyStages).toHaveLength(10);
    expect(res.body.supplyStages[0].stage).toBe('identified');
    expect(res.body.supplyStages[9].stage).toBe('active');

    // Lost reasons: 9 standard codes
    expect(res.body.lostReasons).toHaveLength(9);
    expect(res.body.lostReasons).toContain('NOT_INTERESTED');
    expect(res.body.lostReasons).toContain('UNVERIFIABLE_DOCUMENTS');

    // Partnership stages: 9 stages
    expect(res.body.partnershipStages).toHaveLength(9);

    // Role-based KPIs: exactly 8 roles with quantity and quality pairs
    expect(res.body.roleKpis).toHaveLength(8);
    for (const rk of res.body.roleKpis) {
      expect(rk.quantityKpis.length).toBeGreaterThan(0);
      expect(rk.qualityKpis.length).toBeGreaterThan(0);
    }

    // Automation rules: 12 rules
    expect(res.body.automationRules).toHaveLength(12);
    expect(res.body.automationRules[0].id).toBe('AUTO-01');
    expect(res.body.automationRules[11].id).toBe('AUTO-12');
  });

  test('City manager can read ops-team-spec (200)', async () => {
    const res = await as(cityManager).get('/ops-team-spec').expect(200);
    expect(res.body.modules).toHaveLength(13);
  });

  test('calculateLeadScore accurately computes commercial priority (0-100)', () => {
    // 1. Max score: all positive signals
    const maxScore = calculateLeadScore({
      isPriorityCategory: true, // 25
      estDailyFootfall: 40, // 20
      hasDirectDecisionMakerAccess: true, // 15
      isDigitallyReady: true, // 10
      isCloseToCluster: true, // 10
      hasFastResponse: true, // 10
      hasDocsReady: true, // 10
    });
    expect(maxScore).toBe(100);

    // 2. Intermediate score: medium footfall, partial signals
    const midScore = calculateLeadScore({
      isPriorityCategory: true, // 25
      estDailyFootfall: 20, // 12
      hasDirectDecisionMakerAccess: false,
      isDigitallyReady: true, // 10
      isCloseToCluster: true, // 10
      hasFastResponse: false,
      hasDocsReady: true, // 10
    });
    expect(midScore).toBe(67);

    // 3. Zero score
    const zeroScore = calculateLeadScore({});
    expect(zeroScore).toBe(0);
  });

  test('calculateProviderHealthScore accurately computes health band and risk status', () => {
    // 1. Healthy provider: high bookings growth, 4.8 rating, fast response, low cancellation
    const healthy = calculateProviderHealthScore({
      monthlyBookings: 60,
      prevMonthlyBookings: 50,
      averageRating: 4.8,
      avgResponseMinutes: 10,
      cancellationRatePercent: 1.5,
      profileCompletenessPercent: 100,
      daysUntilDocExpiry: 180,
      openDisputesCount: 0,
    });
    expect(healthy.score).toBeGreaterThanOrEqual(75);
    expect(healthy.healthBand).toBe('healthy');
    expect(healthy.isHealthy).toBe(true);
    expect(healthy.isAtRisk).toBe(false);

    // 2. Watch band provider: declining bookings, moderate rating
    const watch = calculateProviderHealthScore({
      monthlyBookings: 25,
      prevMonthlyBookings: 40,
      averageRating: 4.0,
      avgResponseMinutes: 45,
      cancellationRatePercent: 6,
      profileCompletenessPercent: 75,
      daysUntilDocExpiry: 45,
      openDisputesCount: 1,
    });
    expect(watch.score).toBeGreaterThanOrEqual(50);
    expect(watch.score).toBeLessThan(75);
    expect(watch.healthBand).toBe('watch');

    // 3. At-risk provider: zero bookings, low rating, high cancellation, expiring doc
    const atRisk = calculateProviderHealthScore({
      monthlyBookings: 0,
      prevMonthlyBookings: 20,
      averageRating: 2.8,
      avgResponseMinutes: 150,
      cancellationRatePercent: 18,
      profileCompletenessPercent: 50,
      daysUntilDocExpiry: 8,
      openDisputesCount: 3,
    });
    expect(atRisk.score).toBeLessThan(50);
    expect(atRisk.healthBand).toBe('at_risk');
    expect(atRisk.isAtRisk).toBe(true);
  });
});
